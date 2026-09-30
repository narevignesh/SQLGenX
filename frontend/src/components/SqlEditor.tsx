import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Zap, 
  AlignLeft, 
  RotateCw,
  Code2
} from 'lucide-react';
import { api } from '../services/api';

interface SqlEditorProps {
  sql: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  onOptimize: () => void;
  isExecuting?: boolean;
  dialect?: string;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  sql,
  onChange,
  onExecute,
  onOptimize,
  isExecuting = false,
  dialect = 'sqlite'
}) => {
  const [copied, setCopied] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_${Date.now()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFormat = async () => {
    if (!sql) return;
    setIsFormatting(true);
    try {
      const res = await api.formatSql(sql);
      onChange(res.formatted_sql);
    } catch (e) {
      console.error('Format failed:', e);
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-2xl">
      {/* Editor Header / Action Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wide font-mono">
            Generated SQL Editor
          </span>
          <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            {dialect}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFormat}
            disabled={isFormatting || !sql}
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
            title="Format SQL indentation"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Format</span>
          </button>

          <button
            onClick={onOptimize}
            disabled={!sql}
            className="flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
            title="Analyze performance & optimize"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Optimize</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!sql}
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
            title="Copy SQL to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!sql}
            className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700/80 p-1.5 rounded-lg transition-all disabled:opacity-50"
            title="Download SQL file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onExecute}
            disabled={isExecuting || !sql}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 px-3.5 py-1.5 rounded-lg transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {isExecuting ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-slate-950" />
            )}
            <span>{isExecuting ? 'Running...' : 'Execute SQL'}</span>
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="h-[220px] bg-[#0d131f] relative">
        <Editor
          height="100%"
          language="sql"
          theme="vs-dark"
          value={sql}
          onChange={(val) => onChange(val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            renderLineHighlight: 'line',
            contextmenu: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            }
          }}
        />
      </div>
    </div>
  );
};
