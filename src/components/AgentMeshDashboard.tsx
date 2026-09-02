import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Play, Upload, Sparkles } from 'lucide-react';
import type { IMultiModalAgent, AgentFeedbackReport, AgentId, ModelName } from '../types';
import { apiClient } from '../services/apiClient';

export const AgentMeshDashboard: React.FC = () => {
  const [agents, setAgents] = useState<IMultiModalAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('code');
  const [sandboxPrompt, setSandboxPrompt] = useState('Generate a type-safe TypeScript function for 768-D vector dot product with zero-allocation memory loop.');
  const [sandboxModel, setSandboxModel] = useState<ModelName>('gemini-3.1-pro-preview');
  const [sandboxImage, setSandboxImage] = useState<string | undefined>(undefined);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<AgentFeedbackReport[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchAgents();

    const seedReports: AgentFeedbackReport[] = [
      {
        id: 'rep_1',
        nodeId: 'node-1',
        agentId: 'orchestrator',
        agentName: 'Master Orchestrator Agent',
        status: 'success',
        confidence: 0.99,
        alerts: ['[Demo Fixture] DAG Objective decomposed into 4 topological nodes.'],
        suggestedAction: 'Forward context vectors to downstream agents',
        timestamp: Date.now() - 120000,
        latencyMs: 145,
        tokensUsed: 88,
      },
      {
        id: 'rep_2',
        nodeId: 'node-2',
        agentId: 'code',
        agentName: 'Code Assistant Agent',
        status: 'rerouted',
        confidence: 0.94,
        alerts: ['[Demo Fixture] Complex async static analysis requires deeper logic proof.'],
        suggestedAction: 'Elevate to Gemini 3.1 Pro for deep logic verification',
        timestamp: Date.now() - 90000,
        latencyMs: 310,
        tokensUsed: 420,
      },
      {
        id: 'rep_3',
        nodeId: 'node-3',
        agentId: 'guardrail',
        agentName: 'Guardrail & Data Validator Agent',
        status: 'success',
        confidence: 1.0,
        alerts: ['[Demo Fixture] Enforced zero-trust TypeScript type bounds. 0 vulnerabilities detected.'],
        suggestedAction: 'Approve payload delivery',
        timestamp: Date.now() - 45000,
        latencyMs: 85,
        tokensUsed: 64,
      },
    ];
    setTelemetryLogs(seedReports);
  }, []);

  const fetchAgents = async () => {
    try {
      const list = await apiClient.getAgents();
      setAgents(list);
    } catch (err) {
      console.warn('Agents fetch error:', err);
    }
  };

  const handleRunSandbox = async () => {
    if (!sandboxPrompt.trim() || isExecuting) return;
    setIsExecuting(true);
    setSandboxOutput(null);

    const agent = selectedAgent;

    try {
      const result = await apiClient.executeAgent(
        selectedAgentId,
        sandboxModel,
        sandboxPrompt,
        sandboxImage
      );

      setSandboxOutput(result.text);

      // C4: Derive confidence from actual response characteristics, not hardcoded
      const responseLen = (result.text || '').length;
      const hasSubstantiveContent = responseLen > 20;
      const latencyReasonable = result.latencyMs < 15000;
      let empiricalConfidence = 0.5; // Base: we got a response
      if (hasSubstantiveContent) empiricalConfidence += 0.2;
      if (latencyReasonable) empiricalConfidence += 0.1;
      if (result.tokens > 10) empiricalConfidence += 0.1;
      if (result.isRealApi) empiricalConfidence += 0.1; // Live API gets a small bonus
      empiricalConfidence = Math.min(1.0, empiricalConfidence);

      const report: AgentFeedbackReport = {
        id: `rep_${Date.now()}`,
        nodeId: `sandbox_${Date.now()}`,
        agentId: selectedAgentId,
        agentName: agent?.name || selectedAgentId,
        status: 'success',
        confidence: empiricalConfidence,
        alerts: [result.isRealApi ? '[Live Event] Executed via server Express API & Gemini SDK.' : '[Local Driver] Executed via server dynamic model decision driver.'],
        suggestedAction: 'Deliverable ready for vector memory indexing',
        timestamp: Date.now(),
        latencyMs: result.latencyMs,
        tokensUsed: result.tokens,
      };

      setTelemetryLogs((prev) => [report, ...prev]);
    } catch (err: any) {
      setSandboxOutput(`Execution Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSandboxImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const filteredTelemetry = telemetryLogs.filter((log) => {
    if (filterStatus === 'all') return true;
    return log.status === filterStatus;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      
      {/* Capability Registry Matrix (7 Agents Grid) */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-purple-950 p-2.5 border border-purple-500/40 shadow-inner">
              <Cpu className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-mono text-base font-bold text-white flex items-center space-x-2">
                <span>Multi-Modal Agent Capability Registry Matrix</span>
                <span className="rounded-md bg-purple-950 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/30">
                  HTTP REST Connected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Model-multiplexed AI agents mapped to specialized tasks across Text, Vision, Code, Logic, and Zero-Trust Guardrails.
              </p>
            </div>
          </div>
        </div>

        {/* 7 Agents Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {agents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            const isFlash = agent.model === 'gemini-3.7-flash';

            return (
              <div
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  setSandboxModel(agent.model);
                }}
                className={`group rounded-xl p-4 border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-nexus-900 border-cyan-400 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400'
                    : 'glass-card hover:bg-nexus-900/90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold border ${
                      isFlash
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                        : 'bg-purple-950 text-purple-300 border-purple-500/40'
                    }`}
                  >
                    {agent.model}
                  </span>

                  <span className="flex items-center space-x-1 font-mono text-[10px]">
                    <span className={`h-1.5 w-1.5 rounded-full ${agent.status === 'processing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span className="text-slate-400 capitalize">{agent.status}</span>
                  </span>
                </div>

                <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors mb-1">
                  {agent.name}
                </h4>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {agent.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.supportedInputModalities.map((mod) => (
                    <span
                      key={mod}
                      className="rounded bg-nexus-950 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 border border-indigo-950 uppercase"
                    >
                      {mod}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-indigo-950 pt-2 font-mono text-[10px] text-slate-400">
                  <span>Execs: <strong>{agent.totalExecutions}</strong></span>
                  <span>Avg Latency: <strong className="text-cyan-300">{agent.avgLatencyMs}ms</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Sandbox & Live Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Multi-Modal Sandbox (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                Interactive Multi-Modal Agent Sandbox
              </h3>
            </div>
            {selectedAgent && (
              <span className="font-mono text-xs text-cyan-300 font-bold">
                {selectedAgent.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Target Model</label>
              <select
                value={sandboxModel}
                onChange={(e) => setSandboxModel(e.target.value as ModelName)}
                className="w-full rounded-xl border border-indigo-500/30 bg-nexus-900 px-3 py-2 text-cyan-300 focus:outline-none"
              >
                <option value="gemini-3.7-flash">gemini-3.7-flash (Fast Multi-Modal)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Code/Logic)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Vision Input Context</label>
              <label className="flex items-center justify-center space-x-1.5 cursor-pointer rounded-xl border border-indigo-500/30 bg-nexus-900 py-2 text-cyan-300 hover:bg-nexus-800">
                <Upload className="h-3.5 w-3.5" />
                <span>{sandboxImage ? 'Image Loaded' : 'Attach Image'}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-mono text-xs text-slate-400">Agent Task Prompt</label>
            <textarea
              rows={3}
              value={sandboxPrompt}
              onChange={(e) => setSandboxPrompt(e.target.value)}
              placeholder="Enter prompt for agent execution..."
              className="w-full rounded-xl border border-indigo-500/30 bg-nexus-900 p-3 font-mono text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <button
            onClick={handleRunSandbox}
            disabled={isExecuting}
            className={`w-full flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
              isExecuting
                ? 'bg-cyan-700 opacity-60'
                : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 shadow-cyan-500/20 glow-cyan'
            }`}
          >
            <Play className="h-4 w-4 fill-white" />
            <span>{isExecuting ? 'Executing Agent Model Inference...' : 'Execute Agent via Express REST Server'}</span>
          </button>

          {sandboxOutput && (
            <div className="space-y-1 border-t border-indigo-950 pt-3">
              <label className="block font-mono text-xs text-slate-400">Agent Output Payload</label>
              <div className="rounded-xl border border-indigo-950 bg-nexus-950 p-3 font-mono text-xs text-slate-200 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {sandboxOutput}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Inter-Agent Feedback Telemetry Stream (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  Inter-Agent Feedback Telemetry Stream
                </h3>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-indigo-500/30 bg-nexus-900 px-2.5 py-1 font-mono text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Events</option>
                <option value="success">Success</option>
                <option value="rerouted">Rerouted</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 mt-3">
              {filteredTelemetry.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-indigo-950 bg-nexus-900/90 p-3.5 space-y-2 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-cyan-300">{report.agentName}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold border ${
                          report.status === 'success'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-950 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {report.status.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-emerald-400 font-bold">
                      Confidence: {(report.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">
                    {report.alerts.map((alert, i) => (
                      <li key={i}>{alert}</li>
                    ))}
                  </ul>

                  {report.suggestedAction && (
                    <div className="text-[11px] font-mono text-indigo-300 bg-indigo-950/60 p-2 rounded border border-indigo-500/20 flex items-center justify-between">
                      <span>⚡ Suggested Action: <strong>{report.suggestedAction}</strong></span>
                      <span className="text-slate-500">{report.latencyMs}ms</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-indigo-950 pt-3 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>Real-time Inter-Agent Event Bus Active</span>
            <span>Total Events: <strong className="text-cyan-300">{telemetryLogs.length}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
