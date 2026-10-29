/**
 * SQLGenX Database Controller
 * Dual Mode:
 *  1. Sample Enterprise Database (In-Browser SQLite WASM - Offline Sandbox)
 *  2. Realtime MySQL Database (Live remote/local server connection)
 */

/**
 * Helper to resolve backend API endpoints whether running via Node server (port 3000)
 * or via VS Code Live Server (port 5500) or any other origin.
 */
function getApiEndpoint(path) {
  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    const protocol = window.location.protocol;
    if ((port && port !== '3000') || protocol === 'file:') {
      const hostname = (window.location.hostname && window.location.hostname !== 'localhost') 
        ? window.location.hostname 
        : '127.0.0.1';
      return `http://${hostname}:3000${path}`;
    }
  }
  return path;
}

async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text || text.trim() === '') {
      return {
        success: false,
        error: `Server responded with status ${res.status}. Make sure 'node server.js' is running on port 3000.`
      };
    }
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      return {
        success: false,
        error: `Invalid response from backend (${res.status}): Make sure 'node server.js' is running on port 3000.`
      };
    }
  } catch (netErr) {
    return {
      success: false,
      error: `Could not connect to backend at ${url}. Please verify 'node server.js' is running on port 3000 (${netErr.message}).`
    };
  }
}

export class DatabaseEngine {
  constructor() {
    this.mode = 'sample'; // 'sample' or 'mysql'
    this.sqliteDb = null;
    this.SQL = null;
    this.isReady = false;
    this.mysqlConfig = null;
    this.mysqlTables = [];
    this.mysqlSchema = null;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const initSqlJs = window.initSqlJs;
        if (!initSqlJs) {
          throw new Error('sql.js WebAssembly library is not loaded.');
        }

        this.SQL = await initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });

        this.sqliteDb = new this.SQL.Database();
        this._seedSampleEnterpriseDatabase();
        this.isReady = true;
        console.log('SQLGenX: In-browser Sample Database (SQLite WASM) ready.');
        return true;
      } catch (err) {
        console.error('Failed to init SQLite WASM:', err);
        throw err;
      }
    })();

    return this.initPromise;
  }

  /* -------------------------------------------------------------------
   * Sample Enterprise Database (Rich E-Commerce with 1,900+ Rows)
   * ------------------------------------------------------------------- */
  _seedSampleEnterpriseDatabase() {
    if (!this.sqliteDb) return;

    this.sqliteDb.run(`
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS order_items;
      DROP TABLE IF EXISTS orders;
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS customers;

      CREATE TABLE categories (
        category_id INTEGER PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT
      );

      CREATE TABLE products (
        product_id INTEGER PRIMARY KEY,
        category_id INTEGER NOT NULL,
        name VARCHAR(150) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        cost DECIMAL(10, 2) NOT NULL,
        stock_quantity INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
      );

      CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        country VARCHAR(100) NOT NULL,
        signup_date DATE NOT NULL,
        loyalty_tier VARCHAR(50) DEFAULT 'Bronze'
      );

      CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        order_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        shipping_fee DECIMAL(10, 2) DEFAULT 0.0,
        discount_amount DECIMAL(10, 2) DEFAULT 0.0,
        FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
      );

      CREATE TABLE order_items (
        item_id INTEGER PRIMARY KEY,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (order_id),
        FOREIGN KEY (product_id) REFERENCES products (product_id)
      );

      CREATE TABLE payments (
        payment_id INTEGER PRIMARY KEY,
        order_id INTEGER NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
      );
    `);

    // Categories
    const categories = [
      [1, 'Electronics', 'Smartphones, noise-cancelling audio, personal computing'],
      [2, 'Fashion & Apparel', 'Designer menswear, women luxury, performance activewear'],
      [3, 'Home & Kitchen', 'Smart appliances, premium cookware, barista espresso'],
      [4, 'Sports & Fitness', 'Gym equipment, trail running, athletic recovery'],
      [5, 'Books & Media', 'Data architecture, AI engineering, productivity literature'],
      [6, 'Health & Wellness', 'Organic skincare, nootropics, sonic dental hygiene']
    ];
    const catStmt = this.sqliteDb.prepare("INSERT INTO categories VALUES (?, ?, ?)");
    categories.forEach(c => catStmt.run(c));
    catStmt.free();

    // Products
    const products = [
      [1, 1, 'ProNoise Wireless ANC Headphones', 249.99, 120.00, 85, 'Active'],
      [2, 1, 'UltraSlim 4K OLED Monitor 27in', 379.50, 210.00, 42, 'Active'],
      [3, 1, 'ThunderBolt 8-in-1 Hub Pro', 69.99, 28.00, 150, 'Active'],
      [4, 1, 'AeroSound Wireless Earbuds v2', 129.00, 55.00, 210, 'Active'],
      [5, 1, 'HyperCharge 65W GaN Charger', 45.00, 18.00, 320, 'Active'],
      [6, 1, 'Custom Mechanical Keyboard RGB', 119.99, 52.00, 95, 'Active'],
      [7, 1, 'ErgoGlide Wireless Mouse', 59.95, 24.00, 140, 'Active'],
      [8, 2, 'Tailored Italian Oxford Shirt', 49.99, 18.00, 180, 'Active'],
      [9, 2, 'All-Weather Waterproof Parka', 139.00, 58.00, 65, 'Active'],
      [10, 2, 'Raw Selvedge Japanese Denim', 89.50, 35.00, 110, 'Active'],
      [11, 2, 'Merino Wool Crewneck Sweater', 95.00, 38.00, 80, 'Active'],
      [12, 2, 'Breathable Speed Running Shorts', 34.99, 12.00, 240, 'Active'],
      [13, 3, 'Artisan Gooseneck Kettle', 79.90, 32.00, 75, 'Active'],
      [14, 3, 'Enamelled Cast Iron Dutch Oven', 109.99, 45.00, 55, 'Active'],
      [15, 3, 'Smart True HEPA Air Purifier', 189.00, 85.00, 40, 'Active'],
      [16, 3, 'Damascus Steel Chef Knife 8in', 65.00, 22.00, 130, 'Active'],
      [17, 3, 'Dual-Zone Digital Air Fryer XL', 149.95, 68.00, 60, 'Active'],
      [18, 4, 'ProTrail Carbon Running Shoes', 145.00, 62.00, 90, 'Active'],
      [19, 4, 'High-Density Studio Yoga Mat', 42.50, 15.00, 160, 'Active'],
      [20, 4, 'Adjustable Dumbbell Pair 50lb', 299.00, 140.00, 35, 'Active'],
      [21, 5, 'Designing Data-Intensive Apps', 48.00, 24.00, 120, 'Active'],
      [22, 5, 'Atomic Habits Hardcover Edition', 27.00, 12.00, 310, 'Active'],
      [23, 5, 'Clean Architecture by Martin', 42.50, 20.00, 95, 'Active'],
      [24, 6, 'Hyaluronic Botanical Face Serum', 38.00, 11.00, 220, 'Active'],
      [25, 6, 'Sonic Pulse Smart Toothbrush', 69.95, 26.00, 110, 'Active']
    ];
    const prodStmt = this.sqliteDb.prepare("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?)");
    products.forEach(p => prodStmt.run(p));
    prodStmt.free();

    // Customers (100 profiles)
    const cities = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Seattle', 'Austin', 'San Francisco', 'New York'];
    const states = ['Karnataka', 'Maharashtra', 'Delhi', 'Telangana', 'Tamil Nadu', 'Maharashtra', 'Washington', 'Texas', 'California', 'New York'];
    const countries = ['India', 'India', 'India', 'India', 'India', 'India', 'USA', 'USA', 'USA', 'USA'];
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const names = [
      'Aarav Sharma', 'Aditi Verma', 'Advait Gupta', 'Ananya Mehta', 'Arjun Patel', 'Bhavya Reddy',
      'Chirag Iyer', 'Dev Rao', 'Diya Chopra', 'Eshaan Singh', 'Gaurav Joshi', 'Isha Bhat',
      'Kabir Kulkarni', 'Kavya Menon', 'Manish Pillai', 'Neha Mukherjee', 'Rahul Banerjee',
      'Rohan Deshmukh', 'Sakshi Kapoor', 'Siddharth Nair', 'James Smith', 'John Johnson',
      'Mary Williams', 'Patricia Brown', 'Robert Jones', 'Michael Miller', 'Linda Davis',
      'William Wilson', 'Elizabeth Anderson', 'David Taylor'
    ];

    const custStmt = this.sqliteDb.prepare("INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (let i = 1; i <= 100; i++) {
      const full = names[(i * 7) % names.length];
      const parts = full.split(' ');
      const cIdx = (i * 3) % cities.length;
      const email = `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}${i}@domain.com`;
      const date = `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`;
      custStmt.run([i, parts[0], parts[1], email, cities[cIdx], states[cIdx], countries[cIdx], date, tiers[i % tiers.length]]);
    }
    custStmt.free();

    // Orders (400 orders) + Order Items (1000+) + Payments (400)
    const statuses = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Shipped', 'Processing', 'Cancelled'];
    const payMethods = ['UPI', 'Credit Card', 'Net Banking', 'Debit Card', 'PayPal'];

    const ordStmt = this.sqliteDb.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)");
    const itmStmt = this.sqliteDb.prepare("INSERT INTO order_items VALUES (?, ?, ?, ?, ?, ?)");
    const payStmt = this.sqliteDb.prepare("INSERT INTO payments VALUES (?, ?, ?, ?, ?, ?)");

    let itmId = 1;
    for (let oId = 1; oId <= 400; oId++) {
      const cId = ((oId * 13) % 100) + 1;
      const yr = oId > 180 ? '2026' : '2025';
      const mo = String(((oId * 3) % 12) + 1).padStart(2, '0');
      const da = String(((oId * 7) % 28) + 1).padStart(2, '0');
      const orderDate = `${yr}-${mo}-${da}`;
      const status = statuses[oId % statuses.length];

      const p1 = products[((oId * 5) % products.length)];
      const q1 = (oId % 2) + 1;
      const tot1 = parseFloat((p1[3] * q1).toFixed(2));
      itmStmt.run([itmId++, oId, p1[0], q1, p1[3], tot1]);

      let grandTotal = tot1;
      if (oId % 2 === 0) {
        const p2 = products[((oId * 9 + 3) % products.length)];
        const q2 = 1;
        const tot2 = parseFloat((p2[3] * q2).toFixed(2));
        itmStmt.run([itmId++, oId, p2[0], q2, p2[3], tot2]);
        grandTotal += tot2;
      }

      grandTotal = parseFloat(grandTotal.toFixed(2));
      const shippingFee = grandTotal > 100 ? 0.0 : 9.99;
      const discount = grandTotal > 200 ? parseFloat((grandTotal * 0.1).toFixed(2)) : 0.0;
      const netTotal = parseFloat((grandTotal + shippingFee - discount).toFixed(2));

      ordStmt.run([oId, cId, orderDate, status, netTotal, shippingFee, discount]);

      const pMeth = payMethods[oId % payMethods.length];
      const pStat = status === 'Cancelled' ? 'Failed' : 'Successful';
      payStmt.run([oId, oId, orderDate, pMeth, netTotal, pStat]);
    }

    ordStmt.free();
    itmStmt.free();
    payStmt.free();
  }

  /* -------------------------------------------------------------------
   * MySQL Live Connection Management
   * ------------------------------------------------------------------- */
  async testMySQL(config) {
    return await safeFetchJson(getApiEndpoint('/api/mysql/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }

  async connectMySQL(config) {
    const data = await safeFetchJson(getApiEndpoint('/api/mysql/connect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (data.success) {
      this.mode = 'mysql';
      this.mysqlConfig = data.config;
      this.mysqlTables = data.tables || [];
      // Fetch full schema
      await this.refreshMySQLSchema();
    }
    return data;
  }

  async disconnectMySQL() {
    try {
      await fetch(getApiEndpoint('/api/mysql/disconnect'), { method: 'POST' });
    } catch (e) {}
    this.mode = 'sample';
    this.mysqlConfig = null;
    this.mysqlTables = [];
    this.mysqlSchema = null;
  }

  async refreshMySQLSchema() {
    try {
      const data = await safeFetchJson(getApiEndpoint('/api/mysql/schema'));
      if (data && data.tables) {
        this.mysqlSchema = data;
        return data;
      }
      return null;
    } catch (e) {
      console.warn('Could not fetch MySQL schema:', e);
      return null;
    }
  }

  /* -------------------------------------------------------------------
   * Schema & Relationship Introspection
   * ------------------------------------------------------------------- */
  getMode() {
    return this.mode;
  }

  getSchema() {
    if (this.mode === 'mysql' && this.mysqlSchema) {
      return {
        dialect: 'mysql',
        database: this.mysqlConfig?.database || 'MySQL DB',
        tables: this.mysqlSchema.tables || []
      };
    }

    // Sample SQLite WASM database
    if (!this.sqliteDb) return { dialect: 'sqlite', tables: [] };

    const tableRes = this.sqliteDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC;");
    if (!tableRes || tableRes.length === 0) return { dialect: 'sqlite', tables: [] };

    const tableNames = tableRes[0].values.map(v => v[0]);
    const tables = [];

    for (const name of tableNames) {
      const colRes = this.sqliteDb.exec(`PRAGMA table_info("${name}");`);
      const countRes = this.sqliteDb.exec(`SELECT COUNT(*) FROM "${name}";`);

      const columns = colRes.length > 0 ? colRes[0].values.map(c => ({
        cid: c[0],
        name: c[1],
        type: c[2] || 'TEXT',
        notnull: Boolean(c[3]),
        primaryKey: Boolean(c[5])
      })) : [];

      const rowCount = countRes.length > 0 && countRes[0].values.length > 0 ? countRes[0].values[0][0] : 0;

      tables.push({
        table: name,
        columns,
        rowCount
      });
    }

    return { dialect: 'sqlite', database: 'Sample Enterprise DB', tables };
  }

  /**
   * Returns complete relational foreign key map for visualization & ER diagram
   */
  getRelationships() {
    if (this.mode === 'sample') {
      return [
        {
          id: 'rel_orders_customers',
          fromTable: 'orders',
          fromCol: 'customer_id',
          toTable: 'customers',
          toCol: 'customer_id',
          cardinality: 'N:1',
          type: 'Many Orders to One Customer',
          description: 'Each order is placed by a customer.'
        },
        {
          id: 'rel_items_orders',
          fromTable: 'order_items',
          fromCol: 'order_id',
          toTable: 'orders',
          toCol: 'order_id',
          cardinality: 'N:1',
          type: 'Many Items to One Order',
          description: 'Each order item line belongs to an order.'
        },
        {
          id: 'rel_items_products',
          fromTable: 'order_items',
          fromCol: 'product_id',
          toTable: 'products',
          toCol: 'product_id',
          cardinality: 'N:1',
          type: 'Many Items to One Product',
          description: 'Each line item references a catalog product.'
        },
        {
          id: 'rel_products_categories',
          fromTable: 'products',
          fromCol: 'category_id',
          toTable: 'categories',
          toCol: 'category_id',
          cardinality: 'N:1',
          type: 'Many Products to One Category',
          description: 'Each product is organized under a category.'
        },
        {
          id: 'rel_payments_orders',
          fromTable: 'payments',
          fromCol: 'order_id',
          toTable: 'orders',
          toCol: 'order_id',
          cardinality: 'N:1',
          type: 'Payment to Order',
          description: 'Payment transactions settle customer orders.'
        }
      ];
    }

    // Heuristic foreign key detection for live MySQL schemas
    const schema = this.getSchema();
    const rels = [];
    const tables = schema.tables || [];

    for (const t of tables) {
      for (const col of t.columns) {
        if (col.name.endsWith('_id') && !col.primaryKey) {
          const targetBase = col.name.replace(/_id$/i, '');
          const targetTable = tables.find(tb => 
            tb.table.toLowerCase() === targetBase.toLowerCase() || 
            tb.table.toLowerCase() === (targetBase + 's').toLowerCase()
          );
          if (targetTable) {
            rels.push({
              id: `rel_${t.table}_${targetTable.table}`,
              fromTable: t.table,
              fromCol: col.name,
              toTable: targetTable.table,
              toCol: col.name,
              cardinality: 'N:1',
              type: `Many ${t.table} to One ${targetTable.table}`,
              description: `Foreign key link between ${t.table}.${col.name} and ${targetTable.table}.${col.name}`
            });
          }
        }
      }
    }
    return rels;
  }

  getPromptSchema() {
    const { dialect, tables } = this.getSchema();
    const rels = this.getRelationships();

    let text = `Database Engine: ${dialect.toUpperCase()}\n`;
    text += `Database Name: ${this.mode === 'mysql' ? this.mysqlConfig?.database : 'Sample Enterprise DB'}\n\n`;
    text += `Tables & Columns:\n`;

    for (const t of tables) {
      text += `Table: ${t.table} (~${t.rowCount} rows)\n`;
      text += `  Columns: ` + t.columns.map(c => `${c.name} (${c.type})${c.primaryKey ? ' [PK]' : ''}`).join(', ') + `\n`;
    }

    if (rels.length > 0) {
      text += `\nForeign Key Relationships:\n`;
      rels.forEach(r => {
        text += `  - ${r.fromTable}.${r.fromCol} -> ${r.toTable}.${r.toCol} (${r.cardinality})\n`;
      });
    }

    return text;
  }

  /* -------------------------------------------------------------------
   * Query Execution Sandbox (Dispatches to MySQL or SQLite WASM)
   * ------------------------------------------------------------------- */
  async execute(sql) {
    if (this.mode === 'mysql') {
      try {
        const data = await safeFetchJson(getApiEndpoint('/api/mysql/query'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        return data;
      } catch (err) {
        return {
          success: false,
          error: `MySQL Execution Error: ${err.message}`,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs: 0
        };
      }
    }

    // Default Sample SQLite WASM Execution
    if (!this.sqliteDb) {
      throw new Error('Sample database engine is not initialized.');
    }

    const startTime = performance.now();
    try {
      let cleanSql = sql.trim();
      if (!cleanSql.endsWith(';')) cleanSql += ';';

      const results = this.sqliteDb.exec(cleanSql);
      const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));

      if (!results || results.length === 0) {
        return {
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs,
          dialect: 'sqlite'
        };
      }

      const firstResult = results[0];
      const columns = firstResult.columns;
      const rawValues = firstResult.values;

      const rows = rawValues.map(rowVals => {
        const rowObj = {};
        columns.forEach((col, idx) => {
          rowObj[col] = rowVals[idx];
        });
        return rowObj;
      });

      return {
        success: true,
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
        dialect: 'sqlite'
      };
    } catch (err) {
      const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
      return {
        success: false,
        error: err.message,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs,
        dialect: 'sqlite'
      };
    }
  }

  async getTableSample(tableName, limit = 10) {
    const sql = `SELECT * FROM ${this.mode === 'mysql' ? '`' + tableName + '`' : '"' + tableName + '"'} LIMIT ${limit};`;
    return await this.execute(sql);
  }
}

export const dbEngine = new DatabaseEngine();
