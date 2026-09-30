import React, { useState } from 'react';
import { 
  Sparkles, 
  Database, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Play, 
  Code2, 
  Cpu, 
  BarChart3, 
  Layers,
  Network
} from 'lucide-react';

interface LandingProps {
  onLaunchWorkspace: () => void;
  onExploreSchema: () => void;
  onViewMLOps: () => void;
}

export const Landing: React.FC<LandingProps> = ({
  onLaunchWorkspace,
  onExploreSchema,
  onViewMLOps
}) => {
  const [demoQuery, setDemoQuery] = useState("Show top 5 customers by total spending");

  const sampleQueries = [
    "Show the top 5 customers by total spending",
    "Which city generated the highest revenue?",
    "Show monthly revenue for 2026",
    "Find customers who haven't purchased in 90 days"
  ];

  return (
    <div className="space-y-16 py-6 pb-20 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6 pt-8">
        {/* Subtle glowing orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Generation Agentic SQL Intelligence Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Ask Your Database Anything.
          <br />
          <span className="text-gradient">Validated, Optimized & Safe SQL.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Transform natural language into robust SQL with real-time multi-agent reasoning, semantic schema RAG, machine learning risk classification, and grounded automated analytics.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onLaunchWorkspace}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02]"
          >
            <span>Launch SQLGenX Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreSchema}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm tracking-wide transition-all"
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Explore Schema Graph</span>
          </button>

          <button
            onClick={onViewMLOps}
            className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm tracking-wide transition-all"
          >
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>MLOps Benchmarks</span>
          </button>
        </div>
      </section>

      {/* Interactive Quick-Demo Sandbox Preview */}
      <section className="max-w-4xl mx-auto glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800/90 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-slate-400 ml-2">sqlgenx_interactive_sandbox.ai</span>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
            Ready to Query
          </span>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => setDemoQuery(q)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                demoQuery === q
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={demoQuery}
            onChange={(e) => setDemoQuery(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400/80 rounded-2xl px-5 py-4 text-sm text-slate-100 outline-none pr-36 shadow-inner font-medium"
            placeholder="Ask your database anything in plain English..."
          />
          <button
            onClick={onLaunchWorkspace}
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate SQL</span>
          </button>
        </div>

        {/* 6 Multi-Agent Core Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              RAG Schema Retrieval
            </span>
            <p className="text-[11px] text-slate-400">Pulls only relevant tables, columns, and foreign keys via vector index.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Iterative Auto-Repair
            </span>
            <p className="text-[11px] text-slate-400">Diagnoses syntax & join errors and self-repairs in real-time loops.</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ML SQL Risk Classifier
            </span>
            <p className="text-[11px] text-slate-400">Scikit-learn Random Forest model enforces strict read-only security.</p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Full-Stack Enterprise Capabilities</h2>
          <p className="text-sm text-slate-400">Built for production database exploration, developer copilot tasks, and executive analytics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Multi-Agent Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Orchestrates 6 distinct agents (Schema, Generator, Validator, Repair, Optimizer, and Analyst) with real-time SSE event visualization.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Cost & EXPLAIN Optimizer</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Analyzes execution plans, converts non-SARGable functions to indexed ranges, prunes redundant joins, and benchmarks cost improvement.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Smart Auto-Visualization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically selects the optimal chart type (Bar, Line, Area, Pie, Scatter, KPI Card) and delivers grounded business takeaways.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
