import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RiskAnalysis, RiskLevel } from '../types';

interface RiskBadgeProps {
  risk: RiskAnalysis;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getBadgeStyle = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return {
          bg: 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300',
          icon: ShieldCheck,
          label: 'LOW RISK',
          color: 'text-emerald-400'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-950/60 border-amber-500/30 text-amber-300',
          icon: ShieldAlert,
          label: 'MEDIUM RISK',
          color: 'text-amber-400'
        };
      case 'HIGH':
        return {
          bg: 'bg-rose-950/60 border-rose-500/30 text-rose-300',
          icon: ShieldX,
          label: 'HIGH RISK (BLOCKED)',
          color: 'text-rose-400'
        };
    }
  };

  const badge = getBadgeStyle(risk.level);
  const Icon = badge.icon;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold tracking-wide transition-all shadow-sm ${badge.bg}`}
      >
        <Icon className={`w-3.5 h-3.5 ${badge.color}`} />
        <span>{badge.label}</span>
        <span className="text-[10px] opacity-75 font-mono">({Math.round(risk.confidence * 100)}%)</span>
        <Info className="w-3 h-3 ml-0.5 opacity-60 hover:opacity-100" />
      </button>

      {/* Popover Details */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 p-4 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Icon className={`w-4 h-4 ${badge.color}`} />
              ML SQL Risk Analysis
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
              Random Forest
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-1">Probability Distribution:</p>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
              <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
                LOW: {Math.round(risk.probabilities.LOW * 100)}%
              </div>
              <div className="p-1.5 rounded bg-amber-950/40 border border-amber-500/20 text-amber-300">
                MED: {Math.round(risk.probabilities.MEDIUM * 100)}%
              </div>
              <div className="p-1.5 rounded bg-rose-950/40 border border-rose-500/20 text-rose-300">
                HIGH: {Math.round(risk.probabilities.HIGH * 100)}%
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-400 mb-1">Classifier Evaluation Factors:</p>
            <ul className="space-y-1 text-slate-300">
              {risk.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-tight">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
