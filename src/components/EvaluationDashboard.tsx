import React, { useState, useEffect } from 'react';
import { CheckCircle2, Download, RefreshCw, Award } from 'lucide-react';
import { frameworkEvaluator } from '../engine/evaluationEngine';
import type { EvaluationReport } from '../engine/evaluationEngine';

export const EvaluationDashboard: React.FC = () => {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);

  useEffect(() => {
    // Initial evaluation run
    const initialReport = frameworkEvaluator.runFullEvaluation();
    setReport(initialReport);
  }, []);

  const handleRunBenchmarkSuite = () => {
    if (isRunningBenchmark) return;
    setIsRunningBenchmark(true);
    setBenchmarkProgress(0);

    const interval = setInterval(() => {
      setBenchmarkProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          const freshReport = frameworkEvaluator.runFullEvaluation();
          setReport(freshReport);
          setIsRunningBenchmark(false);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  const handleExportJsonReport = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `NexusMatrix_Evaluation_Report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!report) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      
      {/* Top Banner & Overall Score Gauge */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden tech-grid-pattern space-y-6">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-cyan-950 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/40">
                NexusMatrix Evaluation Suite
              </span>
              <span className="rounded-md bg-emerald-950 px-2.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <Award className="h-3.5 w-3.5" />
                <span>{report.grade}</span>
              </span>
            </div>
            <h2 className="font-mono text-xl font-bold text-white tracking-wide">
              Framework Performance & Evaluation Metrics Matrix
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time evaluation suite measuring 768D Vector Memory precision, MCP tool selection accuracy, evidence-grounded reflection rates, and multi-model latency optimization.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={handleRunBenchmarkSuite}
              disabled={isRunningBenchmark}
              className={`flex items-center space-x-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all ${
                isRunningBenchmark
                  ? 'bg-cyan-700 opacity-70 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:brightness-110 shadow-cyan-500/25 glow-cyan'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isRunningBenchmark ? 'animate-spin' : ''}`} />
              <span>{isRunningBenchmark ? `Benchmarking (${benchmarkProgress}%)` : 'Run Live Benchmark'}</span>
            </button>

            <button
              onClick={handleExportJsonReport}
              className="flex items-center space-x-2 rounded-xl border border-indigo-700/50 bg-indigo-950 px-4 py-2.5 text-xs font-mono text-indigo-200 hover:bg-indigo-900 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Live Progress Bar during benchmark */}
        {isRunningBenchmark && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-cyan-300">
              <span>Executing 50 Automated Test Scenarios across 5 Evaluation Dimensions...</span>
              <span>{benchmarkProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-nexus-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-200"
                style={{ width: `${benchmarkProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Score Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-2">
          <div className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase text-slate-400">Overall Score</span>
            <div className="font-mono text-2xl font-bold text-cyan-300">{report.overallScore}</div>
            <span className="font-mono text-[10px] text-emerald-400">/ 100 Rating</span>
          </div>

          <div className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase text-slate-400">Cache Precision</span>
            <div className="font-mono text-2xl font-bold text-cyan-300">{report.benchmarkSummary.cacheHitPrecision}%</div>
            <span className="font-mono text-[10px] text-slate-400">&gt;0.88 Threshold</span>
          </div>

          <div className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase text-slate-400">MCP Groundedness</span>
            <div className="font-mono text-2xl font-bold text-purple-300">{report.benchmarkSummary.toolCallGroundedness}%</div>
            <span className="font-mono text-[10px] text-purple-400">Zero Unverified</span>
          </div>

          <div className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase text-slate-400">Reflection Pass</span>
            <div className="font-mono text-2xl font-bold text-emerald-300">{report.benchmarkSummary.reflectionPassRate}%</div>
            <span className="font-mono text-[10px] text-emerald-400">Audit Revision</span>
          </div>

          <div className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase text-slate-400">Token Savings</span>
            <div className="font-mono text-2xl font-bold text-amber-300">{report.benchmarkSummary.tokenCompressionRatio}x</div>
            <span className="font-mono text-[10px] text-amber-400">Compression</span>
          </div>

          <div className="rounded-xl border border-indigo-900/60 bg-nexus-900/90 p-4 text-center space-y-1">
            <span className="font-mono text-[10px] uppercase text-slate-400">Zero-Trust Pass</span>
            <div className="font-mono text-2xl font-bold text-emerald-400">{report.benchmarkSummary.zeroTrustCompliancePct}%</div>
            <span className="font-mono text-[10px] text-emerald-400">100% Bounds</span>
          </div>
        </div>

      </div>

      {/* 5-Dimension Metric Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {report.dimensions.map((dim) => (
          <div
            key={dim.id}
            className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-colors"
          >
            <div className="space-y-3">
              {/* Category & Status Header */}
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo-950 px-2 py-0.5 font-mono text-[10px] text-indigo-300 border border-indigo-500/30">
                  {dim.category}
                </span>
                <span className="flex items-center space-x-1 font-mono text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Score: {dim.score} / 100</span>
                </span>
              </div>

              {/* Title & Value */}
              <div>
                <h3 className="font-sans font-bold text-sm text-white mb-1">{dim.name}</h3>
                <div className="font-mono text-lg font-bold text-cyan-300">{dim.valueDisplay}</div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed font-sans">{dim.description}</p>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Evaluation Target Score</span>
                  <span>{dim.targetScore}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-nexus-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Technical Detail Breakdown */}
            <div className="rounded-xl border border-indigo-950 bg-nexus-900/90 p-3 space-y-1.5 font-mono text-[11px] text-slate-300">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest block font-bold">
                Technical Benchmark Metrics
              </span>
              {Object.entries(dim.details).map(([key, val]) => (
                <div key={key} className="flex justify-between text-[11px]">
                  <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="text-cyan-300 font-bold">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
