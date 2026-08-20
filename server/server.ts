import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sharedVectorDB } from '../src/engine/vectorStore';
import { semanticCache } from '../src/engine/semanticCache';
import { INITIAL_AGENTS } from '../src/engine/agentRegistry';
import { executeAgentInference } from '../src/engine/geminiClient';
import { createGraphForObjective } from '../src/engine/dagOrchestrator';
import { mcpServer } from '../src/mcp/mcpServer';
import { mcpClient } from '../src/mcp/mcpClient';
import { dynamicAgentRunner } from '../src/engine/agentLoop';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    framework: 'NexusMatrix Enterprise Multi-Modal Agent Orchestrator',
    mcpToolsCount: mcpServer.listTools().length,
    vectorCount: sharedVectorDB.size(),
    models: ['gemini-3.7-flash', 'gemini-3.1-pro-preview'],
    cacheHitRatioPct: semanticCache.getCacheHitRatio(),
    timestamp: Date.now(),
  });
});

// MCP Tools Discovery API
app.get('/api/mcp/tools', (req, res) => {
  res.json(mcpServer.listTools());
});

// MCP Tool Execution API
app.post('/api/mcp/call', async (req, res) => {
  const { toolName, arguments: toolArgs } = req.body;
  if (!toolName) {
    return res.status(400).json({ error: 'toolName required' });
  }

  const result = await mcpClient.invokeTool(toolName, toolArgs || {});
  res.json(result);
});

// Dynamic Agent Decision Loop & Reflection API
app.post('/api/agent-loop/run', async (req, res) => {
  const { objective, model } = req.body;
  if (!objective) {
    return res.status(400).json({ error: 'Objective required' });
  }

  try {
    const result = await dynamicAgentRunner.runDynamicLoop(objective, model || 'gemini-3.7-flash');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Dynamic agent loop failed' });
  }
});

// Agent Registry API
app.get('/api/agents', (req, res) => {
  res.json(INITIAL_AGENTS);
});

// Vector DB Search Endpoint
app.post('/api/vectors/search', (req, res) => {
  const { query, topK } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  const results = sharedVectorDB.searchSimilar(query, topK || 5);
  const cacheCheck = semanticCache.checkCache(query);

  res.json({
    query,
    cacheResult: cacheCheck,
    results: results.map((r) => ({
      id: r.item.id,
      text: r.item.text,
      similarity: parseFloat(r.similarity.toFixed(4)),
      metadata: r.item.metadata,
      projection2D: r.item.projection2D,
    })),
  });
});

// Execute Standalone Multi-Modal Agent API
app.post('/api/agents/execute', async (req, res) => {
  const { agentId, model, prompt, imagePayload } = req.body;
  if (!agentId || !prompt) {
    return res.status(400).json({ error: 'agentId and prompt required' });
  }

  try {
    const result = await executeAgentInference(agentId, model || 'gemini-3.7-flash', prompt, undefined, imagePayload);
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
