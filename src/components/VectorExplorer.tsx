import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Zap, Activity, RefreshCw } from 'lucide-react';
import type { VectorItem, IMultiModalAgent } from '../types';
import { apiClient } from '../services/apiClient';

export const VectorExplorer: React.FC = () => {
  const [vectors, setVectors] = useState<VectorItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ item: VectorItem; similarity: number }> | null>(null);
  const [cacheCheck, setCacheCheck] = useState<{ hit: boolean; similarity: number; distance: number; latencyMs: number } | null>(null);
  const [hoveredVector, setHoveredVector] = useState<VectorItem | null>(null);
  const [selectedVector, setSelectedVector] = useState<VectorItem | null>(null);
  const [filterModality, setFilterModality] = useState<string>('all');
  const [customTextInput, setCustomTextInput] = useState('');
  const [agents, setAgents] = useState<IMultiModalAgent[]>([]);

  useEffect(() => {
    refreshVectorList();
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    const list = await apiClient.getAgents();
    setAgents(list);
  };

  const refreshVectorList = async () => {
    try {
      const list = await apiClient.getAllVectors();
      setVectors(list);
    } catch (err) {
      console.warn('Vector list fetch failed:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setCacheCheck(null);
      return;
    }
    try {
      const data = await apiClient.searchVectors(searchQuery.trim(), 6);
      setSearchResults(data.results);
      setCacheCheck(data.cacheResult);
    } catch (err) {
      console.error('Vector search error:', err);
    }
  };

  const handleAddCustomVector = async () => {
    if (!customTextInput.trim()) return;
    try {
      await apiClient.addVector(
        customTextInput.trim(),
        'orchestrator',
        'Master Orchestrator Agent',
        'text',
        'User Custom Memory Injection'
      );
      setCustomTextInput('');
      refreshVectorList();
    } catch (err) {
      console.error('Vector add error:', err);
    }
  };

  const filteredVectors = vectors.filter((v) => {
    if (filterModality === 'all') return true;
    return v.metadata.modality === filterModality;
  });

  const getAgentColor = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.accentColor : '#06b6d4';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      
      {/* Top Banner Stats */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-5 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-xl bg-indigo-950 p-2.5 border border-indigo-500/40 shadow-inner">
            <Database className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-mono text-base font-bold text-white flex items-center space-x-2">
              <span>Shared 768-Dimensional Vector Memory Store</span>
              <span className="rounded-md bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/30">
                HTTP REST Connected
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Cross-agent high-dimensional memory space providing prerequisite context and sub-millisecond semantic caching via Express API server.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={refreshVectorList}
            className="flex items-center space-x-1.5 rounded-xl border border-indigo-500/30 bg-nexus-900 px-3.5 py-2 text-slate-300 hover:bg-nexus-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Space</span>
          </button>

          <button
            onClick={async () => {
              await apiClient.clearVectors();
              refreshVectorList();
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-400 hover:text-white"
          >
            Reset Memory
          </button>
        </div>
      </div>

      {/* Main Grid: 2D Scatter Map & Cosine Search Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 2D Vector Projection Scatter Map (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between relative min-h-[460px] tech-grid-pattern">
          
          <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                2D Dimensionality Projection Scatter Map (t-SNE/PCA)
              </h3>
            </div>

            {/* Modality Filter */}
            <div className="flex items-center space-x-2 text-xs font-mono">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <select
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                className="rounded-lg border border-indigo-500/30 bg-nexus-900 px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
              >
                <option value="all">All Modalities</option>
                <option value="text">Text</option>
                <option value="code">Code</option>
                <option value="vision">Vision</option>
                <option value="structured">Structured</option>
              </select>
            </div>
          </div>

          {/* Interactive SVG Scatter Map Canvas */}
          <div className="relative w-full h-[320px] rounded-xl border border-indigo-950 bg-nexus-950/90 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-indigo-950"></div>
              <div className="h-full w-[1px] bg-indigo-950 absolute"></div>
            </div>

            <svg className="w-full h-full relative z-10" viewBox="-1 -1 2 2">
              {filteredVectors.map((v) => {
                const [x, y] = v.projection2D;
                const isHovered = hoveredVector?.id === v.id;
                const isSelected = selectedVector?.id === v.id;
                const color = getAgentColor(v.metadata.agentId);

                return (
                  <g key={v.id} transform={`translate(${x}, ${-y})`}>
                    <circle
                      r={isHovered || isSelected ? 0.08 : 0.04}
                      fill={color}
                      opacity={0.85}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredVector(v)}
                      onMouseLeave={() => setHoveredVector(null)}
                      onClick={() => setSelectedVector(v)}
                    />
                    {(isHovered || isSelected) && (
                      <circle
                        r={0.12}
                        fill="none"
                        stroke={color}
                        strokeWidth={0.015}
                        className="animate-ping"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {hoveredVector && (
              <div className="absolute bottom-3 left-3 z-20 rounded-xl border border-indigo-500/40 bg-nexus-900/95 p-3 backdrop-blur-md shadow-xl text-xs max-w-sm pointer-events-none">
                <div className="flex items-center justify-between font-mono text-[10px] text-cyan-300 mb-1">
                  <span>{hoveredVector.id}</span>
                  <span>[{hoveredVector.projection2D.join(', ')}]</span>
                </div>
                <h4 className="font-bold text-white mb-1">{hoveredVector.metadata.agentName}</h4>
                <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                  {hoveredVector.text}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-indigo-950 pt-3 z-10">
            <span>Hover plot points to view high-dimensional embedding details</span>
            <span>Total Plotted: <strong className="text-cyan-300">{filteredVectors.length}</strong></span>
          </div>
        </div>

        {/* Cosine Search & Semantic Cache Sandbox (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-cyan-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                  Cosine Similarity Search Sandbox
                </h3>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">
                Cache Threshold: &gt;0.88
              </span>
            </div>

            <div className="flex space-x-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type query to test vector similarity..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-xl border border-indigo-500/30 bg-nexus-900 px-3.5 py-2 font-mono text-xs text-cyan-200 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110 shadow-lg shadow-cyan-500/20"
              >
                Search
              </button>
            </div>

            {cacheCheck && (
              <div
                className={`rounded-xl p-3 border font-mono text-xs mb-4 transition-all ${
                  cacheCheck.hit
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 glow-emerald'
                    : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold flex items-center space-x-1.5">
                    {cacheCheck.hit ? (
                      <>
                        <Zap className="h-4 w-4 text-emerald-400 animate-bounce" />
                        <span>SEMANTIC CACHE HIT (SUB-MS)</span>
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 text-indigo-400" />
                        <span>CACHE MISS (FORWARD TO MODEL)</span>
                      </>
                    )}
                  </span>
                  <span className="font-bold">{(cacheCheck.similarity * 100).toFixed(1)}% Sim</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Cosine Distance: {cacheCheck.distance}</span>
                  <span>Latency: {cacheCheck.latencyMs} ms</span>
                </div>
              </div>
            )}

            {searchResults ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest block mb-1">
                  Top Cosine Matches
                </span>
                {searchResults.map((r, idx) => (
                  <div
                    key={r.item.id}
                    onClick={() => setSelectedVector(r.item)}
                    className="group rounded-xl border border-indigo-950 bg-nexus-900/80 p-3 hover:border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-cyan-400 font-bold">#{idx + 1} {r.item.metadata.agentName}</span>
                      <span className="text-emerald-400 font-bold">{(r.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {r.item.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-indigo-950 p-6 text-center text-slate-500 text-xs font-mono">
                Enter any prompt above to calculate 768-D cosine similarity via Express REST server.
              </div>
            )}
          </div>

          <div className="border-t border-indigo-950 pt-3">
            <span className="font-mono text-[11px] text-slate-400 mb-1.5 block">
              Inject Custom Vector Memory
            </span>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                placeholder="Insert text into vector DB..."
                className="w-full rounded-xl border border-indigo-500/30 bg-nexus-950 px-3 py-1.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <button
                onClick={handleAddCustomVector}
                className="rounded-xl border border-indigo-500/40 bg-indigo-950 px-3 py-1.5 text-xs font-mono text-indigo-300 hover:bg-indigo-900 shrink-0"
              >
                + Inject
              </button>
            </div>
          </div>
        </div>

      </div>

      {selectedVector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-nexus-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-cyan-400" />
                <h3 className="font-mono text-sm font-bold text-white">
                  768-D Vector Memory Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedVector(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Vector ID: <strong className="text-cyan-300">{selectedVector.id}</strong></span>
                <span>Agent: <strong className="text-indigo-300">{selectedVector.metadata.agentName}</strong></span>
              </div>

              <div className="rounded-xl border border-indigo-950 bg-nexus-950 p-3 text-slate-200 leading-relaxed max-h-36 overflow-y-auto">
                {selectedVector.text}
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Raw 768-D Vector Embeddings Preview:</label>
                <div className="rounded-xl border border-indigo-950 bg-nexus-950 p-3 text-[10px] text-cyan-300 max-h-28 overflow-y-auto break-all">
                  [{selectedVector.embedding.join(', ')}]
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedVector(null)}
                className="rounded-xl bg-indigo-950 px-4 py-2 text-xs font-mono text-indigo-300 hover:bg-indigo-900 border border-indigo-500/30"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
