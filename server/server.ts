import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { sharedVectorDB } from '../src/engine/vectorStore';
import { semanticCache } from '../src/engine/semanticCache';
import { INITIAL_AGENTS } from '../src/engine/agentRegistry';
import { executeAgentInference } from '../src/engine/geminiClient';
import { createGraphForObjective } from '../src/engine/dagOrchestrator';
import { mcpSDKClient } from '../src/mcp/nexusMcpClient';
import { dynamicAgentRunner } from '../src/engine/agentLoop';
import { frameworkEvaluator } from '../src/engine/evaluationEngine';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Zod Validation Schemas for Server Endpoints (Priority 4)
const AgentLoopRunSchema = z.object({
  objective: z.string().min(1, 'Objective string cannot be empty'),
  model: z.enum(['gemini-3.7-flash', 'gemini-3.1-pro-preview']).optional().default('gemini-3.7-flash'),
  maxSteps: z.number().min(1).max(20).optional().default(6),
});

const McpCallSchema = z.object({
  toolName: z.string().min(1, 'toolName is required'),
  arguments: z.record(z.any()).optional().default({}),
});

const VectorSearchSchema = z.object({
  query: z.string().min(1, 'Query string is required'),
  topK: z.number().min(1).max(50).optional().default(5),
});

const AgentExecuteSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  model: z.enum(['gemini-3.7-flash', 'gemini-3.1-pro-preview']).optional().default('gemini-3.7-flash'),
  prompt: z.string().min(1, 'prompt string is required'),
  imagePayload: z.string().optional(),
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const tools = await mcpSDKClient.listTools();
    res.json({
      status: 'online',
      framework: 'NexusMatrix Enterprise Multi-Modal Agent Orchestrator',
      mcpToolsCount: tools.length,
      vectorCount: sharedVectorDB.size(),
      models: ['gemini-3.7-flash', 'gemini-3.1-pro-preview'],
      cacheHitRatioPct: semanticCache.getCacheHitRatio(),
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// MCP Tools Discovery API
app.get('/api/mcp/tools', async (req, res) => {
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
    const validated = McpCallSchema.parse(req.body);
    const result = await mcpSDKClient.callTool(validated.toolName, validated.arguments);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid MCP call request' });
  }
});

// Dynamic Agent Decision Loop & Reflection API
app.post('/api/agent-loop/run', async (req, res) => {
  try {
    const validated = AgentLoopRunSchema.parse(req.body);
    const result = await dynamicAgentRunner.runDynamicLoop(validated.objective, {
      model: validated.model,
      maxSteps: validated.maxSteps,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Dynamic agent loop failed' });
  }
});

// Benchmark Evaluation API
app.post('/api/evaluation/run', async (req, res) => {
  try {
    const report = await frameworkEvaluator.runFullEvaluation();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Benchmark evaluation failed' });
  }
});

// Agent Registry API
app.get('/api/agents', (req, res) => {
  res.json(INITIAL_AGENTS);
});

// Vector DB Search Endpoint
app.post('/api/vectors/search', (req, res) => {
  try {
    const validated = VectorSearchSchema.parse(req.body);
    const results = sharedVectorDB.searchSimilar(validated.query, validated.topK);
    const cacheCheck = semanticCache.checkCache(validated.query);

    res.json({
      query: validated.query,
      cacheResult: cacheCheck,
      results: results.map((r) => ({
        id: r.item.id,
        text: r.item.text,
        similarity: parseFloat(r.similarity.toFixed(4)),
        metadata: r.item.metadata,
        projection2D: r.item.projection2D,
      })),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Execute Standalone Multi-Modal Agent API
app.post('/api/agents/execute', async (req, res) => {
  try {
    const validated = AgentExecuteSchema.parse(req.body);
    const result = await executeAgentInference(
      validated.agentId as any,
      validated.model,
      validated.prompt,
      undefined,
      validated.imagePayload
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

app.listen(PORT, () => {
  console.log(`⚡ NexusMatrix Master Server running on http://localhost:${PORT}`);
});
