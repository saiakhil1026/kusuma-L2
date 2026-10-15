import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Code2,
  FolderTree,
  ShieldAlert,
  Database,
  Eye,
  Play,
  RotateCcw,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface McpToolMetadata {
  name: string;
  category: 'search' | 'code' | 'storage' | 'security';
  description: string;
  icon: any;
  accentColor: string;
  borderColor: string;
  badgeColor: string;
  sampleArgs: Record<string, any>;
  sampleDescription: string;
}

const TOOL_METADATA_MAP: Record<string, McpToolMetadata> = {
  web_search: {
    name: 'web_search',
    category: 'search',
    description: 'Searches live web indices for empirical facts, technical docs, and verified source citations with relevance scoring.',
    icon: Search,
    accentColor: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    sampleArgs: {
      query: 'Node.js 22 LTS features and performance benchmarks',
      topK: 3,
    },
    sampleDescription: 'Search for Node.js 22 LTS release features with verified citations',
  },
  code_execute: {
    name: 'code_execute',
    category: 'code',
    description: 'Executes verified JavaScript/TypeScript code in an isolated sandbox and captures stdout output, return values, and latency.',
    icon: Code2,
    accentColor: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    sampleArgs: {
      code: `const fib = [0, 1];\nfor (let i = 2; i < 10; i++) {\n  fib[i] = fib[i - 1] + fib[i - 2];\n}\nconsole.log('Fibonacci sequence computed:', fib);\nfib;`,
      language: 'javascript',
      timeoutMs: 1500,
    },
    sampleDescription: 'Compute Fibonacci sequence in isolated sandbox and inspect stdout',
  },
  file_system: {
    name: 'file_system',
    category: 'storage',
    description: 'Performs virtual workspace artifact operations (read, write, list, exists) to inspect or persist agent deliverables.',
    icon: FolderTree,
    accentColor: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    sampleArgs: {
      action: 'list',
      filePath: '.',
    },
    sampleDescription: 'List files and directories in the virtual workspace root',
  },
  vector_search: {
    name: 'vector_search',
    category: 'search',
    description: 'Performs 768-dimensional cosine similarity search across vector memory database with semantic caching.',
    icon: Database,
    accentColor: 'from-indigo-500 to-purple-600',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400',
    badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    sampleArgs: {
      query: 'Zero-trust authentication architecture and microservices security specs',
      topK: 3,
    },
    sampleDescription: 'Query 768D memory vectors for microservice architecture context',
  },
  store_memory: {
    name: 'store_memory',
    category: 'storage',
    description: 'Generates 768D vector embeddings and indexes memory artifacts into persistent vector storage with metadata.',
    icon: Database,
    accentColor: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    sampleArgs: {
      text: 'Enterprise AI Agent Framework: Standardized MCP tools architecture with isolated execution sandboxes.',
      agentId: 'orchestrator',
      nodeTitle: 'Architecture Standard Spec',
      modality: 'text',
    },
    sampleDescription: 'Index new technical architecture specification into 768D vector store',
  },
  refactor_code: {
    name: 'refactor_code',
    category: 'code',
    description: 'Transforms source code via TypeScript AST parsing: converts legacy var to const/let and Promise chains to async/await.',
    icon: Zap,
    accentColor: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-500/40 hover:border-blue-400',
    badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    sampleArgs: {
      codeRequirement: 'Convert legacy var declarations to const and Promise .then() chains to async/await syntax',
      sourceCode: `var apiKey = "sample_key";\nvar endpoint = "/api/v1/data";\nfunction fetchData() {\n  return fetch(endpoint).then(function(res) {\n    return res.json();\n  });\n}`,
      language: 'typescript',
    },
    sampleDescription: 'Refactor JavaScript sample converting var to const and Promise chains to async/await',
  },
  zero_trust_audit: {
    name: 'zero_trust_audit',
    category: 'security',
    description: 'Scans source code and payloads against zero-trust safety bounds: detects SQL injection, hardcoded secrets, eval(), and TLS bypass.',
    icon: ShieldAlert,
    accentColor: 'from-rose-500 to-red-600',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    badgeColor: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    sampleArgs: {
      payloadToAudit: `const query = "SELECT * FROM users WHERE username = '" + req.body.user + "' AND password = '" + req.body.pass + "';";\nconst secretKey = "AKIAIOSFODNN7EXAMPLE";\nprocess.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";`,
    },
    sampleDescription: 'Audit vulnerable code snippet for SQL injection, hardcoded AWS keys, and TLS bypass',
  },
  parse_vision_tags: {
    name: 'parse_vision_tags',
    category: 'security',
    description: 'Extracts spatial scene bounding box tags [ymin, xmin, ymax, xmax] and visual wireframe layout elements.',
    icon: Eye,
    accentColor: 'from-violet-500 to-fuchsia-600',
    borderColor: 'border-violet-500/40 hover:border-violet-400',
    badgeColor: 'bg-violet-950/80 text-violet-300 border-violet-500/40',
    sampleArgs: {
      imagePrompt: 'Topological DAG Canvas with 6 microservice nodes, directed dependency arrows, and status badges',
    },
    sampleDescription: 'Generate spatial bounding box tags for architecture diagram layout',
  },
};

export const McpToolCatalog: React.FC = () => {
  const [tools, setTools] = useState<any[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string>('web_search');
  const [argsJson, setArgsJson] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'search' | 'code' | 'storage' | 'security'>('all');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const serverTools = await apiClient.getMcpTools();
      if (serverTools && serverTools.length > 0) {
        setTools(serverTools);
      } else {
        // Fallback from metadata map
        setTools(Object.keys(TOOL_METADATA_MAP).map((k) => ({ name: k, description: TOOL_METADATA_MAP[k].description })));
      }
    } catch {
      setTools(Object.keys(TOOL_METADATA_MAP).map((k) => ({ name: k, description: TOOL_METADATA_MAP[k].description })));
    }
  };

  useEffect(() => {
    // When selected tool changes, populate sample args
    const meta = TOOL_METADATA_MAP[selectedToolName];
    if (meta) {
      setArgsJson(JSON.stringify(meta.sampleArgs, null, 2));
      setJsonError(null);
      setExecutionResult(null);
    }
  }, [selectedToolName]);

  const handleSelectTool = (name: string) => {
    setSelectedToolName(name);
  };

  const handleRunTool = async () => {
    if (isExecuting) return;
    setJsonError(null);

    let parsedArgs: Record<string, any>;
    try {
      parsedArgs = JSON.parse(argsJson);
    } catch (err: any) {
      setJsonError(`Invalid JSON arguments: ${err.message}`);
      return;
    }

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      const res = await apiClient.callMcpTool(selectedToolName, parsedArgs);
      const latencyMs = Math.round(performance.now() - startTime);
      setExecutionResult({
        ...res,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      setExecutionResult({
        toolName: selectedToolName,
        isError: true,
        content: `Execution failed: ${err.message}`,
        latencyMs,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyResult = () => {
    if (!executionResult) return;
    const textToCopy = typeof executionResult.content === 'string'
      ? executionResult.content
      : JSON.stringify(executionResult.content, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTools = tools.filter((t) => {
    if (categoryFilter === 'all') return true;
    const meta = TOOL_METADATA_MAP[t.name];
    return meta ? meta.category === categoryFilter : true;
  });

  const activeMeta = TOOL_METADATA_MAP[selectedToolName] || {
    name: selectedToolName,
    category: 'search' as const,
    description: 'Registered MCP Tool',
    icon: Wrench,
    accentColor: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500/40',
    badgeColor: 'bg-cyan-950/80 text-cyan-300',
    sampleArgs: {},
    sampleDescription: 'Sample tool execution',
  };

  const ActiveIcon = activeMeta.icon;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">

      {/* Hero Header Banner */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-2.5 shadow-lg shadow-cyan-500/20">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-mono text-lg font-bold text-white">
                  Model Context Protocol (MCP) Tool Catalog
                </h2>
                <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-mono font-semibold text-cyan-300 border border-cyan-500/30">
                  8 Tools Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standardized enterprise tools available to autonomous agents. Test any tool live with the interactive test bench below.
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {[
              { id: 'all', label: 'All Tools (8)' },
              { id: 'search', label: 'Search & Memory' },
              { id: 'code', label: 'Code & Sandbox' },
              { id: 'storage', label: 'Files & Storage' },
              { id: 'security', label: 'Security & Vision' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-nexus-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Tool Cards on Left (7 cols) + Live Test Bench on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Tools Catalog Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 px-1">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Available MCP Tools ({filteredTools.length})</span>
            </span>
            <span>Click any tool to load into the Live Test Bench</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTools.map((tool) => {
              const meta = TOOL_METADATA_MAP[tool.name] || {
                name: tool.name,
                category: 'search' as const,
                description: tool.description,
                icon: Wrench,
                accentColor: 'from-slate-700 to-slate-900',
                borderColor: 'border-slate-800',
                badgeColor: 'bg-slate-900 text-slate-300',
                sampleArgs: {},
                sampleDescription: 'Sample description',
              };
              const IconComponent = meta.icon;
              const isSelected = selectedToolName === tool.name;

              return (
                <div
                  key={tool.name}
                  onClick={() => handleSelectTool(tool.name)}
                  className={`group relative rounded-xl p-4.5 border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-nexus-900/90 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/15'
                      : 'glass-card hover:border-slate-600 hover:bg-nexus-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className={`rounded-lg p-2 bg-gradient-to-tr ${meta.accentColor} text-white shadow`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-mono text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {tool.name}
                        </h3>
                        <span className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider ${meta.badgeColor} mt-0.5`}>
                          {meta.category}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-500/40">
                        Active in Bench
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-3">
                    {meta.description}
                  </p>

                  <div className="flex items-center justify-between border-t border-indigo-950/80 pt-2.5 text-[11px] font-mono text-slate-400">
                    <span className="truncate max-w-[180px] text-slate-500">
                      Sample: {meta.sampleDescription}
                    </span>
                    <span className="text-cyan-400 group-hover:underline flex items-center space-x-1">
                      <span>Test tool</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Interactive Test Bench (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-5 backdrop-blur-xl shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            {/* Test Bench Header */}
            <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`rounded-lg p-1.5 bg-gradient-to-tr ${activeMeta.accentColor} text-white`}>
                  <ActiveIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Interactive Tool Test Bench
                  </h3>
                  <span className="font-mono text-[11px] text-cyan-300 font-semibold">
                    {selectedToolName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setArgsJson(JSON.stringify(activeMeta.sampleArgs, null, 2));
                  setJsonError(null);
                  setExecutionResult(null);
                }}
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 text-xs font-mono"
                title="Reset to sample inputs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Tool Explanation */}
            <div className="my-3 rounded-lg bg-nexus-900/80 p-3 border border-indigo-950 text-xs text-slate-300 leading-relaxed">
              <p className="font-sans">{activeMeta.description}</p>
              <div className="mt-2 pt-2 border-t border-indigo-950/60 flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Preset: <strong className="text-slate-300">{activeMeta.sampleDescription}</strong></span>
              </div>
            </div>

            {/* Arguments Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs text-slate-400 flex items-center space-x-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Input Arguments (JSON):</span>
                </label>
                <span className="font-mono text-[10px] text-slate-500">Live schema-validated</span>
              </div>

              <textarea
                rows={7}
                value={argsJson}
                onChange={(e) => {
                  setArgsJson(e.target.value);
                  setJsonError(null);
                }}
                disabled={isExecuting}
                className={`w-full rounded-xl border p-3 font-mono text-xs leading-relaxed focus:outline-none ${
                  jsonError
                    ? 'border-rose-500 bg-rose-950/20 text-rose-200'
                    : 'border-indigo-500/30 bg-nexus-900/90 text-cyan-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                }`}
              />

              {jsonError && (
                <p className="text-xs text-rose-400 flex items-center space-x-1 font-mono">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{jsonError}</span>
                </p>
              )}
            </div>

            {/* Run Button */}
            <div className="pt-3">
              <button
                onClick={handleRunTool}
                disabled={isExecuting}
                className={`w-full flex items-center justify-center space-x-2 rounded-xl py-2.5 px-4 text-xs font-semibold text-white shadow-lg transition-all ${
                  isExecuting
                    ? 'bg-cyan-700 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 shadow-cyan-500/25 glow-cyan'
                }`}
              >
                {isExecuting ? (
                  <>
                    <Zap className="h-4 w-4 text-cyan-300 animate-spin" />
                    <span>Executing {selectedToolName}...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>Execute MCP Tool</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Execution Result Box */}
          <div className="pt-4 border-t border-indigo-950 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400 flex items-center space-x-1.5">
                {executionResult?.isError ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                ) : executionResult ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span>Execution Output</span>
              </span>

              {executionResult && (
                <div className="flex items-center space-x-3">
                  <span className="text-emerald-400 font-bold">
                    {executionResult.latencyMs} ms
                  </span>
                  <button
                    onClick={handleCopyResult}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white"
                    title="Copy output"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {executionResult ? (
              <div
                className={`rounded-xl border p-3 font-mono text-xs max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed ${
                  executionResult.isError
                    ? 'border-rose-500/40 bg-rose-950/30 text-rose-200'
                    : 'border-indigo-950 bg-nexus-900/90 text-slate-200'
                }`}
              >
                {typeof executionResult.content === 'string'
                  ? executionResult.content
                  : JSON.stringify(executionResult.content, null, 2)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-indigo-950 bg-nexus-900/40 p-6 text-center text-xs font-mono text-slate-500">
                Click "Execute MCP Tool" above to trigger a live call to this tool on the server.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
