import { useState } from 'react';
import { Header, type AppTab } from './components/Header';
import { DAGCanvas } from './components/DAGCanvas';
import { McpToolCatalog } from './components/McpToolCatalog';
import { VectorExplorer } from './components/VectorExplorer';
import { AgentMeshDashboard } from './components/AgentMeshDashboard';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { ArchitectureBlueprint } from './components/ArchitectureBlueprint';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('STUDIO');

  return (
    <div className="min-h-screen bg-nexus-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 antialiased">
      {/* Top Application Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Module Content Viewport */}
      <main className="flex-1 pb-12">
        {activeTab === 'STUDIO' && <DAGCanvas />}
        {activeTab === 'MCP TOOLS' && <McpToolCatalog />}
        {activeTab === 'EVALUATION' && <EvaluationDashboard />}
        {activeTab === 'BLUEPRINT' && <ArchitectureBlueprint />}
      </main>

      {/* Footer System Status Bar */}
      <footer className="border-t border-indigo-950 bg-nexus-950/90 py-3 font-mono text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 sm:px-6 gap-2">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>NexusMatrix Enterprise AI Engineering Framework</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400">8 MCP Tools & 10 Autonomous Agents Active</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>Server: <strong className="text-emerald-400">Connected (Port 3002)</strong></span>
            <span>Cache Threshold: <strong className="text-cyan-300">&gt;0.88 Cosine Sim</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;