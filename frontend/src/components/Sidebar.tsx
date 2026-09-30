import React from 'react';
import { 
  Sparkles, 
  Database, 
  Network, 
  History, 
  Activity, 
  Settings as SettingsIcon,
  Home,
  ChevronRight
} from 'lucide-react';

export type NavTab = 'landing' | 'workspace' | 'schema' | 'databases' | 'history' | 'mlops' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'landing' as NavTab, label: 'Overview', icon: Home, badge: '' },
    { id: 'workspace' as NavTab, label: 'AI Workspace', icon: Sparkles, badge: 'Agentic' },
    { id: 'schema' as NavTab, label: 'Schema ER Explorer', icon: Network, badge: '' },
    { id: 'databases' as NavTab, label: 'Databases', icon: Database, badge: '' },
    { id: 'history' as NavTab, label: 'Query History', icon: History, badge: '' },
    { id: 'mlops' as NavTab, label: 'MLOps & Benchmarks', icon: Activity, badge: 'Evaluation' },
    { id: 'settings' as NavTab, label: 'Settings', icon: SettingsIcon, badge: '' },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/80 flex flex-col justify-between p-4 shrink-0 select-none backdrop-blur-md">
      <div className="space-y-6 pt-1">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2.5">
            Platform Navigation
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-500/20 via-cyan-500/10 to-transparent text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-850 text-slate-400 border border-slate-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Database Specs Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              Active Engine
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Seeded with 1,000+ realistic e-commerce records & vectors indexed.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/60 text-center">
        <p className="text-[11px] text-slate-500 font-mono">
          SQLGenX Agent Core v1.0
        </p>
        <p className="text-[10px] text-slate-600">
          Powered by Multi-Agent & RAG
        </p>
      </div>
    </aside>
  );
};
