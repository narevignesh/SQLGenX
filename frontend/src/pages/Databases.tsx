import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Server, 
  ShieldCheck, 
  Lock, 
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface DatabasesProps {
  currentDbType: string;
  onRefreshSchema: () => void;
}

export const Databases: React.FC<DatabasesProps> = ({
  currentDbType,
  onRefreshSchema
}) => {
  const [dbType, setDbType] = useState<'sqlite' | 'postgresql' | 'mysql'>('sqlite');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(5432);
  const [databaseName, setDatabaseName] = useState('ecommerce_db');
  const [username, setUsername] = useState('postgres');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(false);
  const [sqlitePath, setSqlitePath] = useState('');
  
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.getDatabaseStatus();
      setDbStatus(res);
    } catch (e) {
      console.error('Failed to get DB status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await api.testDatabaseConnection({
        db_type: dbType,
        host,
        port: Number(port),
        database_name: databaseName,
        username,
        password,
        ssl,
        sqlite_path: sqlitePath
      });
      setStatusMessage({ type: 'success', text: res.message || 'Connection test successful!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setStatusMessage(null);
    try {
      const res = await api.connectDatabase({
        db_type: dbType,
        host,
        port: Number(port),
        database_name: databaseName,
        username,
        password,
        ssl,
        sqlite_path: sqlitePath
      });
      setStatusMessage({ type: 'success', text: res.message || 'Connected successfully!' });
      fetchStatus();
      onRefreshSchema();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Connection failed.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleSeedDemoDb = async () => {
    setSeeding(true);
    setStatusMessage(null);
    try {
      const res = await api.seedDemoDatabase();
      setStatusMessage({
        type: 'success',
        text: `Demo database populated! ${res.stats?.customers} customers, ${res.stats?.orders} orders, ${res.stats?.order_items} items.`
      });
      fetchStatus();
      onRefreshSchema();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to seed database.' });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* Active Database Status Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Active Database Engine</h2>
              <span className="text-[10px] font-mono uppercase bg-emerald-950 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Engine: <strong className="text-cyan-300 uppercase">{dbStatus?.db_type || currentDbType}</strong> | Tables: <strong className="text-slate-200">{dbStatus?.total_tables || 6}</strong> | Enforced: <strong className="text-emerald-400">Read-Only Safe Mode</strong>
            </p>
          </div>
        </div>

        {/* 1-Click Seed Demo DB Button */}
        <button
          onClick={handleSeedDemoDb}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
          <span>{seeding ? 'Seeding Records...' : '1-Click Seed E-Commerce Demo DB (1000+ Rows)'}</span>
        </button>
      </div>

      {/* Notification Message */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-lg ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <p className="leading-relaxed font-medium">{statusMessage.text}</p>
        </div>
      )}

      {/* Connection Form */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            Connect Custom Relational Database
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            SQLGenX automatically inspects schema metadata, primary keys, foreign keys, and indexes upon connection.
          </p>
        </div>

        {/* Database Type Select */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">Select Database Engine</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'sqlite', name: 'SQLite', desc: 'Embedded / Local File' },
              { id: 'postgresql', name: 'PostgreSQL', desc: 'Enterprise Relational' },
              { id: 'mysql', name: 'MySQL', desc: 'Standard Relational' },
            ].map((engine) => (
              <button
                key={engine.id}
                type="button"
                onClick={() => setDbType(engine.id as any)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  dbType === engine.id
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <p className="text-xs font-bold">{engine.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{engine.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* SQLite or Network Inputs */}
        {dbType === 'sqlite' ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">SQLite Database Path (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty to use built-in sqlgenx_demo.db"
              value={sqlitePath}
              onChange={(e) => setSqlitePath(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Host</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Database Name</label>
              <input
                type="text"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="ssl-check"
                checked={ssl}
                onChange={(e) => setSsl(e.target.checked)}
                className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <label htmlFor="ssl-check" className="text-xs text-slate-300 cursor-pointer">
                Require SSL (Encrypted Connection)
              </label>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || connecting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors disabled:opacity-40"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="button"
            onClick={handleConnect}
            disabled={testing || connecting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40"
          >
            <Database className="w-3.5 h-3.5 fill-slate-950" />
            <span>{connecting ? 'Connecting & Indexing...' : 'Connect & Inspect Schema'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
