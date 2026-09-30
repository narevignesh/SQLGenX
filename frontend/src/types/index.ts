export type LLMProvider = 'groq' | 'openai' | 'gemini' | 'fallback';

export type PipelineStage = 
  | 'idle'
  | 'schema_retrieval'
  | 'sql_generation'
  | 'validation'
  | 'repair'
  | 'optimization'
  | 'execution'
  | 'analysis'
  | 'completed'
  | 'failed';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  default?: string | null;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primary_keys: string[];
  foreign_keys: any[];
  row_count: number;
  description: string;
}

export interface RelationshipInfo {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  name: string;
}

export interface SchemaData {
  database_type: string;
  tables: TableInfo[];
  relationships: RelationshipInfo[];
  total_tables: number;
}

export interface RiskAnalysis {
  level: RiskLevel;
  confidence: number;
  probabilities: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
  };
  reasons: string[];
  feature_breakdown?: Record<string, { importance: number; value: number }>;
}

export interface OptimizationSuggestion {
  type: string;
  title: string;
  description: string;
}

export interface OptimizationResult {
  has_optimization: boolean;
  original_sql: string;
  optimized_sql: string;
  suggestions: OptimizationSuggestion[];
  estimated_cost_before: number;
  estimated_cost_after: number;
  improvement_percentage: number;
  raw_plan?: string;
}

export interface ChartRecommendation {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'kpi' | 'table';
  title: string;
  xAxisKey?: string;
  yAxisKeys?: string[];
  nameKey?: string;
  dataKey?: string;
  value?: number;
  label?: string;
  description?: string;
  columns?: string[];
}

export interface PipelineResult {
  question: string;
  sql: string;
  dialect: string;
  tables_used: string[];
  explanation_steps: string[];
  confidence: number;
  repaired: boolean;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    risk?: RiskAnalysis;
  };
  risk: RiskAnalysis;
  optimization: OptimizationResult;
  execution: {
    success: boolean;
    row_count: number;
    execution_time_ms: number;
    error?: string | null;
  };
  columns: string[];
  rows: Record<string, any>[];
  insights: string[];
  summary: string;
  chart: ChartRecommendation;
}

export interface HistoryRecord {
  id: string;
  question: string;
  sql: string;
  dialect: string;
  risk_level: RiskLevel;
  execution_time_ms: number;
  row_count: number;
  status: string;
  provider: string;
  repaired: boolean;
  timestamp: string;
}

export interface BenchmarkDetail {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  reference_sql: string;
  generated_sql: string;
  exact_match: boolean;
  execution_match: boolean;
  schema_linking_score: number;
  repaired: boolean;
  latency_ms: number;
  execution_error?: string | null;
}

export interface ExperimentRun {
  experiment_id: string;
  timestamp: string;
  pipeline_mode: string;
  provider: string;
  total_benchmark_queries: number;
  exact_match_accuracy: number;
  execution_accuracy: number;
  schema_linking_accuracy: number;
  repair_success_rate: number;
  average_latency_ms: number;
  p95_latency_ms: number;
  detailed_results: BenchmarkDetail[];
}
