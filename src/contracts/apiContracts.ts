import { z } from 'zod';

// ============================================================================
// 1. Health Stats API Schemas (/api/health)
// ============================================================================
export const HealthStatsResponseSchema = z.object({
  status: z.enum(['online', 'degraded', 'offline']),
  framework: z.string(),
  mcpToolsCount: z.number(),
  vectorCount: z.number(),
  models: z.array(z.string()),
  cacheHitRatioPct: z.number(),
  timestamp: z.number(),
  persistenceMode: z.enum(['local', 'supabase']),
});

export type HealthStatsResponse = z.infer<typeof HealthStatsResponseSchema>;

// ============================================================================
// 2. Vector Store & Search API Schemas (/api/vectors, /api/vectors/search, /api/vectors/add)
// ============================================================================
export const VectorMetadataSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  nodeTitle: z.string().optional(),
  timestamp: z.number(),
  modality: z.enum(['text', 'code', 'vision', 'structured']),
  tokens: z.number().optional(),
});

export const VectorItemSchema = z.object({
  id: z.string(),
  embedding: z.array(z.number()),
  text: z.string(),
  metadata: VectorMetadataSchema,
  projection2D: z.tuple([z.number(), z.number()]),
});

export type VectorItemContract = z.infer<typeof VectorItemSchema>;

export const VectorSearchRequestSchema = z.object({
  query: z.string().min(1, 'Query string is required'),
  topK: z.number().min(1).max(50).optional().default(5),
});

export const VectorSearchResultItemSchema = z.object({
  item: VectorItemSchema,
  similarity: z.number(),
});

export const VectorSearchResponseSchema = z.object({
  query: z.string(),
  persistenceMode: z.enum(['local', 'supabase']),
  cacheResult: z.object({
    hit: z.boolean(),
    similarity: z.number(),
    distance: z.number(),
    latencyMs: z.number(),
  }).nullable(),
  results: z.array(VectorSearchResultItemSchema),
});

export type VectorSearchResponseContract = z.infer<typeof VectorSearchResponseSchema>;

export const VectorAddRequestSchema = z.object({
  text: z.string().min(1, 'Vector text required'),
  agentId: z.string().optional().default('orchestrator'),
  agentName: z.string().optional().default('Master Orchestrator Agent'),
  modality: z.enum(['text', 'code', 'vision', 'structured']).optional().default('text'),
  inputType: z.string().optional().default('Custom User Memory'),
});

// ============================================================================
// 3. Agent Loop Run API Schemas (/api/agent-loop/run)
// ============================================================================
export const AgentLoopRunRequestSchema = z.object({
  objective: z.string().min(1, 'Objective string cannot be empty'),
  model: z.enum(['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-pro-preview']).optional().default('gemini-3.7-flash'),
  maxSteps: z.number().min(1).max(20).optional().default(6),
});

// ============================================================================
// 4. MCP Tools API Schemas (/api/mcp/call)
// ============================================================================
export const McpCallRequestSchema = z.object({
  toolName: z.string().min(1, 'toolName is required'),
  arguments: z.record(z.string(), z.any()).optional().default({}),
});

export const McpCallResponseSchema = z.object({
  isError: z.boolean().optional(),
  content: z.array(z.object({
    type: z.string(),
    text: z.string(),
  })),
});
