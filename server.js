import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Active MySQL Connection Pool State
let activeMySQLPool = null;
let activeMySQLConfig = null;

// Destructive command blocker for MySQL
const DANGEROUS_MYSQL = /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|UPDATE|INSERT|REPLACE|GRANT|REVOKE)\b/i;

/**
 * Test MySQL connection without saving
 */
app.post('/api/mysql/test', async (req, res) => {
  const { host = 'localhost', port = 3306, user = 'root', password = '', database = '' } = req.body;

  let connection = null;
  try {
    connection = await mysql.createConnection({
      host: host.trim(),
      port: Number(port) || 3306,
      user: user.trim(),
      password: String(password),
      database: database ? database.trim() : undefined,
      connectTimeout: 5000
    });

    const [rows] = await connection.query('SELECT VERSION() AS version');
    const version = rows[0]?.version || 'Unknown';
    await connection.end();

    res.json({
      success: true,
      message: `Successfully reached MySQL server (v${version})!`,
      version
    });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Connect to live MySQL database
 */
app.post('/api/mysql/connect', async (req, res) => {
  const { host = 'localhost', port = 3306, user = 'root', password = '', database } = req.body;

  if (!database) {
    return res.status(400).json({ success: false, error: 'Database name is required.' });
  }

  try {
    if (activeMySQLPool) {
      await activeMySQLPool.end();
      activeMySQLPool = null;
    }

    activeMySQLPool = mysql.createPool({
      host: host.trim(),
      port: Number(port) || 3306,
      user: user.trim(),
      password: String(password),
      database: database.trim(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000
    });

    // Test query
    const [tableRows] = await activeMySQLPool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, 
      [database.trim()]
    );

    activeMySQLConfig = {
      host: host.trim(),
      port: Number(port) || 3306,
      user: user.trim(),
      database: database.trim(),
      tableCount: tableRows.length,
      connectedAt: new Date().toISOString()
    };

    console.log(`[MySQL] Connected to database '${database}' on ${host}:${port} (${tableRows.length} tables found).`);

    res.json({
      success: true,
      message: `Connected to live MySQL database '${database}'!`,
      config: activeMySQLConfig,
      tables: tableRows.map(r => r.table_name || r.TABLE_NAME)
    });
  } catch (err) {
    activeMySQLPool = null;
    activeMySQLConfig = null;
    res.status(400).json({
      success: false,
      error: `Failed to connect to MySQL: ${err.message}`
    });
  }
});

/**
 * Disconnect from live MySQL
 */
app.post('/api/mysql/disconnect', async (req, res) => {
  if (activeMySQLPool) {
    try {
      await activeMySQLPool.end();
    } catch (e) {}
    activeMySQLPool = null;
    activeMySQLConfig = null;
  }
  res.json({ success: true, message: 'Disconnected from MySQL. Reverted to Sample Database.' });
});

/**
 * MySQL Status Check
 */
app.get('/api/mysql/status', (req, res) => {
  res.json({
    connected: Boolean(activeMySQLPool),
    config: activeMySQLConfig
  });
});

/**
 * Introspect active MySQL schema
 */
app.get('/api/mysql/schema', async (req, res) => {
  if (!activeMySQLPool || !activeMySQLConfig) {
    return res.status(400).json({ error: 'No active MySQL connection.' });
  }

  try {
    const dbName = activeMySQLConfig.database;

    // Get all tables
    const [tablesRes] = await activeMySQLPool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name ASC`,
      [dbName]
    );

    const tables = [];
    for (const row of tablesRes) {
      const tableName = row.table_name || row.TABLE_NAME;

      // Get columns
      const [colRes] = await activeMySQLPool.query(
        `SELECT column_name, data_type, column_key, is_nullable, column_default
         FROM information_schema.columns 
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ordinal_position ASC`,
        [dbName, tableName]
      );

      // Get row count
      let rowCount = 0;
      try {
        const [cntRes] = await activeMySQLPool.query(`SELECT COUNT(*) AS count FROM \`${tableName}\``);
        rowCount = cntRes[0]?.count || 0;
      } catch (e) {}

      tables.push({
        table: tableName,
        rowCount,
        columns: colRes.map(c => ({
          name: c.column_name || c.COLUMN_NAME,
          type: (c.data_type || c.DATA_TYPE || 'TEXT').toUpperCase(),
          primaryKey: (c.column_key || c.COLUMN_KEY) === 'PRI',
          notnull: (c.is_nullable || c.IS_NULLABLE) === 'NO'
        }))
      });
    }

    res.json({
      dialect: 'mysql',
      database: dbName,
      tables
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Execute query on active MySQL database
 */
app.post('/api/mysql/query', async (req, res) => {
  const { sql } = req.body;

  if (!activeMySQLPool) {
    return res.status(400).json({ error: 'No active MySQL connection.' });
  }
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required.' });
  }

  // Safety check
  if (DANGEROUS_MYSQL.test(sql)) {
    return res.status(403).json({
      success: false,
      error: 'Read-only protection blocked modifying statement on live MySQL database.'
    });
  }

  const startTime = performance.now();
  try {
    let cleanSql = sql.trim();
    if (!cleanSql.endsWith(';')) cleanSql += ';';

    const [rows, fields] = await activeMySQLPool.query(cleanSql);
    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));

    const columns = fields ? fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []);

    res.json({
      success: true,
      columns,
      rows: Array.isArray(rows) ? rows.slice(0, 500) : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTimeMs,
      dialect: 'mysql'
    });
  } catch (err) {
    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    res.status(400).json({
      success: false,
      error: err.message,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs
    });
  }
});

// Fallback to index.html for SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`⚡ SQLGenX Running at http://localhost:${PORT}`);
  console.log(`   - Frontend: Modern Dark Cyberpunk UI with Outfit/JetBrains fonts`);
  console.log(`   - Live MySQL: Ready on /api/mysql/*`);
  console.log(`   - Sample DB: In-Browser SQLite WebAssembly (Offline Sandbox)`);
  console.log(`======================================================\n`);
});
