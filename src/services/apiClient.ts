import type { AgentLoopExecutionResult } from '../engine/agentLoop';
import type { ComprehensiveEvaluationReport } from '../engine/evaluationEngine';
import type { VectorItem, IMultiModalAgent, AgentId, ModelName, DAGGraph } from '../types';

const API_BASE_URL = typeof window !== 'undefined' && window.location ? (window.location.origin.includes('5173') ? 'http://localhost:3001' : '') : '';

export interface HealthStats {
  status: string;
  framework: string;
  mcpToolsCount: number;
  vectorCount: number;
  models: string[];
  cacheHitRatioPct: number;
  timestamp: number;
}

export const apiClient = {
  async getHealthStats(): Promise<HealthStats> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) throw new Error(`Health check HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('API getHealthStats fallback:', err);
      return {
        status: 'offline',
        framework: 'NexusMatrix Agent Framework',
        mcpToolsCount: 5,
        vectorCount: 12,
        models: ['gemini-3.7-flash', 'gemini-3.1-pro-preview'],
        cacheHitRatioPct: 88.5,
        timestamp: Date.now(),
      };
    }
  },

  async runAgentLoop(objective: string, model: ModelName = 'gemini-3.7-flash', maxSteps = 10): Promise<AgentLoopExecutionResult> {
    const res = await fetch(`${API_BASE_URL}/api/agent-loop/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective, model, maxSteps }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorBody.error || `Server HTTP error ${res.status}`);
    }
    return await res.json();
  },

  async runEvaluation(): Promise<ComprehensiveEvaluationReport> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorBody.error || `Evaluation HTTP error ${res.status}`);
    }
    return await res.json();
  },

  async executeAgent(
    agentId: AgentId,
    model: ModelName,
    prompt: string,
    imagePayload?: string
  ): Promise<{ text: string; tokens: number; latencyMs: number; isRealApi: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/agents/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, model, prompt, imagePayload }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorBody.error || `Execution HTTP error ${res.status}`);
    }
    return await res.json();
  },

  async getAgents(): Promise<IMultiModalAgent[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agents`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return [];
    }
  },

  async getAllVectors(): Promise<VectorItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/vectors`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return [];
    }
  },

  async searchVectors(query: string, topK = 6): Promise<{
    query: string;
    cacheResult: { hit: boolean; similarity: number; distance: number; latencyMs: number } | null;
    results: Array<{ item: VectorItem; similarity: number }>;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/vectors/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorBody.error || `Vector search HTTP error ${res.status}`);
    }
    return await res.json();
  },

  async addVector(text: string, agentId: string, agentName: string, modality: string, inputType: string): Promise<VectorItem> {
    const res = await fetch(`${API_BASE_URL}/api/vectors/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, agentId, agentName, modality, inputType }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
      throw new Error(errorBody.error || `Vector add HTTP error ${res.status}`);
    }
    return await res.json();
  },

  async clearVectors(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/vectors/clear`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async decomposeObjective(objective: string): Promise<DAGGraph> {
    const res = await fetch(`${API_BASE_URL}/api/orchestrate/decompose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective }),
    });
    if (!res.ok) throw new Error(`Decompose HTTP error ${res.status}`);
    return await res.json();
  },
};
