import React from 'react';
import { 
  Database, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  Zap, 
  PlayCircle, 
  BarChart3,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { PipelineStage } from '../types';

interface AgentWorkflowProps {
  currentStage: PipelineStage;
  stageStatuses: Record<string, 'waiting' | 'processing' | 'completed' | 'failed' | 'skipped'>;
  stageDetails?: Record<string, string>;
  repaired?: boolean;
}

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({
  currentStage,
  stageStatuses,
  stageDetails = {},
  repaired = false
}) => {
  const stages = [
    {
      id: 'schema_retrieval',
      name: 'Schema RAG',
      desc: 'Semantic Schema Matching',
      icon: Search,
      color: 'sky'
    },
    {
      id: 'sql_generation',
      name: 'SQL Generator',
      desc: 'LLM Query Synthesis',
      icon: Sparkles,
      color: 'cyan'
    },
    {
      id: 'validation',
      name: 'SQL Validator',
      desc: 'AST & Schema Integrity',
      icon: CheckCircle2,
      color: 'emerald'
    },
    ...(repaired ? [{
      id: 'repair',
      name: 'Auto-Repair Agent',
      desc: 'Error Diagnostics & Patch',
      icon: Wrench,
      color: 'amber'
    }] : []),
    {
      id: 'optimization',
      name: 'Optimizer',
      desc: 'EXPLAIN Plan & Cost',
      icon: Zap,
      color: 'purple'
    },
    {
      id: 'execution',
      name: 'Execution Sandbox',
      desc: 'Read-Only DB Engine',
      icon: PlayCircle,
      color: 'blue'
    },
    {
      id: 'analysis',
      name: 'Data Analyst',
      desc: 'Grounded Insights & Viz',
      icon: BarChart3,
      color: 'indigo'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded-full animate-pulse">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>Active</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Done</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Failed</span>
          </div>
        );
      default:
        return (
          <div className="text-[10px] font-medium text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            Waiting
          </div>
        );
    }
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-4 overflow-x-auto shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Real-Time Agent Execution Pipeline
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          State: <span className="text-cyan-400 uppercase font-bold">{currentStage.replace('_', ' ')}</span>
        </span>
      </div>

      {/* Nodes Row */}
      <div className="flex items-center gap-2 min-w-[760px] pb-1">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const status = stageStatuses[stage.id] || 'waiting';
          const isCurrent = currentStage === stage.id;
          const detail = stageDetails[stage.id];

          return (
            <React.Fragment key={stage.id}>
              <div
                className={`flex-1 min-w-[120px] p-3 rounded-xl border transition-all duration-300 relative ${
                  isCurrent
                    ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-cyan-400/80 shadow-lg shadow-cyan-500/20 scale-[1.03]'
                    : status === 'completed'
                    ? 'bg-slate-900/80 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${
                    isCurrent ? 'bg-cyan-500/20 text-cyan-300' : status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {getStatusBadge(status)}
                </div>

                <h4 className="text-xs font-bold truncate text-slate-200">{stage.name}</h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{stage.desc}</p>
                {detail && (
                  <p className="text-[9px] font-mono text-cyan-300/80 truncate mt-1 bg-slate-950/80 px-1 py-0.5 rounded">
                    {detail}
                  </p>
                )}
              </div>

              {idx < stages.length - 1 && (
                <div className="shrink-0 text-slate-700">
                  <ArrowRight className={`w-3.5 h-3.5 transition-colors ${
                    status === 'completed' ? 'text-cyan-500/80' : 'text-slate-800'
                  }`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
