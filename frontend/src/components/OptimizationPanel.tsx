import React from 'react';
import { Zap, TrendingDown, ArrowRight, Check, AlertTriangle, Layers } from 'lucide-react';
import { OptimizationResult } from '../types';

interface OptimizationPanelProps {
  optimization: OptimizationResult;
  onApplyOptimized: (sql: string) => void;
  onClose?: () => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  optimization,
  onApplyOptimized,
  onClose
}) => {
  if (!optimization) return null;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">SQL Optimization & Cost Analysis</h3>
            <p className="text-[11px] text-slate-400">EXPLAIN Query Plan Performance Diagnostic</p>
          </div>
        </div>

        {optimization.improvement_percentage > 0 && (
          <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-xl">
            <TrendingDown className="w-4 h-4" />
            <span>~{optimization.improvement_percentage}% Cost Reduction</span>
          </div>
        )}
      </div>

      {/* Cost Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase font-semibold text-slate-400">Original Query Cost</p>
          <p className="text-xl font-bold font-mono text-amber-400">{optimization.estimated_cost_before}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase font-semibold text-slate-400">Optimized Estimated Cost</p>
          <p className="text-xl font-bold font-mono text-emerald-400">{optimization.estimated_cost_after}</p>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-300">Optimization Suggestions:</p>
        {optimization.suggestions.map((sug, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
            <div className="flex items-center gap-2 text-purple-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>{sug.title}</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed pl-4">{sug.description}</p>
          </div>
        ))}
      </div>

      {/* Query Comparison */}
      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <p className="text-[10px] font-mono uppercase text-slate-500 mb-1">Optimized SQL:</p>
          <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap overflow-x-auto">
            {optimization.optimized_sql}
          </pre>
        </div>
      </div>

      {/* Apply Button */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg"
          >
            Dismiss
          </button>
        )}
        <button
          onClick={() => onApplyOptimized(optimization.optimized_sql)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-purple-400 to-indigo-400 hover:from-purple-300 hover:to-indigo-300 px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-500/20"
        >
          <Check className="w-4 h-4" />
          <span>Apply Optimized SQL to Editor</span>
        </button>
      </div>
    </div>
  );
};
