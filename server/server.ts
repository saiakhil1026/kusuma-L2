import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { sharedVectorDB } from '../src/engine/vectorStore';
import { semanticCache } from '../src/engine/semanticCache';
import { INITIAL_AGENTS } from '../src/engine/agentRegistry';
import { executeAgentInference } from '../src/engine/geminiClient';
import { createGraphForObjective } from '../src/engine/dagOrchestrator';
import { mcpSDKClient } from '../src/mcp/nexusMcpClient';
import { dynamicAgentRunner } from '../src/engine/agentLoop';
import { frameworkEvaluator } from '../src/engine/evaluationEngine';
import { activeVectorRepository } from '../src/engine/supabaseClient';
import { executeStoreMemoryTool } from '../src/tools/storeMemoryTool';
import { executeVectorSearchTool } from '../src/tools/vectorSearchTool';
import { generateHashEmbedding } from '../src/engine/embeddings';
import {
  HealthStatsResponseSchema,
  VectorSearchRequestSchema,
  VectorSearchResponseSchema,
  VectorAddRequestSchema,
  AgentLoopRunRequestSchema,
  McpCallRequestSchema,
} from '../src/contracts/apiContracts';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Sliding-Window Rate Limiter Middleware (Mod4: API protection)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min per IP

app.use((req, res, next) => {
  const ip = (req.headers && (req.headers['x-forwarded-for'] as string)) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
  const now = Date.now();

  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  record.count++;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded (${MAX_REQUESTS_PER_WINDOW} requests/minute). Please slow down.`,
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
    });
    return;
  }

  next();
});

// JWT JWKS key set for Supabase token verification (C1: Real JWT Auth)
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
let jwksKeySet: ReturnType<typeof createRemoteJWKSet> | null = null;

if (SUPABASE_JWKS_URL) {
  try {
    jwksKeySet = createRemoteJWKSet(new URL(SUPABASE_JWKS_URL));
  } catch (err) {
    console.warn('[Auth] Invalid SUPABASE_JWKS_URL, JWT verification disabled:', err);
  }
}

// REST Authentication & Identity Middleware (C1: Genuine JWT Verification)
app.use(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ') && jwksKeySet) {
    const token = authHeader.substring(7);
    try {
      const { payload } = await jwtVerify(token, jwksKeySet, {
        issuer: SUPABASE_URL ? `${SUPABASE_URL}/auth/v1` : undefined,
      });

      // Extract user ID from JWT 'sub' claim (Supabase auth.uid())
      const userId = payload.sub;
      if (!userId) {
        throw new Error('JWT missing sub claim');
      }

      (req as any).user = {
        id: userId,
        role: (payload as any).role || 'authenticated',
        email: (payload as any).email || null,
        tokenExp: payload.exp,
      };
    } catch (err: any) {
      // JWT verification failed — treat as unauthenticated
      console.warn(`[Auth] JWT verification failed: ${err.message}`);
      (req as any).user = { id: null, role: 'anonymous', authError: err.message };
    }
  } else if (authHeader && authHeader.startsWith('Bearer ') && !jwksKeySet) {
    // JWKS not configured — log warning, assign anonymous
    console.warn('[Auth] Bearer token provided but SUPABASE_JWKS_URL not configured. Cannot verify JWT.');
    (req as any).user = { id: null, role: 'anonymous', authError: 'JWKS not configured' };
  } else {
    // No auth header — unauthenticated request
    (req as any).user = { id: null, role: 'anonymous' };
  }
  next();
});

// Health Check Endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const tools = await mcpSDKClient.listTools();
    const payload = HealthStatsResponseSchema.parse({
      status: 'online',
      framework: 'NexusMatrix Enterprise Multi-Modal Agent Orchestrator',
      mcpToolsCount: tools.length,
      vectorCount: sharedVectorDB.size(),
      models: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.1-pro-preview'],
      cacheHitRatioPct: semanticCache.getCacheHitRatio(),
      timestamp: Date.now(),
      persistenceMode: activeVectorRepository.mode,
    });
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// MCP Tools Discovery API
app.get('/api/mcp/tools', async (_req, res) => {
  try {
    const tools = await mcpSDKClient.listTools();
    res.json(tools);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// MCP Tool Execution API
app.post('/api/mcp/call', async (req, res) => {
  try {
    const validated = McpCallRequestSchema.parse(req.body);
    const result = await mcpSDKClient.callTool(validated.toolName, validated.arguments);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid MCP call request' });
  }
});

// Dynamic Agent Decision Loop & Reflection API
app.post('/api/agent-loop/run', async (req, res) => {
  try {
    const validated = AgentLoopRunRequestSchema.parse(req.body);
    const result = await dynamicAgentRunner.runDynamicLoop(validated.objective, {
      model: validated.model as any,
      maxSteps: validated.maxSteps,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Dynamic agent loop failed' });
  }
});

// Benchmark Evaluation API
app.post('/api/evaluation/run', async (_req, res) => {
  try {
    const report = await frameworkEvaluator.runFullEvaluation();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Benchmark evaluation failed' });
  }
});

// Agent Registry API
app.get('/api/agents', (_req, res) => {
  res.json(INITIAL_AGENTS);
});

// Vector DB API Endpoints with Canonical Contract Validation (Issue 10)
app.get('/api/vectors', (_req, res) => {
  res.json(sharedVectorDB.getAllVectors());
});

app.post('/api/vectors/search', async (req, res) => {
  try {
    const validated = VectorSearchRequestSchema.parse(req.body);
    const userId = (req as any).user?.id || 'tenant_default_user';
    const searchRes = await executeVectorSearchTool({ query: validated.query, topK: validated.topK }, userId);
    const cacheCheck = semanticCache.checkCache(validated.query);

    const results = searchRes.topMatches.map((m) => {
      const item = sharedVectorDB.getVectorById(m.id) || {
        id: m.id,
        embedding: generateHashEmbedding(m.snippet),
        text: m.snippet,
        metadata: {
          agentId: 'orchestrator' as any,
          agentName: m.agent,
          timestamp: Date.now(),
          modality: (m.modality as any) || 'text',
        },
        projection2D: [0.1, 0.1] as [number, number],
      };
      return { item, similarity: m.similarity };
    });

    const responseData = VectorSearchResponseSchema.parse({
      query: validated.query,
      persistenceMode: activeVectorRepository.mode,
      cacheResult: {
        hit: cacheCheck.hit,
        similarity: cacheCheck.similarity,
        distance: cacheCheck.distance,
        latencyMs: cacheCheck.latencyMs,
      },
      results,
    });

    res.json(responseData);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/vectors/add', async (req, res) => {
  try {
    const validated = VectorAddRequestSchema.parse(req.body);
    const userId = (req as any).user?.id || 'tenant_default_user';

    const storeRes = await executeStoreMemoryTool(
      {
        text: validated.text,
        agentId: validated.agentId,
        modality: validated.modality as any,
        nodeTitle: validated.inputType,
      },
      userId
    );

    if (storeRes.isError) {
      return res.status(400).json({ error: storeRes.error });
    }

    const newItem = sharedVectorDB.getVectorById(storeRes.vectorId || '') || sharedVectorDB.addVector(
      validated.text,
      validated.agentId as any,
      validated.agentName,
      validated.modality as any,
      validated.inputType
    );

    res.json(newItem);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/vectors/clear', (_req, res) => {
  sharedVectorDB.clearNonSeedVectors();
  res.json({ success: true, remaining: sharedVectorDB.size() });
});

// Execute Standalone Multi-Modal Agent API
app.post('/api/agents/execute', async (req, res) => {
  try {
    const { agentId, model, prompt, imagePayload } = req.body;
    const result = await executeAgentInference(
      agentId,
      model,
      String(prompt || ''),
      undefined,
      imagePayload
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

// Decompose Objective into DAG API
app.post('/api/orchestrate/decompose', (req, res) => {
  const { objective } = req.body;
  if (!objective) {
    return res.status(400).json({ error: 'Objective string required' });
  }

  const graph = createGraphForObjective(objective);
  res.json(graph);
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`⚡ NexusMatrix Master Server running on http://localhost:${PORT}`);
  });
}
