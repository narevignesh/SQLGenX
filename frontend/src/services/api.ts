import { 
  PipelineResult, 
  SchemaData, 
  HistoryRecord, 
  ExperimentRun, 
  RiskAnalysis, 
  OptimizationResult,
  LLMProvider
} from '../types';

const API_BASE = '/api';

export const api = {
  // 1. Query Execution & Agent Workflow Stream
  streamQuery: (
    params: {
      question: string;
      provider?: LLMProvider;
      model_name?: string;
      conversation_history?: Array<{ role: string; content: string }>;
      auto_execute?: boolean;
    },
    onEvent: (eventType: string, data: any) => void,
    onError: (error: any) => void,
    onComplete: () => void
  ) => {
    const controller = new AbortController();
    
    fetch(`${API_BASE}/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error('ReadableStream not supported');
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const block of lines) {
            if (!block.trim()) continue;
            let eventType = 'message';
            let dataStr = '';
            
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventType = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                dataStr += line.replace('data:', '').trim();
              }
            }
            
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                onEvent(eventType, parsed);
              } catch (e) {
                console.error('Error parsing SSE json:', e, dataStr);
              }
            }
          }
        }
        onComplete();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err);
        }
      });
      
    return () => controller.abort();
  },

  executeSql: async (sql: string, max_rows = 500) => {
    const res = await fetch(`${API_BASE}/query/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, max_rows }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Execution failed');
    }
    return res.json();
  },

  validateSql: async (sql: string) => {
    const res = await fetch(`${API_BASE}/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    return res.json();
  },

  optimizeSql: async (sql: string): Promise<OptimizationResult> => {
    const res = await fetch(`${API_BASE}/query/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    return res.json();
  },

  repairSql: async (broken_sql: string, error_message: string, question = '') => {
    const res = await fetch(`${API_BASE}/query/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ broken_sql, error_message, question }),
    });
    return res.json();
  },

  formatSql: async (sql: string): Promise<{ formatted_sql: string }> => {
    const res = await fetch(`${API_BASE}/query/format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    });
    return res.json();
  },

  // 2. Schema API
  getFullSchema: async (): Promise<SchemaData> => {
    const res = await fetch(`${API_BASE}/schema/full`);
    return res.json();
  },

  searchSchemaRAG: async (query: string, top_k = 5) => {
    const res = await fetch(`${API_BASE}/schema/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k }),
    });
    return res.json();
  },

  reindexSchema: async () => {
    const res = await fetch(`${API_BASE}/schema/reindex`, { method: 'POST' });
    return res.json();
  },

  // 3. Database Connection
  getDatabaseStatus: async () => {
    const res = await fetch(`${API_BASE}/database/status`);
    return res.json();
  },

  testDatabaseConnection: async (config: any) => {
    const res = await fetch(`${API_BASE}/database/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Connection test failed');
    }
    return res.json();
  },

  connectDatabase: async (config: any) => {
    const res = await fetch(`${API_BASE}/database/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Database connection failed');
    }
    return res.json();
  },

  seedDemoDatabase: async () => {
    const res = await fetch(`${API_BASE}/database/seed-demo`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to seed demo database');
    }
    return res.json();
  },

  // 4. Query History
  getHistory: async (): Promise<HistoryRecord[]> => {
    const res = await fetch(`${API_BASE}/history`);
    return res.json();
  },

  saveHistory: async (item: Partial<HistoryRecord>) => {
    const res = await fetch(`${API_BASE}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return res.json();
  },

  deleteHistoryItem: async (id: string) => {
    const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
    return res.json();
  },

  clearHistory: async () => {
    const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    return res.json();
  },

  // 5. MLOps & Benchmark
  getExperiments: async (): Promise<ExperimentRun[]> => {
    const res = await fetch(`${API_BASE}/mlops/experiments`);
    return res.json();
  },

  runBenchmark: async (pipeline_mode = 'full_agent', provider = 'fallback'): Promise<ExperimentRun> => {
    const res = await fetch(`${API_BASE}/mlops/run-benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_mode, provider }),
    });
    return res.json();
  },

  runAllComparisons: async (): Promise<ExperimentRun[]> => {
    const res = await fetch(`${API_BASE}/mlops/run-all-comparisons`, { method: 'POST' });
    return res.json();
  },

  generateInsights: async (data: { question: string; columns: string[]; rows: any[] }) => {
    const res = await fetch(`${API_BASE}/analytics/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to generate insights');
    return res.json();
  },

  // 6. Reports & Export
  exportPdfReport: async (data: any) => {
    const res = await fetch(`${API_BASE}/analytics/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('PDF export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SQLGenX_Intelligence_Report.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  exportCsv: async (data: { question: string; columns: string[]; rows: any[] }) => {
    const res = await fetch(`${API_BASE}/analytics/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('CSV export failed');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sqlgenx_query_result.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // 7. System Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  }
};
