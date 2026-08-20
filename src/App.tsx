import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DAGCanvas } from './components/DAGCanvas';
import { VectorExplorer } from './components/VectorExplorer';
import { AgentMeshDashboard } from './components/AgentMeshDashboard';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { ArchitectureBlueprint } from './components/ArchitectureBlueprint';
import { dagRunner } from './engine/dagOrchestrator';

export function App() {
  const [activeTab, setActiveTab] = useState<'CANVAS' | 'VECTOR DB' | 'AGENT MESH' | 'EVALUATION' | 'BLUEPRINT'>('CANVAS');
  const [telemetryCount, setTelemetryCount] = useState<number>(3);

  useEffect(() => {
    const unsubscribe = dagRunner.subscribe({
      onGraphUpdate: () => {},
      onTelemetryEmit: () => {
        setTelemetryCount((prev) => prev + 1);
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-nexus-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 antialiased">
      {/* Top Application Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        telemetryCount={telemetryCount}
      />

      {/* Main Module Content Viewport */}
      <main className="flex-1 pb-12">
        {activeTab === 'CANVAS' && <DAGCanvas />}
        {activeTab === 'VECTOR DB' && <VectorExplorer />}
        {activeTab === 'AGENT MESH' && <AgentMeshDashboard />}
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
            <span className="text-cyan-400">768-D Vector Database Active</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>Models: <strong className="text-cyan-300">gemini-3.7-flash</strong> & <strong className="text-purple-300">gemini-3.1-pro-preview</strong></span>
            <span>Cache Threshold: <strong className="text-emerald-400">&gt;0.88 Cosine Sim</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
