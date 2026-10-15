import type { IMultiModalAgent } from '../types';

export const INITIAL_AGENTS: IMultiModalAgent[] = [
  {
    id: 'orchestrator',
    name: 'Master Orchestrator Agent',
    role: 'DAG Objective Decomposition & Topology Planning',
    description: 'Decomposes complex objectives into dependency-linked DAG sub-task graphs for specialized agent execution.',
    supportedInputModalities: ['text', 'structured'],
    supportedOutputModalities: ['structured'],
    color: 'from-cyan-500 to-blue-600',
    accentColor: '#06b6d4',
    iconName: 'Network',
    status: 'idle',
    totalExecutions: 24,
    avgLatencyMs: 145,
    confidenceHistory: [0.98, 0.99, 0.95, 0.97, 0.99],
  },
  {
    id: 'summarizer',
    name: 'Text Summarizer Agent',
    role: 'High-Density Document Compression & Abstraction',
    description: 'Compresses long-form technical documents and specification text into structured, high-density bulleted synopses.',
    supportedInputModalities: ['text'],
    supportedOutputModalities: ['text', 'structured'],
    color: 'from-blue-500 to-indigo-600',
    accentColor: '#3b82f6',
    iconName: 'FileText',
    status: 'idle',
    totalExecutions: 42,
    avgLatencyMs: 110,
    confidenceHistory: [0.94, 0.96, 0.97, 0.95, 0.98],
  },
  {
    id: 'vision',
    name: 'Vision & Image Captioner Agent',
    role: 'Spatial Scene & Architecture Diagram Analytics',
    description: 'Parses images, UI mockups, and visual architecture diagrams into bounding box tags and visual element hierarchies.',
    supportedInputModalities: ['vision', 'text'],
    supportedOutputModalities: ['structured', 'text'],
    color: 'from-amber-500 to-orange-600',
    accentColor: '#f59e0b',
    iconName: 'Eye',
    status: 'idle',
    totalExecutions: 19,
    avgLatencyMs: 230,
    confidenceHistory: [0.92, 0.95, 0.91, 0.96, 0.94],
  },
  {
    id: 'code',
    name: 'Code Assistant Agent',
    role: 'TypeScript/Python Code Generation & Refactoring',
    description: 'Generates type-safe, non-blocking TypeScript and Python components with 100% static analysis verification.',
    supportedInputModalities: ['code', 'text', 'structured'],
    supportedOutputModalities: ['code', 'text'],
    color: 'from-emerald-500 to-teal-600',
    accentColor: '#10b981',
    iconName: 'Code2',
    status: 'idle',
    totalExecutions: 58,
    avgLatencyMs: 310,
    confidenceHistory: [0.99, 0.98, 0.97, 0.99, 1.0],
  },
  {
    id: 'logic',
    name: 'Deep Logic Reasoning Agent',
    role: 'Algorithmic Proofs & System Architecture Audit',
    description: 'Solves complex mathematical formulas, formal verification, vector space proofs, and system design tradeoffs.',
    supportedInputModalities: ['text', 'code', 'structured'],
    supportedOutputModalities: ['text', 'structured'],
    color: 'from-purple-500 to-indigo-600',
    accentColor: '#8b5cf6',
    iconName: 'BrainCircuit',
    status: 'idle',
    totalExecutions: 35,
    avgLatencyMs: 290,
    confidenceHistory: [0.96, 0.97, 0.99, 0.98, 0.96],
  },
  {
    id: 'guardrail',
    name: 'Guardrail & Data Validator Agent',
    role: 'Zero-Trust Safety Protocol & Schema Validator',
    description: 'Enforces zero-trust safety rules, sanitizes input parameters, and verifies schema integrity before final delivery.',
    supportedInputModalities: ['text', 'code', 'structured'],
    supportedOutputModalities: ['structured'],
    color: 'from-rose-500 to-pink-600',
    accentColor: '#f43f5e',
    iconName: 'ShieldCheck',
    status: 'idle',
    totalExecutions: 67,
    avgLatencyMs: 85,
    confidenceHistory: [1.0, 0.99, 1.0, 0.98, 1.0],
  },
  {
    id: 'synthesizer',
    name: 'Executive Synthesizer Agent',
    role: 'Multi-Agent Deliverable Consolidation Report',
    description: 'Merges multi-agent deliverables, vector DB insights, and code outputs into unified executive reports.',
    supportedInputModalities: ['text', 'code', 'structured', 'vision'],
    supportedOutputModalities: ['text', 'structured'],
    color: 'from-violet-500 to-purple-600',
    accentColor: '#a855f7',
    iconName: 'Layers',
    status: 'idle',
    totalExecutions: 31,
    avgLatencyMs: 160,
    confidenceHistory: [0.97, 0.98, 0.96, 0.99, 0.98],
  },
  {
    id: 'researcher',
    name: 'Empirical Research & Fact Grounding Agent',
    role: 'Web Search & Factual Citations Grounding',
    description: 'Executes live web search and verifies source citations to ground agent reasoning with empirical external evidence.',
    supportedInputModalities: ['text', 'structured'],
    supportedOutputModalities: ['text', 'structured'],
    color: 'from-amber-400 to-yellow-600',
    accentColor: '#f59e0b',
    iconName: 'Globe',
    status: 'idle',
    totalExecutions: 28,
    avgLatencyMs: 190,
    confidenceHistory: [0.96, 0.98, 0.97, 0.99, 0.99],
  },
  {
    id: 'executor',
    name: 'Sandbox Code Execution & Test Agent',
    role: 'Runtime Sandbox Code Execution & Verification',
    description: 'Executes synthesized code in a safe sandbox, captures standard output, and validates unit test assertions.',
    supportedInputModalities: ['code', 'text'],
    supportedOutputModalities: ['structured', 'text'],
    color: 'from-emerald-400 to-green-600',
    accentColor: '#10b981',
    iconName: 'Terminal',
    status: 'idle',
    totalExecutions: 45,
    avgLatencyMs: 95,
    confidenceHistory: [1.0, 0.99, 0.98, 1.0, 1.0],
  },
  {
    id: 'debugger',
    name: 'Log Analysis & Root Cause Triage Agent',
    role: 'Error Trace Triage & Bug Diagnosis',
    description: 'Analyzes failed execution traces and system error logs to isolate root causes and formulate corrective action plans.',
    supportedInputModalities: ['text', 'code'],
    supportedOutputModalities: ['structured', 'text'],
    color: 'from-rose-500 to-red-600',
    accentColor: '#f43f5e',
    iconName: 'Bug',
    status: 'idle',
    totalExecutions: 22,
    avgLatencyMs: 175,
    confidenceHistory: [0.93, 0.95, 0.96, 0.98, 0.97],
  },
];

export class AgentRegistry {
  private agents: Map<string, IMultiModalAgent> = new Map();

  constructor() {
    INITIAL_AGENTS.forEach((agent) => this.agents.set(agent.id, { ...agent }));
  }

  public getAgent(id: string): IMultiModalAgent | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(): IMultiModalAgent[] {
    return Array.from(this.agents.values());
  }

  public updateAgentStatus(id: string, status: 'active' | 'idle' | 'processing', latencyMs?: number, confidence?: number) {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.status = status;
    if (status === 'idle' && latencyMs !== undefined) {
      agent.totalExecutions += 1;
      agent.avgLatencyMs = Math.round((agent.avgLatencyMs * 0.8) + (latencyMs * 0.2));
      if (confidence !== undefined) {
        agent.confidenceHistory = [...agent.confidenceHistory.slice(-4), confidence];
      }
    }
  }
}

export const agentRegistry = new AgentRegistry();