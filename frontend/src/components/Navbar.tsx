import React from 'react';
import { Database, Cpu, ShieldCheck, Sparkles, Terminal, Activity, ArrowUpRight } from 'lucide-react';
import { LLMProvider } from '../types';

interface NavbarProps {
  activeProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  dbType: string;
  isDbConnected: boolean;
  onNavigateToDb: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeProvider,
  onProviderChange,
  dbType,
  isDbConnected,
  onNavigateToDb
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white font-mono">
              SQL<span className="text-cyan-400">Gen</span><span className="text-sky-400">X</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Agentic v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Enterprise Agentic SQL Intelligence Platform</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Model Provider Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 font-medium">Model:</span>
          <select
            value={activeProvider}
            onChange={(e) => onProviderChange(e.target.value as LLMProvider)}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer focus:ring-0"
          >
            <option value="groq" className="bg-slate-900 text-slate-200">Groq (LLaMA 3.3 70B)</option>
            <option value="gemini" className="bg-slate-900 text-slate-200">Gemini 1.5 Flash</option>
            <option value="openai" className="bg-slate-900 text-slate-200">OpenAI GPT-4o-mini</option>
            <option value="fallback" className="bg-slate-900 text-slate-200">Local Semantic Agent</option>
          </select>
        </div>

        {/* Active Database Status Pill */}
        <button
          onClick={onNavigateToDb}
          className="flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 transition-all text-xs group"
          title="Click to manage database connection"
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300 font-medium capitalize">{dbType}</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[11px] text-slate-400 group-hover:text-cyan-300 transition-colors">
              {isDbConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </button>

        {/* Read-Only Safety Shield */}
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Read-Only</span>
        </div>

        {/* API Docs Button */}
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>API Docs</span>
          <ArrowUpRight className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </header>
  );
};
