import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Play, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Wrench,
  RotateCcw
} from 'lucide-react';
import { HistoryRecord } from '../types';
import { api } from '../services/api';

interface QueryHistoryProps {
  onRerunQuery: (question: string) => void;
}

export const QueryHistory: React.FC<QueryHistoryProps> = ({ onRerunQuery }) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteHistoryItem(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all query history?')) {
      try {
        await api.clearHistory();
        setHistory([]);
      } catch (e) {
        console.error('Clear failed:', e);
      }
    }
  };

  const handleCopySql = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = history.filter((h) =>
    h.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.sql.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Query Execution History & Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted historical queries, execution metrics, auto-repairs, and ML risk evaluations.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 px-3 py-2 rounded-xl transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="glass-panel rounded-2xl p-3 border border-slate-800 flex items-center gap-2 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search past questions or SQL code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
        />
      </div>

      {/* History Items List */}
      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <History className="w-8 h-8 opacity-40" />
          <p className="text-sm font-medium">No query history records found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-lg"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-100">{item.question}</h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    item.risk_level === 'LOW' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.risk_level} RISK
                  </span>

                  {item.repaired && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300">
                      <Wrench className="w-3 h-3" />
                      Repaired
                    </span>
                  )}

                  <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{item.execution_time_ms} ms</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    {item.timestamp}
                  </span>
                </div>
              </div>

              {/* SQL Code Block */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 relative group">
                <pre className="text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                  {item.sql}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-400">
                  Rows Returned: <strong className="text-slate-200 font-mono">{item.row_count}</strong> | Dialect: <strong className="text-slate-200 font-mono uppercase">{item.dialect}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopySql(item.id, item.sql)}
                    className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => onRerunQuery(item.question)}
                    className="flex items-center gap-1 font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 px-3 py-1 rounded-lg transition-colors"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Re-run</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
