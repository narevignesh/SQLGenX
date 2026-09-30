import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { ChartRecommendation } from '../types';
import { TrendingUp, BarChart2, PieChart as PieIcon, LineChart as LineIcon, Activity } from 'lucide-react';

const PALETTE = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#22d3ee', '#ec4899'];

interface ChartRendererProps {
  recommendation: ChartRecommendation;
  data: Record<string, any>[];
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ recommendation, data }) => {
  const [activeType, setActiveType] = useState<string>(recommendation.type || 'bar');

  if (!data || data.length === 0) return null;

  // Custom Dark Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3.5 rounded-2xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 min-w-[160px]">
          <p className="font-bold text-white border-b border-slate-800 pb-1 font-mono">{label || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // KPI Card View
  if (recommendation.type === 'kpi') {
    return (
      <div className="glass-panel rounded-3xl p-8 flex flex-col justify-center items-center text-center space-y-3 border border-slate-800 shadow-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95">
        <div className="p-4 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/10">
          <TrendingUp className="w-8 h-8" />
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold font-mono">{recommendation.title}</p>
        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 font-mono tracking-tight">
          {typeof recommendation.value === 'number' ? recommendation.value.toLocaleString() : recommendation.value}
        </p>
        <p className="text-xs text-slate-400 max-w-sm">{recommendation.label}</p>
      </div>
    );
  }

  const xAxisKey = recommendation.xAxisKey || Object.keys(data[0] || {})[0];
  const yAxisKeys = recommendation.yAxisKeys && recommendation.yAxisKeys.length > 0 
    ? recommendation.yAxisKeys 
    : [Object.keys(data[0] || {}).find(k => k !== xAxisKey && typeof data[0][k] === 'number') || Object.keys(data[0] || {})[1] || 'value'];

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5 bg-gradient-to-b from-slate-900/90 to-slate-950/95">
      {/* Header & Interactive Visualizer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{recommendation.title}</h3>
            {recommendation.description && (
              <p className="text-xs text-slate-400">{recommendation.description}</p>
            )}
          </div>
        </div>

        {/* Real-Time Chart Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeType === 'bar'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setActiveType('line')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeType === 'line'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" />
            <span>Line</span>
          </button>
          <button
            onClick={() => setActiveType('area')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeType === 'area'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Area</span>
          </button>
          <button
            onClick={() => setActiveType('pie')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all ${
              activeType === 'pie'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Pie</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeType === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="barGradient0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8}/>
                </linearGradient>
                <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey={xAxisKey} 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                angle={-15}
                textAnchor="end"
                fontFamily="monospace"
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'monospace' }} />
              {yAxisKeys.map((key, i) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  fill={`url(#barGradient${i % 2})`}
                  radius={[8, 8, 0, 0]} 
                />
              ))}
            </BarChart>
          ) : activeType === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'monospace' }} />
              {yAxisKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={PALETTE[i % PALETTE.length]}
                  strokeWidth={3}
                  dot={{ r: 5, fill: PALETTE[i % PALETTE.length], stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 7, stroke: '#38bdf8', strokeWidth: 3 }}
                />
              ))}
            </LineChart>
          ) : activeType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45}/>
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} fontFamily="monospace" />
              <Tooltip content={<CustomTooltip />} />
              {yAxisKeys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaGradient)"
                />
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey={yAxisKeys[0] || 'value'}
                nameKey={xAxisKey || 'name'}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={4}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'monospace' }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
