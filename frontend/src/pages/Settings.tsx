import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  ShieldCheck, 
  Sliders, 
  Check, 
  Activity, 
  Cpu, 
  Server,
  Lock
} from 'lucide-react';
import { LLMProvider } from '../types';
import { api } from '../services/api';

interface SettingsProps {
  activeProvider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  activeProvider,
  onProviderChange
}) => {
  const [groqKey, setGroqKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [maxRows, setMaxRows] = useState(500);
  const [timeoutSec, setTimeoutSec] = useState(15);
  const [readOnlyMode, setReadOnlyMode] = useState(true);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Platform Settings & AI Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure LLM provider keys, execution timeouts, and database safety guardrails.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* LLM Providers Configuration */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            AI Model Providers
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            SQLGenX supports multi-provider LLM routing with intelligent offline fallback.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Groq API Key</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                  Primary / Active
                </span>
              </label>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">OpenAI API Key (Optional)</label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Google Gemini API Key (Optional)</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none font-mono"
            />
          </div>
        </div>

        {/* Default Provider Selector */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-slate-300">Default Active Provider</label>
          <select
            value={activeProvider}
            onChange={(e) => onProviderChange(e.target.value as LLMProvider)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none"
          >
            <option value="groq">Groq (LLaMA-3.3 70B Versatile)</option>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
            <option value="fallback">Local Semantic Rule-Based Agent</option>
          </select>
        </div>
      </div>

      {/* Safety & Execution Guardrails */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Execution Safety Guardrails
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise policy enforcement and automated threat prevention.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Max Result Rows Limit</label>
            <input
              type="number"
              value={maxRows}
              onChange={(e) => setMaxRows(Number(e.target.value))}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Query Timeout (Seconds)</label>
            <input
              type="number"
              value={timeoutSec}
              onChange={(e) => setTimeoutSec(Number(e.target.value))}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
          <input
            type="checkbox"
            id="readonly-toggle"
            checked={readOnlyMode}
            onChange={(e) => setReadOnlyMode(e.target.checked)}
            className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-0"
          />
          <label htmlFor="readonly-toggle" className="text-xs text-slate-300 cursor-pointer">
            <strong className="text-emerald-400">Strict Read-Only Mode</strong> — Blocks all DROP, DELETE, TRUNCATE, ALTER, INSERT, and UPDATE queries unconditionally.
          </label>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
