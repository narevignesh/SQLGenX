import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Database, 
  Key, 
  Search, 
  RefreshCw, 
  FileCode, 
  ArrowRight, 
  Layers, 
  Check, 
  Copy,
  Table as TableIcon,
  LayoutGrid,
  GitGraph
} from 'lucide-react';
import { SchemaData, TableInfo } from '../types';
import { api } from '../services/api';
import { SchemaGraph } from '../components/SchemaGraph';

export const SchemaExplorer: React.FC = () => {
  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [ragResults, setRagResults] = useState<any>(null);
  const [isSearchingRag, setIsSearchingRag] = useState(false);
  const [showDdl, setShowDdl] = useState(false);
  const [ddlText, setDdlText] = useState('');
  const [isReindexing, setIsReindexing] = useState(false);
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'cards'>('graph');

  const fetchSchema = async () => {
    setLoading(true);
    try {
      const data = await api.getFullSchema();
      setSchema(data);
      if (data.tables.length > 0) {
        setSelectedTable(data.tables[0]);
      }
    } catch (e) {
      console.error('Failed to load schema:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, []);

  const handleRagSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingRag(true);
    try {
      const res = await api.searchSchemaRAG(searchQuery.trim(), 5);
      setRagResults(res);
    } catch (e) {
      console.error('RAG search failed:', e);
    } finally {
      setIsSearchingRag(false);
    }
  };

  const handleViewDdl = async () => {
    try {
      const res = await fetch('/api/schema/ddl').then((r) => r.json());
      setDdlText(res.ddl || '');
      setShowDdl(true);
    } catch (e) {
      console.error('Failed to fetch DDL:', e);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      await api.reindexSchema();
      alert('Schema vector embeddings re-indexed successfully!');
    } catch (e) {
      console.error('Reindex failed:', e);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleCopyDdl = () => {
    navigator.clipboard.writeText(ddlText);
    setCopiedDdl(true);
    setTimeout(() => setCopiedDdl(false), 2000);
  };

  const filteredTables = (schema?.tables || []).filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.columns.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Interactive Schema ER Graph & Relationship Explorer</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Database Dialect: <strong className="text-cyan-300 uppercase">{schema?.database_type || 'SQLite'}</strong> | {schema?.total_tables || 0} Tables | {schema?.relationships.length || 0} Relational Join Constraints
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'graph'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitGraph className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === 'cards'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card Grid</span>
            </button>
          </div>

          <button
            onClick={handleViewDdl}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-3 py-2 rounded-xl transition-colors"
          >
            <FileCode className="w-4 h-4 text-purple-400" />
            <span>View DDL</span>
          </button>

          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            title="Recomputes vector embeddings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
            <span>{isReindexing ? 'Re-indexing...' : 'Re-index RAG Vectors'}</span>
          </button>
        </div>
      </div>

      {/* Semantic Vector RAG Search Bar */}
      <form onSubmit={handleRagSearch} className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl flex items-center gap-3">
        <Search className="w-4 h-4 text-cyan-400 shrink-0" />
        <input
          type="text"
          placeholder="Semantic schema search (e.g. 'Which table stores customer payments or billing amount?')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={isSearchingRag || !searchQuery.trim()}
          className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-40"
        >
          {isSearchingRag ? 'Searching...' : 'Vector Search'}
        </button>
      </form>

      {/* RAG Search Match Results Banner if active */}
      {ragResults && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Semantic RAG Match Results:
            </span>
            <button
              onClick={() => setRagResults(null)}
              className="text-[10px] text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          </div>
          <p className="text-slate-300">
            Relevant Tables Linked: <strong className="text-cyan-400 font-mono">{ragResults.relevant_tables?.join(', ') || 'None'}</strong>
          </p>
        </div>
      )}

      {/* Main Representation: React Flow Graph or Card Grid */}
      {schema && (
        <>
          {viewMode === 'graph' ? (
            <div className="space-y-4">
              <SchemaGraph
                tables={schema.tables}
                relationships={schema.relationships}
                selectedTableName={selectedTable?.name}
                onSelectTable={(tbl) => setSelectedTable(tbl)}
                searchFilter={searchQuery}
              />

              {/* Selected Table Inspector Drawer */}
              {selectedTable && (
                <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold text-white font-mono">
                        Selected Table Details: <span className="text-cyan-400">{selectedTable.name}</span>
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {selectedTable.row_count.toLocaleString()} rows | {selectedTable.columns.length} columns
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {selectedTable.columns.map((col) => (
                      <div
                        key={col.name}
                        className={`p-2 rounded-xl text-xs font-mono border ${
                          col.primary_key
                            ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {col.primary_key ? (
                            <Key className="w-3 h-3 text-amber-400 shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                          )}
                          <span className="font-semibold truncate">{col.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block uppercase mt-0.5">{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTables.map((table) => (
                <div
                  key={table.name}
                  onClick={() => setSelectedTable(table)}
                  className={`glass-panel rounded-2xl p-5 border transition-all cursor-pointer shadow-xl relative ${
                    selectedTable?.name === table.name
                      ? 'border-cyan-400/80 bg-slate-900/90 shadow-cyan-500/10 scale-[1.02]'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <TableIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 font-mono">{table.name}</h3>
                        <p className="text-[10px] text-slate-400">{table.row_count.toLocaleString()} rows</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                      {table.columns.length} cols
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {table.columns.map((col) => {
                      const isPk = col.primary_key;
                      const isFk = table.foreign_keys?.some((fk) => fk.constrained_columns?.includes(col.name));

                      return (
                        <div
                          key={col.name}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/40"
                        >
                          <div className="flex items-center gap-1.5">
                            {isPk ? (
                              <Key className="w-3 h-3 text-amber-400" />
                            ) : isFk ? (
                              <ArrowRight className="w-3 h-3 text-purple-400" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            )}
                            <span className={`font-mono ${isPk ? 'text-amber-300 font-semibold' : 'text-slate-200'}`}>
                              {col.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">{col.type}</span>
                        </div>
                      );
                    })}
                  </div>

                  {table.foreign_keys && table.foreign_keys.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-500">Foreign Keys:</span>
                      {table.foreign_keys.map((fk, idx) => (
                        <p key={idx} className="font-mono text-purple-300/80 truncate">
                          ↳ {fk.constrained_columns?.[0]} → {fk.referred_table}.{fk.referred_columns?.[0]}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* DDL Modal */}
      {showDdl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel rounded-3xl p-6 border border-slate-700 shadow-2xl max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Database DDL Schema Export</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDdl}
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg"
                >
                  {copiedDdl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDdl ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setShowDdl(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 bg-slate-900 px-2.5 py-1 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 max-h-96 overflow-y-auto whitespace-pre-wrap">
              {ddlText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
