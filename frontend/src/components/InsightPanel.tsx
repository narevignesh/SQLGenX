import React, { useState } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  TrendingUp,
  BrainCircuit
} from 'lucide-react';

interface InsightPanelProps {
  insights: string[];
  explanationSteps: string[];
  summary?: string;
}

export const InsightPanel: React.FC<InsightPanelProps> = ({
  insights,
  explanationSteps,
  summary
}) => {
  const [showExplanation, setShowExplanation] = useState(true);

  return (
    <div className="space-y-4">
      {/* Grounded AI Business Insights */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Grounded AI Business Insights</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded">
            Calculated from Execution Data
          </span>
        </div>

        {summary && (
          <p className="text-xs text-slate-300 font-medium leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
            {summary}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/60 transition-colors"
            >
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-slate-300 leading-snug">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-Step Query Explanation */}
      {explanationSteps && explanationSteps.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
                How this query works (Step-by-Step)
              </span>
            </div>
            {showExplanation ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showExplanation && (
            <ol className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              {explanationSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-slate-300">
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-bold font-mono shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
};
