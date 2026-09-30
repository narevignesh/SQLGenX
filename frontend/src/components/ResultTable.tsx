import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  FileSpreadsheet, 
  FileText, 
  Clock, 
  Layers,
  Table as TableIcon
} from 'lucide-react';
import { api } from '../services/api';

interface ResultTableProps {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs?: number;
  question?: string;
  sql?: string;
  riskLevel?: string;
  insights?: string[];
}

export const ResultTable: React.FC<ResultTableProps> = ({
  columns,
  rows,
  executionTimeMs = 0,
  question = '',
  sql = '',
  riskLevel = 'LOW',
  insights = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      return sortDirection === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleExportCsv = () => {
    api.exportCsv({ question, columns, rows });
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rows, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `query_result_${Date.now()}.json`;
    a.click();
  };

  const handleExportPdf = () => {
    api.exportPdfReport({
      question,
      sql,
      execution_time_ms: executionTimeMs,
      row_count: rows.length,
      risk_level: riskLevel,
      insights,
      columns,
      rows
    });
  };

  if (!columns || columns.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <TableIcon className="w-8 h-8 opacity-40" />
        <p className="text-sm font-medium">No query results to display.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* Table Header & Controls */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Result Set:</span>
            <span className="font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/20 px-2 py-0.5 rounded">
              {rows.length} rows
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">{executionTimeMs} ms</span>
          </div>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter results..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 outline-none w-44"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            title="Export as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            title="Export as JSON"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            title="Export Intelligence PDF Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Interactive Table */}
      <div className="overflow-x-auto max-h-[360px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4 w-12 text-slate-500 font-mono">#</th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="py-2.5 px-4 font-mono text-slate-300 hover:text-cyan-300 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                    <ArrowUpDown className={`w-3 h-3 ${sortColumn === col ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {paginatedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-850/60 transition-colors">
                <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">
                  {(currentPage - 1) * pageSize + idx + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const isNumber = typeof val === 'number';
                  const displayVal = val !== null && val !== undefined ? String(val) : 'NULL';
                  return (
                    <td key={col} className={`py-2 px-4 font-mono text-slate-300 ${isNumber ? 'text-cyan-300/90' : ''}`}>
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length} rows
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
