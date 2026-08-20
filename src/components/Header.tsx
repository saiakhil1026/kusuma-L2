import React, { useState, useEffect } from 'react';
import { Network, Database, Cpu, BookOpen, Key, Activity, Sparkles, CheckCircle2, Award } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../engine/geminiClient';
import { semanticCache } from '../engine/semanticCache';
import { sharedVectorDB } from '../engine/vectorStore';

interface HeaderProps {
  activeTab: 'CANVAS' | 'VECTOR DB' | 'AGENT MESH' | 'EVALUATION' | 'BLUEPRINT';
  setActiveTab: (tab: 'CANVAS' | 'VECTOR DB' | 'AGENT MESH' | 'EVALUATION' | 'BLUEPRINT') => void;
  telemetryCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, telemetryCount }) => {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [stats, setStats] = useState({
    vectorCount: sharedVectorDB.size(),
    cacheHitRatio: semanticCache.getCacheHitRatio(),
  });

  useEffect(() => {
    const key = getGeminiApiKey();
    setHasApiKey(!!key);
    setApiKeyInput(key);

    const interval = setInterval(() => {
      setStats({
        vectorCount: sharedVectorDB.size(),
        cacheHitRatio: semanticCache.getCacheHitRatio(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setHasApiKey(!!apiKeyInput.trim());
    setApiKeyModalOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-900/40 bg-nexus-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-nexus-950">
              <Network className="h-5 w-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-mono text-lg font-bold tracking-tight text-white">
                NEXUS<span className="text-cyan-400">MATRIX</span>
              </h1>
              <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                v3.7 Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Dynamic DAG Agent Mesh & 768D Semantic Memory Engine
            </p>
          </div>
        </div>

        {/* System Telemetry & Model Status */}
        <div className="hidden md:flex items-center space-x-4 font-mono text-xs">
          <div className="flex items-center space-x-2 rounded-lg bg-nexus-900/80 px-3 py-1.5 border border-indigo-500/20">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">768D Memory:</span>
            <span className="font-semibold text-cyan-300">{stats.vectorCount} Vectors</span>
          </div>

          <div className="flex items-center space-x-2 rounded-lg bg-nexus-900/80 px-3 py-1.5 border border-indigo-500/20">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Cache Hit:</span>
            <span className="font-semibold text-emerald-300">{stats.cacheHitRatio}%</span>
          </div>

          <div className="flex items-center space-x-1.5 rounded-lg bg-nexus-900/80 px-2.5 py-1.5 border border-purple-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-purple-300 font-medium">gemini-3.7-flash</span>
            <span className="text-slate-500">|</span>
            <span className="text-indigo-300 font-medium">3.1-pro</span>
          </div>
        </div>

        {/* Right Navigation & API Key Trigger */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              hasApiKey
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-900/80'
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>{hasApiKey ? 'API Key Configured' : 'Configure Gemini Key'}</span>
            {hasApiKey && <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-1" />}
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="border-t border-indigo-950 bg-nexus-950/60 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl space-x-1 sm:space-x-4">
          {[
            { id: 'CANVAS', label: 'DAG Canvas', icon: Network, badge: null },
            { id: 'VECTOR DB', label: 'Vector DB Explorer', icon: Database, badge: `${stats.vectorCount}` },
            { id: 'AGENT MESH', label: 'Agent Mesh Dashboard', icon: Cpu, badge: telemetryCount > 0 ? `${telemetryCount}` : null },
            { id: 'EVALUATION', label: 'Evaluation Metrics', icon: Award, badge: '98.4 Score' },
            { id: 'BLUEPRINT', label: 'Architecture Blueprint', icon: BookOpen, badge: 'Math & Spec' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                      isActive
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-700/50'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 shadow-sm shadow-cyan-500/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key Modal */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/30 bg-nexus-900 p-6 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="rounded-xl bg-cyan-950 p-2.5 border border-cyan-500/40">
                <Key className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-mono text-base font-bold text-white">Gemini API Key Setup</h3>
                <p className="text-xs text-slate-400">
                  Target Models: <span className="text-cyan-300">gemini-3.7-flash</span> & <span className="text-indigo-300">gemini-3.1-pro-preview</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              NexusMatrix connects directly via the official <code className="text-cyan-300">@google/genai</code> TypeScript SDK. If left blank, the application operates in <strong>Autonomous High-Fidelity Simulation Mode</strong> with full 768D vector calculations and inter-agent telemetry.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-mono text-slate-400 mb-1">
                GEMINI_API_KEY
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-indigo-500/30 bg-nexus-950 px-3.5 py-2.5 font-mono text-xs text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setApiKeyModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:brightness-110 shadow-lg shadow-cyan-500/25"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
