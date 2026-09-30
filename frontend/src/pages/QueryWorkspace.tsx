import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Database, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  Zap, 
  Layers, 
  Clock, 
  Table as TableIcon,
  BarChart2,
  Columns
} from 'lucide-react';
import { 
  PipelineResult, 
  PipelineStage, 
  LLMProvider, 
  RiskAnalysis, 
  OptimizationResult, 
  ChartRecommendation 
} from '../types';
import { api } from '../services/api';
import { AgentWorkflow } from '../components/AgentWorkflow';
import { SqlEditor } from '../components/SqlEditor';
import { ResultTable } from '../components/ResultTable';
import { ChartRenderer } from '../components/ChartRenderer';
import { InsightPanel } from '../components/InsightPanel';
import { RiskBadge } from '../components/RiskBadge';
import { OptimizationPanel } from '../components/OptimizationPanel';
import { ConversationChat } from '../components/ConversationChat';

interface QueryWorkspaceProps {
  activeProvider: LLMProvider;
  dbType: string;
}

export const QueryWorkspace: React.FC<QueryWorkspaceProps> = ({
  activeProvider,
  dbType
}) => {
  const [question, setQuestion] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<PipelineStage>('idle');
  const [stageStatuses, setStageStatuses] = useState<Record<string, 'waiting' | 'processing' | 'completed' | 'failed'>>({
    schema_retrieval: 'waiting',
    sql_generation: 'waiting',
    validation: 'waiting',
    optimization: 'waiting',
    execution: 'waiting',
    analysis: 'waiting'
  });
  const [stageDetails, setStageDetails] = useState<Record<string, string>>({});
  
  // Results State
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [sql, setSql] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [explanationSteps, setExplanationSteps] = useState<string[]>([]);
  const [chartRecommendation, setChartRecommendation] = useState<ChartRecommendation | null>(null);
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [repaired, setRepaired] = useState(false);
  
  // View mode for results
  const [viewMode, setViewMode] = useState<'both' | 'chart' | 'table'>('both');
  
  // Conversational History
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sql?: string; timestamp: string }>>([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([
    "Show the top 5 customers by total spending",
    "Which city generated the highest revenue?",
    "Show monthly revenue for 2026",
    "What are the top 10 products by revenue?",
    "Find customers who haven't purchased in 90 days",
    "Which category has the highest average order value?"
  ]);

  useEffect(() => {
    api.getFullSchema()
      .then((schema) => {
        if (!schema || !schema.tables || schema.tables.length === 0) return;
        const tableNames = schema.tables.map((t) => t.name.toLowerCase());
        const isEcommerceDemo = tableNames.includes('customers') && tableNames.includes('orders');
        
        if (isEcommerceDemo) {
          setDynamicSuggestions([
            "Show the top 5 customers by total spending",
            "Which city generated the highest revenue?",
            "Show monthly revenue for 2026",
            "What are the top 10 products by revenue?",
            "Find customers who haven't purchased in 90 days",
            "Which category has the highest average order value?"
          ]);
        } else {
          // Generate contextual suggestions for custom tables
          const customSuggestions: string[] = [];
          for (const t of schema.tables.slice(0, 3)) {
            customSuggestions.push(`Show recent 10 records from ${t.name}`);
            customSuggestions.push(`Count total rows in ${t.name}`);
            const textCol = t.columns.find((c) => /char|text|varchar|string/i.test(c.type));
            const numCol = t.columns.find((c) => /int|float|decimal|numeric|double|real/i.test(c.type));
            if (textCol && numCol) {
              customSuggestions.push(`Show total ${numCol.name} grouped by ${textCol.name} in ${t.name}`);
            }
          }
          if (customSuggestions.length > 0) {
            setDynamicSuggestions(customSuggestions.slice(0, 6));
          }
        }
      })
      .catch((err) => console.error('Failed to load schema for dynamic suggestions:', err));
  }, [dbType]);

  const suggestions = dynamicSuggestions;

  const handleRunQuery = (qToRun?: string) => {
    const q = (qToRun || question).trim();
    if (!q || isRunning) return;

    setIsRunning(true);
    setErrorMessage(null);
    setRepaired(false);
    setCurrentStage('schema_retrieval');
    setStageStatuses({
      schema_retrieval: 'processing',
      sql_generation: 'waiting',
      validation: 'waiting',
      optimization: 'waiting',
      execution: 'waiting',
      analysis: 'waiting'
    });
    setStageDetails({});

    // Append to chat
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', content: q, timestamp: new Date().toLocaleTimeString() }
    ]);

    api.streamQuery(
      {
        question: q,
        provider: activeProvider,
        conversation_history: chatMessages.map((m) => ({ role: m.role, content: m.content }))
      },
      (eventType, data) => {
        // SSE Event Handlers
        if (eventType === 'schema_retrieval_started') {
          setCurrentStage('schema_retrieval');
          setStageStatuses((s) => ({ ...s, schema_retrieval: 'processing' }));
        } else if (eventType === 'schema_retrieval_completed') {
          setStageStatuses((s) => ({ ...s, schema_retrieval: 'completed' }));
          setStageDetails((d) => ({ ...d, schema_retrieval: `${data.relevant_tables?.length || 0} tables linked` }));
        } else if (eventType === 'sql_generation_started') {
          setCurrentStage('sql_generation');
          setStageStatuses((s) => ({ ...s, sql_generation: 'processing' }));
        } else if (eventType === 'sql_generation_completed') {
          setStageStatuses((s) => ({ ...s, sql_generation: 'completed' }));
          setSql(data.sql);
          setExplanationSteps(data.explanation_steps || []);
          setStageDetails((d) => ({ ...d, sql_generation: `${Math.round((data.confidence || 0.9) * 100)}% confidence` }));
        } else if (eventType === 'validation_started') {
          setCurrentStage('validation');
          setStageStatuses((s) => ({ ...s, validation: 'processing' }));
        } else if (eventType === 'validation_completed') {
          setStageStatuses((s) => ({ ...s, validation: data.valid ? 'completed' : 'failed' }));
          if (data.risk) setRisk(data.risk);
        } else if (eventType === 'repair_started') {
          setCurrentStage('repair');
          setRepaired(true);
        } else if (eventType === 'repair_completed') {
          if (data.repaired) {
            setSql(data.repaired_sql);
            setRepaired(true);
          }
        } else if (eventType === 'optimization_started') {
          setCurrentStage('optimization');
          setStageStatuses((s) => ({ ...s, optimization: 'processing' }));
        } else if (eventType === 'optimization_completed') {
          setStageStatuses((s) => ({ ...s, optimization: 'completed' }));
          setOptimization(data);
          if (data.improvement_pct > 0) {
            setStageDetails((d) => ({ ...d, optimization: `~${data.improvement_pct}% gain` }));
          }
        } else if (eventType === 'execution_started') {
          setCurrentStage('execution');
          setStageStatuses((s) => ({ ...s, execution: 'processing' }));
        } else if (eventType === 'execution_completed') {
          setStageStatuses((s) => ({ ...s, execution: data.success ? 'completed' : 'failed' }));
          if (!data.success && data.error) {
            setErrorMessage(data.error);
          }
          setStageDetails((d) => ({ ...d, execution: `${data.row_count || 0} rows (${data.execution_time_ms || 0}ms)` }));
        } else if (eventType === 'analysis_started') {
          setCurrentStage('analysis');
          setStageStatuses((s) => ({ ...s, analysis: 'processing' }));
        } else if (eventType === 'analysis_completed') {
          setStageStatuses((s) => ({ ...s, analysis: 'completed' }));
          setInsights(data.insights || []);
          setChartRecommendation(data.chart_recommendation);
        } else if (eventType === 'pipeline_completed') {
          setPipelineResult(data);
          setSql(data.sql);
          setColumns(data.columns || []);
          setRows(data.rows || []);
          setInsights(data.insights || []);
          setExplanationSteps(data.explanation_steps || []);
          setChartRecommendation(data.chart);
          setRisk(data.risk);
          setOptimization(data.optimization);
          setCurrentStage('completed');
          setIsRunning(false);

          // Append assistant response to chat
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.summary || `Generated query returning ${data.rows?.length || 0} records.`,
              sql: data.sql,
              timestamp: new Date().toLocaleTimeString()
            }
          ]);

          // Save to history automatically
          api.saveHistory({
            question: q,
            sql: data.sql,
            dialect: data.dialect,
            risk_level: data.risk?.level || 'LOW',
            execution_time_ms: data.execution?.execution_time_ms || 0,
            row_count: data.execution?.row_count || 0,
            status: data.execution?.success ? 'Success' : 'Failed',
            provider: activeProvider,
            repaired: data.repaired
          });
        }
      },
      (err) => {
        console.error('Pipeline error:', err);
        setErrorMessage(err.message || 'Pipeline execution encountered an error.');
        setCurrentStage('failed');
        setIsRunning(false);
      },
      () => {
        setIsRunning(false);
      }
    );
  };

  const handleManualExecute = async () => {
    if (!sql.trim() || isRunning) return;
    setIsRunning(true);
    setErrorMessage(null);
    try {
      const res = await api.executeSql(sql);
      setColumns(res.columns || []);
      setRows(res.rows || []);
      
      // Re-run analyst on new rows
      const analysis = await api.generateInsights({
        question: question || 'Manual Query Execution',
        columns: res.columns,
        rows: res.rows
      });
      setInsights(analysis.insights || []);
      setChartRecommendation(analysis.chart_recommendation);
    } catch (err: any) {
      setErrorMessage(err.message || 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleOptimizeQuery = async () => {
    if (!sql.trim()) return;
    try {
      const opt = await api.optimizeSql(sql);
      setOptimization(opt);
      setShowOptimizationPanel(true);
    } catch (e) {
      console.error('Optimization error:', e);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Question Input Card */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Natural Language Query Engine
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Provider: <strong className="text-cyan-400 uppercase">{activeProvider}</strong>
          </span>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
            disabled={isRunning}
            placeholder="Ask your database anything (e.g. 'Show top 5 customers by total spending')..."
            className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-cyan-400 rounded-2xl px-5 py-4 text-sm text-slate-100 outline-none pr-36 shadow-inner font-medium placeholder:text-slate-500 disabled:opacity-50"
          />
          <button
            onClick={() => handleRunQuery()}
            disabled={isRunning || !question.trim()}
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 flex items-center gap-1.5"
          >
            {isRunning ? (
              <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isRunning ? 'Processing...' : 'Generate SQL'}</span>
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500">Quick Prompt Suggestions:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(s);
                  handleRunQuery(s);
                }}
                disabled={isRunning}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800/80 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Agent Execution Workflow Visualizer */}
      <AgentWorkflow
        currentStage={currentStage}
        stageStatuses={stageStatuses}
        stageDetails={stageDetails}
        repaired={repaired}
      />

      {/* Error Banner if any */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-rose-300">SQL Execution Diagnostic Notice</p>
            <p className="text-rose-200/90 leading-relaxed font-mono">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* SQL Editor & Controls Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-200">Interactive SQL Workspace</h2>
            {risk && <RiskBadge risk={risk} />}
            {repaired && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300">
                <Wrench className="w-3 h-3 text-amber-400" />
                Auto-Repaired
              </span>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'both' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5 inline mr-1" />
              Both
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 inline mr-1" />
              Table
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'chart' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 inline mr-1" />
              Chart
            </button>
          </div>
        </div>

        {/* Monaco SQL Editor */}
        <SqlEditor
          sql={sql}
          onChange={setSql}
          onExecute={handleManualExecute}
          onOptimize={handleOptimizeQuery}
          isExecuting={isRunning}
          dialect={dbType}
        />
      </div>

      {/* Optimization Modal / Side-by-side Panel */}
      {showOptimizationPanel && optimization && (
        <OptimizationPanel
          optimization={optimization}
          onApplyOptimized={(optSql) => {
            setSql(optSql);
            setShowOptimizationPanel(false);
          }}
          onClose={() => setShowOptimizationPanel(false)}
        />
      )}

      {/* Results & Auto Visualization Grid */}
      {(columns.length > 0 || rows.length > 0) && (
        <div className="space-y-6">
          {/* Main Visual Data / Table Display */}
          {viewMode === 'both' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <ResultTable
                columns={columns}
                rows={rows}
                executionTimeMs={pipelineResult?.execution?.execution_time_ms || 0}
                question={question}
                sql={sql}
                riskLevel={risk?.level || 'LOW'}
                insights={insights}
              />
              {chartRecommendation && (
                <ChartRenderer recommendation={chartRecommendation} data={rows} />
              )}
            </div>
          ) : viewMode === 'table' ? (
            <ResultTable
              columns={columns}
              rows={rows}
              executionTimeMs={pipelineResult?.execution?.execution_time_ms || 0}
              question={question}
              sql={sql}
              riskLevel={risk?.level || 'LOW'}
              insights={insights}
            />
          ) : (
            chartRecommendation && (
              <ChartRenderer recommendation={chartRecommendation} data={rows} />
            )
          )}

          {/* AI Grounded Insights & Step Explanation & Chat Follow-up */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <InsightPanel
              insights={insights}
              explanationSteps={explanationSteps}
              summary={pipelineResult?.summary}
            />

            <ConversationChat
              messages={chatMessages}
              onSendMessage={(txt) => {
                setQuestion(txt);
                handleRunQuery(txt);
              }}
              isLoading={isRunning}
            />
          </div>
        </div>
      )}
    </div>
  );
};
