export type AgentId =
  | 'orchestrator'
  | 'summarizer'
  | 'vision'
  | 'code'
  | 'logic'
  | 'guardrail'
  | 'synthesizer'
  | 'researcher'
  | 'executor'
  | 'debugger';

export type Modality = 'text' | 'vision' | 'code' | 'structured';

export interface ExecutionProvenance {
  langfuseTraceId: string | null;
  langfuseSessionId?: string;
  timestamp: string;
}

export interface IMultiModalAgent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  supportedInputModalities: Modality[];
  supportedOutputModalities: Modality[];
  color: string;
  accentColor: string;
  iconName: string;
  status: 'active' | 'idle' | 'processing';
  totalExecutions: number;
  avgLatencyMs: number;
  confidenceHistory: number[];
}

export interface VectorItem {
  id: string;
  embedding: number[]; // 768 dimensions
  text: string;
  metadata: {
    agentId: AgentId;
    agentName: string;
    nodeTitle?: string;
    timestamp: number;
    modality: Modality;
    tokens?: number;
    prerequisiteVectorIds?: string[];
  };
  projection2D: [number, number]; // [x, y] coordinates in [-1, 1] space for 2D scatter map
}

export interface SemanticCacheResult {
  hit: boolean;
  similarity: number;
  distance: number;
  cachedVector?: VectorItem;
  latencyMs: number;
}

export interface AgentFeedbackReport {
  id: string;
  nodeId: string;
  agentId: AgentId;
  agentName: string;
  status: 'success' | 'partial' | 'failed' | 'rerouted';
  confidence: number; // 0.0 to 1.0
  alerts: string[];
  suggestedAction?: string;
  timestamp: number;
  latencyMs: number;
  tokensUsed: number;
}

export type DAGNodeStatus = 'idle' | 'pending' | 'running' | 'vector_indexing' | 'completed' | 'failed';

export interface DAGNode {
  id: string;
  title: string;
  agentId: AgentId;
  inputDescription: string;
  dependencies: string[]; // array of node IDs that must complete first
  status: DAGNodeStatus;
  payload?: {
    input?: string;
    output?: string;
    summary?: string;
    codeSnippet?: string;
    boundingTags?: string[];
    diagramAnalytics?: string;
    validationSchema?: string;
    metrics?: Record<string, any>;
  };
  vectorId?: string;
  latencyMs?: number;
  tokens?: number;
  feedback?: AgentFeedbackReport;
}

export interface DAGGraph {
  id: string;
  objective: string;
  nodes: DAGNode[];
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  totalTokens: number;
  totalLatencyMs: number;
  cacheHits: number;
}

export interface SystemStats {
  vectorCount: number;
  cacheHitRatio: number;
  totalQueries: number;
  averageLatencyMs: number;
  telemetryEventsCount: number;
}