import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Play, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  BarChart2, 
  Wrench,
  RotateCw,
  Cpu,
  FileCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { ExperimentRun } from '../types';
import { api } from '../services/api';

export const MLOps: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string>('full_agent');
  const [benchmarkDataset, setBenchmarkDataset] = useState<any[]>([]);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const data = await api.getExperiments();
      setExperiments(data);
      const ds = await fetch('/api/mlops/benchmark-dataset').then((r) => r.json());
      setBenchmarkDataset(ds);
    } catch (e) {
      console.error('Failed to load experiments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const run = await api.runBenchmark(selectedMode);
      setExperiments((prev) => [run, ...prev]);
    } catch (e) {
      console.error('Benchmark run failed:', e);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleRunAllComparisons = async () => {
    setIsRunningBenchmark(true);
    try {
      const runs = await api.runAllComparisons();
      setExperiments((prev) => [...runs, ...prev]);
    } catch (e) {
      console.error('All comparison run failed:', e);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  // Prepare comparison data for charts if runs exist
  const comparisonChartData = experiments.slice(0, 4).map((exp) => ({
    name: exp.pipeline_mode.replace('_', ' ').toUpperCase(),
    'Exact Match %': exp.exact_match_accuracy,
    'Execution Accuracy %': exp.execution_accuracy,
    'Schema Linking %': exp.schema_linking_accuracy,
    'Repair Rate %': exp.repair_success_rate,
  }));

  const latestRun = experiments[0];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">MLOps & Multi-Agent Evaluation Dashboard</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Empirical benchmark metrics: Exact Match, Execution Accuracy, Schema Linking, and Latency distributions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 outline-none"
          >
            <option value="full_agent">Full Agent Pipeline</option>
            <option value="llm_rag_validator">LLM + RAG + Validator</option>
            <option value="llm_rag">LLM + RAG</option>
            <option value="llm_only">LLM Only (Baseline)</option>
          </select>

          <button
            onClick={handleRunBenchmark}
            disabled={isRunningBenchmark}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20 transition-all disabled:opacity-40"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningBenchmark ? 'animate-spin' : 'fill-slate-950'}`} />
            <span>{isRunningBenchmark ? 'Evaluating Suite...' : 'Run Benchmark'}</span>
          </button>

          <button
            onClick={handleRunAllComparisons}
            disabled={isRunningBenchmark}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-colors disabled:opacity-40"
            title="Runs all 4 pipeline modes sequentially"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Compare All Modes</span>
          </button>
        </div>
      </div>

      {/* If No Experiment Runs Exist */}
      {experiments.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-4 border border-slate-800 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200">No evaluation data available.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Run an experiment against the standard benchmark suite ({benchmarkDataset.length} SQL tasks) to populate this empirical MLOps dashboard.
            </p>
          </div>
          <button
            onClick={handleRunBenchmark}
            disabled={isRunningBenchmark}
            className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/25 transition-all"
          >
            Run Benchmark Suite Now
          </button>
        </div>
      ) : (
        <>
          {/* Latest Run Metric KPI Cards */}
          {latestRun && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Exact Match
                </span>
                <p className="text-2xl font-extrabold font-mono text-cyan-400">
                  {latestRun.exact_match_accuracy}%
                </p>
                <p className="text-[10px] text-slate-500">Across {latestRun.total_benchmark_queries} tests</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Execution Accuracy
                </span>
                <p className="text-2xl font-extrabold font-mono text-emerald-400">
                  {latestRun.execution_accuracy}%
                </p>
                <p className="text-[10px] text-slate-500">Result equivalence</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Repair Success Rate
                </span>
                <p className="text-2xl font-extrabold font-mono text-amber-400">
                  {latestRun.repair_success_rate}%
                </p>
                <p className="text-[10px] text-slate-500">Self-healing queries</p>
              </div>

              <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Average Latency
                </span>
                <p className="text-2xl font-extrabold font-mono text-purple-400">
                  {latestRun.average_latency_ms} ms
                </p>
                <p className="text-[10px] text-slate-500">p95: {latestRun.p95_latency_ms} ms</p>
              </div>
            </div>
          )}

          {/* Side-by-Side Mode Accuracy Comparison Chart */}
          {comparisonChartData.length > 0 && (
            <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Empirical Pipeline Mode Comparison</h3>
                    <p className="text-[11px] text-slate-400">Comparing Baseline vs RAG vs Validator vs Full Agentic System</p>
                  </div>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Exact Match %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Execution Accuracy %" fill="#34d399" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Schema Linking %" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Benchmark Test Case Results Table */}
          {latestRun && latestRun.detailed_results && (
            <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
              <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Latest Benchmark Run Breakdown ({latestRun.experiment_id} — {latestRun.pipeline_mode})
                </span>
                <span className="text-[10px] font-mono text-slate-400">{latestRun.timestamp}</span>
              </div>

              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-mono text-slate-500">ID</th>
                      <th className="py-2.5 px-4">Question</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-center">Exact Match</th>
                      <th className="py-2.5 px-4 text-center">Execution Match</th>
                      <th className="py-2.5 px-4 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {latestRun.detailed_results.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{item.id}</td>
                        <td className="py-2.5 px-4 text-slate-200 font-medium">{item.question}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">{item.category}</td>
                        <td className="py-2.5 px-4 text-center">
                          {item.exact_match ? (
                            <span className="text-emerald-400 font-bold">✓ PASS</span>
                          ) : (
                            <span className="text-slate-500 font-mono">DIFF</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {item.execution_match ? (
                            <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                              ✓ PASS
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/20">
                              FAIL
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-400">{item.latency_ms} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
