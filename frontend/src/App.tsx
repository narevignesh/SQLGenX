import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { Landing } from './pages/Landing';
import { QueryWorkspace } from './pages/QueryWorkspace';
import { SchemaExplorer } from './pages/SchemaExplorer';
import { Databases } from './pages/Databases';
import { QueryHistory } from './pages/QueryHistory';
import { MLOps } from './pages/MLOps';
import { Settings } from './pages/Settings';
import { LLMProvider } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('workspace');
  const [activeProvider, setActiveProvider] = useState<LLMProvider>('groq');
  const [dbType, setDbType] = useState<string>('sqlite');
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      const res = await api.getDatabaseStatus();
      setDbType(res.db_type || 'sqlite');
      setIsDbConnected(res.is_connected !== false);
    } catch (e) {
      console.error('Failed to get status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        activeProvider={activeProvider}
        onProviderChange={setActiveProvider}
        dbType={dbType}
        isDbConnected={isDbConnected}
        onNavigateToDb={() => setCurrentTab('databases')}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
        />

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 max-w-7xl mx-auto w-full">
          {currentTab === 'landing' && (
            <Landing
              onLaunchWorkspace={() => setCurrentTab('workspace')}
              onExploreSchema={() => setCurrentTab('schema')}
              onViewMLOps={() => setCurrentTab('mlops')}
            />
          )}

          {currentTab === 'workspace' && (
            <QueryWorkspace
              activeProvider={activeProvider}
              dbType={dbType}
            />
          )}

          {currentTab === 'schema' && (
            <SchemaExplorer />
          )}

          {currentTab === 'databases' && (
            <Databases
              currentDbType={dbType}
              onRefreshSchema={fetchStatus}
            />
          )}

          {currentTab === 'history' && (
            <QueryHistory
              onRerunQuery={(q) => {
                setCurrentTab('workspace');
              }}
            />
          )}

          {currentTab === 'mlops' && (
            <MLOps />
          )}

          {currentTab === 'settings' && (
            <Settings
              activeProvider={activeProvider}
              onProviderChange={setActiveProvider}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
