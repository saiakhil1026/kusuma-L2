import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Network, Zap, CheckCircle2, Cpu, Upload, Database, X, ShieldCheck, Sparkles, CheckSquare } from 'lucide-react';
import type { DAGGraph, DAGNode } from '../types';
import { PRESET_OBJECTIVES, createGraphForObjective, dagRunner } from '../engine/dagOrchestrator';
import { INITIAL_AGENTS } from '../engine/agentRegistry';
import { sharedVectorDB } from '../engine/vectorStore';
import { dynamicAgentRunner } from '../engine/agentLoop';
import type { AgentLoopExecutionResult } from '../engine/agentLoop';

export const DAGCanvas: React.FC = () => {
  const [objectiveInput, setObjectiveInput] = useState(PRESET_OBJECTIVES[0].objective);
  const [graph, setGraph] = useState<DAGGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_OBJECTIVES[0].id);
  const [sampleImagePayload, setSampleImagePayload] = useState<string | undefined>(undefined);
  const [isExecuting, setIsExecuting] = useState(false);

  // New Mode: Dynamic MCP Tool Choice Action Loop
  const [executionMode, setExecutionMode] = useState<'mcp_loop' | 'dag_topology'>('mcp_loop');
  const [loopResult, setLoopResult] = useState<AgentLoopExecutionResult | null>(null);

  useEffect(() => {
    const initialGraph = createGraphForObjective(objectiveInput);
    dagRunner.setGraph(initialGraph);

    const unsubscribe = dagRunner.subscribe({
      onGraphUpdate: (updatedGraph) => {
        setGraph(updatedGraph);
        setIsExecuting(updatedGraph.status === 'running');
        if (selectedNode) {
          const freshNode = updatedGraph.nodes.find((n) => n.id === selectedNode.id);
          if (freshNode) setSelectedNode(freshNode);
        }
      },
      onTelemetryEmit: () => {},
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_OBJECTIVES.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPresetId(preset.id);
      setObjectiveInput(preset.objective);
      const newGraph = createGraphForObjective(preset.objective);
      dagRunner.setGraph(newGraph);
      setSelectedNode(null);
      setLoopResult(null);
    }
  };

  const handleCreateCustomObjective = () => {
    if (!objectiveInput.trim()) return;
    const newGraph = createGraphForObjective(objectiveInput.trim());
    dagRunner.setGraph(newGraph);
    setSelectedNode(null);
    setLoopResult(null);
  };

  const handleRunExecution = async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    if (executionMode === 'mcp_loop') {
      const res = await dynamicAgentRunner.runDynamicLoop(objectiveInput);
      setLoopResult(res);
      setIsExecuting(false);
    } else {
      if (graph) {
        await dagRunner.executeGraph(sampleImagePayload);
      }
      setIsExecuting(false);
    }
  };

  const handleResetGraph = () => {
    dagRunner.resetCurrentGraph();
    setSelectedNode(null);
    setLoopResult(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSampleImagePayload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getNodeAgent = (agentId: string) => {
    return INITIAL_AGENTS.find((a) => a.id === agentId);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'idle':
        return 'bg-slate-900/80 text-slate-400 border-slate-700';
      case 'pending':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40 animate-pulse';
      case 'running':
        return 'bg-cyan-950/90 text-cyan-300 border-cyan-400 glow-cyan animate-pulse';
      case 'vector_indexing':
        return 'bg-purple-950/90 text-purple-300 border-purple-400 glow-purple';
      case 'completed':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'failed':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      
      {/* Objective Control Bar */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-cyan-950 p-2.5 border border-cyan-500/40 shadow-inner">
              <Network className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-mono text-base font-bold text-white flex items-center space-x-2">
                <span>Agent Orchestration Canvas</span>
                <span className="rounded-md bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/30">
                  MCP Tool Discovery
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Dynamic LLM tool choice loop (`decide` $\rightarrow$ `MCP tool` $\rightarrow$ `observation` $\rightarrow$ `reflection pass`).
              </p>
            </div>
          </div>

          {/* Mode & Preset Controls */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl bg-nexus-900 p-1 border border-indigo-500/30">
              <button
                onClick={() => setExecutionMode('mcp_loop')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  executionMode === 'mcp_loop'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dynamic MCP Loop
              </button>
              <button
                onClick={() => setExecutionMode('dag_topology')}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  executionMode === 'dag_topology'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DAG Topology
              </button>
            </div>

            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              disabled={isExecuting}
              className="rounded-xl border border-indigo-500/30 bg-nexus-900 px-3 py-1.5 text-cyan-300 text-xs focus:border-cyan-400 focus:outline-none"
            >
              {PRESET_OBJECTIVES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt Input Box & Execution Controls */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <textarea
              rows={2}
              value={objectiveInput}
              onChange={(e) => setObjectiveInput(e.target.value)}
              disabled={isExecuting}
              placeholder="Enter high-level engineering objective..."
              className="w-full rounded-xl border border-indigo-500/30 bg-nexus-900/90 px-4 py-2.5 font-sans text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCreateCustomObjective}
              disabled={isExecuting}
              className="rounded-xl border border-indigo-700/50 bg-indigo-950 px-3.5 py-2.5 text-xs font-mono text-indigo-200 hover:bg-indigo-900 transition-colors"
            >
              Set Objective
            </button>

            <button
              onClick={handleRunExecution}
              disabled={isExecuting}
              className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
                isExecuting
                  ? 'bg-cyan-700 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 shadow-cyan-500/25 glow-cyan'
              }`}
            >
              {isExecuting ? (
                <>
                  <Zap className="h-4 w-4 text-cyan-300 animate-spin" />
                  <span>Executing Agent...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Run Execution</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetGraph}
              disabled={isExecuting}
              className="rounded-xl border border-slate-700/60 bg-slate-900 p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Reset Canvas"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Vision Attachment Upload bar */}
        <div className="flex items-center justify-between border-t border-indigo-950 pt-3 text-xs">
          <div className="flex items-center space-x-3 text-slate-400">
            <span className="font-mono text-[11px]">Vision Sub-task Image Context:</span>
            <label className="flex items-center space-x-1.5 cursor-pointer rounded-lg bg-nexus-900 px-2.5 py-1 border border-indigo-500/20 hover:border-cyan-500/40 text-cyan-300">
              <Upload className="h-3.5 w-3.5" />
              <span>{sampleImagePayload ? 'Image Attached' : 'Attach Diagram / Wireframe'}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {sampleImagePayload && (
              <button
                onClick={() => setSampleImagePayload(undefined)}
                className="text-rose-400 hover:underline text-[11px]"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic MCP Action Loop View */}
      {executionMode === 'mcp_loop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Action Loop Steps Stream (8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4 tech-grid-pattern">
            <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  Dynamic MCP Model Tool Choice Action Stream
                </h3>
              </div>
              <span className="font-mono text-xs text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded bg-indigo-950">
                5 Registered MCP Tools
              </span>
            </div>

            {loopResult ? (
              <div className="space-y-4">
                {loopResult.steps.map((step) => (
                  <div
                    key={step.stepIndex}
                    className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 space-y-2 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-cyan-950 px-2 py-0.5 text-cyan-300 font-bold border border-cyan-500/30">
                          Step #{step.stepIndex}
                        </span>
                        {step.toolName && (
                          <span className="rounded bg-purple-950 px-2 py-0.5 text-purple-300 font-bold border border-purple-500/30">
                            Tool: {step.toolName}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400">{step.latencyMs} ms</span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      💡 <strong>Thought:</strong> {step.thought}
                    </p>

                    {step.observation && (
                      <div className="space-y-1 pt-1">
                        <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest block">
                          Captured Observation Result
                        </span>
                        <div className="rounded-lg border border-indigo-950 bg-nexus-950 p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {step.observation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Final Grounded Deliverable Payload */}
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Consolidated Grounded Output</span>
                    </span>
                    <span className="text-emerald-300 font-bold">
                      {loopResult.totalLatencyMs} ms | {loopResult.totalTokens} Tokens
                    </span>
                  </div>
                  <div className="rounded-lg border border-emerald-950 bg-nexus-950 p-3 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {loopResult.finalAnswer}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-3 font-mono text-xs">
                <Cpu className="h-10 w-10 text-slate-700 animate-pulse" />
                <p>Click "Run Execution" above to trigger the dynamic MCP tool choice loop.</p>
              </div>
            )}
          </div>

          {/* Reflection Audit Inspector (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-indigo-950 pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                Evidence Reflection Audit Pass
              </h3>
            </div>

            {loopResult?.reflectionVerdict ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center space-x-1">
                      <CheckSquare className="h-4 w-4" />
                      <span>Audit Verdict: PASSED</span>
                    </span>
                    <span className="text-emerald-300 font-bold">
                      {(loopResult.reflectionVerdict.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {loopResult.reflectionVerdict.auditNotes}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase">Observation Ledger Size</span>
                  <div className="rounded-lg bg-nexus-900 p-2.5 text-cyan-300 font-bold">
                    {loopResult.observations.length} Captured MCP Tool Call Observations
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                Reflection verification audit results will appear here after loop execution.
              </div>
            )}
          </div>

        </div>
      )}

      {/* DAG Graph Interactive Visualizer */}
      {executionMode === 'dag_topology' && graph && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visual Topology Canvas */}
          <div className="lg:col-span-2 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl min-h-[480px] flex flex-col justify-between relative overflow-hidden tech-grid-pattern">
            
            <div className="flex items-center justify-between mb-4 z-10">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  DAG Topological Node Execution Map
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Status: <strong className="text-cyan-300 capitalize">{graph.status}</strong>
              </span>
            </div>

            {/* Nodes Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto relative z-10">
              {graph.nodes.map((node, idx) => {
                const agent = getNodeAgent(node.agentId);
                const isSelected = selectedNode?.id === node.id;
                const isModelFlash = node.model === 'gemini-3.7-flash';

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`group relative rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-nexus-900 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'glass-card hover:bg-nexus-900/90'
                    }`}
                  >
                    {/* Node Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          N{idx + 1}
                        </span>
                        <h4 className="font-sans text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {node.title}
                        </h4>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold border ${getStatusBadgeClass(
                          node.status
                        )}`}
                      >
                        {node.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Agent & Model Tag */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-3">
                      <span className="text-indigo-300 truncate max-w-[150px]">{agent?.name}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                          isModelFlash
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {node.model}
                      </span>
                    </div>

                    {/* Input Summary */}
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {node.inputDescription}
                    </p>

                    {/* Node Footer Execution Telemetry */}
                    <div className="flex items-center justify-between border-t border-indigo-950 pt-2 font-mono text-[10px] text-slate-500">
                      <span>
                        Deps: {node.dependencies.length > 0 ? node.dependencies.join(', ') : 'Root'}
                      </span>

                      {node.status === 'completed' && (
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <span>{node.latencyMs}ms</span>
                          <span>|</span>
                          <span>{node.tokens} tok</span>
                        </div>
                      )}
                    </div>

                    {/* Selection Arrow indicator */}
                    {isSelected && (
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-4 w-4 bg-cyan-400 rotate-45 rounded-sm" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Info Bar */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-indigo-950/60 pt-3 z-10">
              <span>Click any node to inspect raw outputs & vector embeddings</span>
              <span className="text-cyan-400">Interactive DAG Topology v3.7</span>
            </div>
          </div>

          {/* Node Inspector Drawer / Sidebar */}
          <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-4 overflow-y-auto max-h-[560px] pr-1">
                {/* Node Title & Status */}
                <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
                  <div>
                    <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest">
                      Node Telemetry Inspector
                    </span>
                    <h3 className="font-bold text-sm text-white">{selectedNode.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Assigned Agent Card */}
                {(() => {
                  const agent = getNodeAgent(selectedNode.agentId);
                  return (
                    <div className="rounded-xl border border-indigo-500/20 bg-nexus-900/90 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {agent?.name}
                        </span>
                        <span className="rounded bg-purple-950 px-2 py-0.5 font-mono text-[10px] text-purple-300 border border-purple-500/30">
                          {selectedNode.model}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{agent?.role}</p>
                    </div>
                  );
                })()}

                {/* Inter-Agent Feedback Report */}
                {selectedNode.feedback && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Agent Feedback Telemetry</span>
                      </span>
                      <span className="text-emerald-300 font-bold">
                        Conf: {(selectedNode.feedback.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {selectedNode.feedback.alerts.map((alert, i) => (
                        <li key={i}>{alert}</li>
                      ))}
                    </ul>

                    {selectedNode.feedback.suggestedAction && (
                      <div className="mt-2 text-[11px] font-mono text-indigo-300 bg-indigo-950/60 p-2 rounded border border-indigo-500/20">
                        ⚡ Suggested Action: <strong>{selectedNode.feedback.suggestedAction}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Vector DB Memory Reference */}
                {selectedNode.vectorId && (
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3 space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between text-cyan-300 font-bold">
                      <span className="flex items-center space-x-1">
                        <Database className="h-3.5 w-3.5" />
                        <span>768D Vector Memory ID</span>
                      </span>
                      <span className="text-[10px] text-slate-400">{selectedNode.vectorId}</span>
                    </div>

                    {(() => {
                      const vec = sharedVectorDB.getVectorById(selectedNode.vectorId);
                      return vec ? (
                        <div className="text-[10px] text-slate-400 truncate">
                          Embedding 768D Preview: [{vec.embedding.slice(0, 5).map(n => n.toFixed(3)).join(', ')}, ...]
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Node Output Payload Viewer */}
                <div className="space-y-1">
                  <label className="block font-mono text-xs text-slate-400">
                    Agent Output Payload Deliverable
                  </label>
                  <div className="rounded-xl border border-indigo-950 bg-nexus-950 p-3 text-xs font-mono text-slate-200 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {selectedNode.payload?.output || 'Node has not completed execution yet.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-500 space-y-3">
                <Network className="h-10 w-10 text-slate-700 animate-pulse" />
                <p className="text-xs font-mono">
                  Select any node in the DAG Canvas to inspect real-time agent output payload, telemetry, and 768D vector memory.
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
