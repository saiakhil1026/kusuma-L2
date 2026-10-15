import React, { useState, useEffect } from 'react';
import {
  Network,
  Wrench,
  Cpu,
  Database,
  Award,
  BookOpen,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';

export type AppTab = 'STUDIO' | 'MCP TOOLS' | 'AGENT MESH' | 'VECTOR DB' | 'EVALUATION' | 'BLUEPRINT';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  telemetryCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const [stats, setStats] = useState({
    status: 'offline',
    mcpToolsCount: 8,
    vectorCount: 7,
    cacheHitRatio: 0,
    persistenceMode: 'local',
  });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await apiClient.getHealthStats();
        setStats({
          status: data.status,
          mcpToolsCount: data.mcpToolsCount || 8,
          vectorCount: data.vectorCount,
          cacheHitRatio: data.cacheHitRatioPct,
          persistenceMode: (data as any).persistenceMode || 'local',
        });
      } catch {
        setStats((prev) => ({ ...prev, status: 'offline' }));
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  const navTabs: Array<{ id: AppTab; label: string; icon: any; badge?: string | null }> = [
    { id: 'STUDIO', label: 'Agent Studio', icon: Network, badge: null },
    { id: 'MCP TOOLS', label: 'MCP Tools Catalog', icon: Wrench, badge: `${stats.mcpToolsCount}` },
    { id: 'EVALUATION', label: 'Evaluation Metrics', icon: Award, badge: 'Empirical' },
    { id: 'BLUEPRINT', label: 'Architecture Blueprint', icon: BookOpen, badge: null },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-indigo-900/40 bg-nexus-950/85 backdrop-blur-xl">
      {/* Top Application Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">

        {/* Brand Identity */}
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
                Enterprise v3.7
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Dynamic MCP Agent Mesh & 768D Vector Memory Engine
            </p>
          </div>
        </div>

        {/* Live System Telemetry Status Badges */}
        <div className="hidden md:flex items-center space-x-3 font-mono text-xs">
          <div className="flex items-center space-x-2 rounded-lg bg-nexus-900/80 px-3 py-1.5 border border-indigo-500/20">
            <Wrench className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">MCP Tools:</span>
            <span className="font-semibold text-cyan-300">{stats.mcpToolsCount} Active</span>
          </div>

          <div className="flex items-center space-x-2 rounded-lg bg-nexus-900/80 px-3 py-1.5 border border-indigo-500/20">
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-slate-400">Memory:</span>
            <span className="font-semibold text-indigo-300">{stats.vectorCount} Vectors</span>
          </div>

          <div className="flex items-center space-x-2 rounded-lg bg-nexus-900/80 px-3 py-1.5 border border-indigo-500/20">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-400">Cache:</span>
            <span className="font-semibold text-emerald-300">{stats.cacheHitRatio}%</span>
          </div>
        </div>

        {/* Server Connectivity Status Indicator */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 border ${
              stats.status === 'online'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
            }`}
          >
            <ShieldCheck className={`h-4 w-4 ${stats.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span>Server: {stats.status === 'online' ? 'Online (3002)' : 'Disconnected'}</span>
            <span className="text-slate-500">|</span>
            <span className="uppercase text-[10px]">{stats.persistenceMode}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-indigo-950 bg-nexus-950/60 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl space-x-1 sm:space-x-3 overflow-x-auto scrollbar-none py-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap rounded-lg ${
                  isActive
                    ? 'text-cyan-300 font-semibold bg-cyan-950/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-nexus-900/40'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 font-mono text-[10px] ${
                      isActive
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 shadow-sm shadow-cyan-500/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};