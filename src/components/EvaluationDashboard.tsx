import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Award, Activity } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { ComprehensiveEvaluationReport } from '../engine/evaluationEngine';

export const EvaluationDashboard: React.FC = () => {
  const [report, setReport] = useState<ComprehensiveEvaluationReport | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);

  useEffect(() => {
    apiClient.runEvaluation().then((res) => setReport(res)).catch((err) => console.warn('Eval fetch error:', err));
  }, []);

  const handleRunBenchmarkSuite = async () => {
    if (isRunningBenchmark) return;
    setIsRunningBenchmark(true);
    setBenchmarkProgress(10);

    const interval = setInterval(() => {
      setBenchmarkProgress((prev) => Math.min(90, prev + 20));
    }, 200);

    try {
      const freshReport = await apiClient.runEvaluation();
      clearInterval(interval);
      setBenchmarkProgress(100);
      setReport(freshReport);
    } catch (err: any) {
      clearInterval(interval);
      console.error('Benchmark execution error:', err);
    } finally {
      setIsRunningBenchmark(false);
    }
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

      {/* Top Banner & Control */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl relative overflow-hidden tech-grid-pattern space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="rounded-md bg-cyan-950 px-2.5 py-1 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/40">
                Versioned Evaluation Suite ({report.version})
              </span>
              <span className="rounded-md bg-emerald-950 px-2.5 py-1 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <Award className="h-3.5 w-3.5" />
                <span>Non-Circular Benchmark</span>
              </span>
            </div>
            <h2 className="font-mono text-xl font-bold text-white tracking-wide">
              Empirical Evaluation & Benchmark Performance Matrix
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Calculated empirical precision, recall, claim-groundedness, tool call success rates, and reflection pass rates over versioned dataset <code className="text-cyan-300">evaluation/dataset/v1.json</code> via Express REST API.
            </p>
          </div>

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
              <span>{isRunningBenchmark ? `Benchmarking (${benchmarkProgress}%)` : 'Run Evaluation Dataset'}</span>
            </button>

            <button
              onClick={handleExportJsonReport}
              className="flex items-center space-x-2 rounded-xl border border-indigo-700/50 bg-indigo-950 px-4 py-2.5 text-xs font-mono text-indigo-200 hover:bg-indigo-900 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Report JSON</span>
            </button>
          </div>
        </div>

        {isRunningBenchmark && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-cyan-300">
              <span>Executing test dataset cases across dynamic agent runner...</span>
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
      </div>

      {/* Separated Execution Modes Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LANGFUSE TRACED EVALUATION BOX */}
        <div className="rounded-2xl border border-emerald-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-950 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
                Langfuse Traced Execution Metrics
              </h3>
            </div>
            <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
              mode: langfuse_traced
            </span>
          </div>

          {report.langfuseMetrics ? (
            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="rounded-xl border border-emerald-950 bg-nexus-900 p-3 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">Evaluated Cases</span>
                <div className="font-bold text-emerald-300 text-lg">{report.langfuseMetrics.totalCasesEvaluated}</div>
              </div>
              <div className="rounded-xl border border-emerald-950 bg-nexus-900 p-3 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">Pass Rate</span>
                <div className="font-bold text-emerald-300 text-lg">{report.langfuseMetrics.passRatePct}%</div>
              </div>
              <div className="rounded-xl border border-emerald-950 bg-nexus-900 p-3 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">Groundedness Pct</span>
                <div className="font-bold text-cyan-300 text-lg">{report.langfuseMetrics.groundednessPct}%</div>
              </div>
              <div className="rounded-xl border border-emerald-950 bg-nexus-900 p-3 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase">Tool Success</span>
                <div className="font-bold text-purple-300 text-lg">{report.langfuseMetrics.toolSuccessRatePct}%</div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <div className="font-mono text-xs font-bold text-amber-300">
                Langfuse evaluation not yet executed
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
                Provide <code className="text-cyan-300">LANGFUSE_SECRET_KEY</code> in server environment to enable Langfuse-traced evaluation.
              </p>
            </div>
          )}
        </div>

        {/* OFFLINE TEST DRIVER EVALUATION BOX */}
        <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-950 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
                Offline Test Driver Benchmark Metrics
              </h3>
            </div>
            <span className="font-mono text-[10px] bg-indigo-950 text-cyan-300 border border-indigo-500/30 px-2 py-0.5 rounded font-bold">
              mode: offline_driver
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="rounded-xl border border-indigo-950 bg-nexus-900 p-3 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Total Cases</span>
              <div className="font-bold text-white text-lg">{report.offlineMetrics.totalCasesEvaluated}</div>
            </div>

            <div className="rounded-xl border border-indigo-950 bg-nexus-900 p-3 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Pass Rate</span>
              <div className="font-bold text-emerald-300 text-lg">{report.offlineMetrics.passRatePct}%</div>
            </div>

            <div className="rounded-xl border border-indigo-950 bg-nexus-900 p-3 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Groundedness</span>
              <div className="font-bold text-cyan-300 text-lg">{report.offlineMetrics.groundednessPct}%</div>
            </div>

            <div className="rounded-xl border border-indigo-950 bg-nexus-900 p-3 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Precision</span>
              <div className="font-bold text-cyan-300 text-base">{String(report.offlineMetrics.precisionPct)}</div>
            </div>

            <div className="rounded-xl border border-indigo-950 bg-nexus-950 p-3 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Recall</span>
              <div className="font-bold text-cyan-300 text-base">{String(report.offlineMetrics.recallPct)}</div>
            </div>

            <div className="rounded-xl border border-indigo-950 bg-nexus-900 p-3 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase">Reflection Pass</span>
              <div className="font-bold text-purple-300 text-lg">{report.offlineMetrics.reflectionSuccessRatePct}%</div>
            </div>
          </div>
        </div>

      </div>

      {/* Case Execution Breakdown List */}
      <div className="rounded-2xl border border-indigo-900/40 bg-nexus-950/80 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-indigo-950 pb-3">
          Benchmark Dataset Case Execution Details
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {report.caseResults.map((res) => (
            <div
              key={res.caseId}
              className="rounded-xl border border-indigo-950 bg-nexus-900/90 p-4 space-y-2 hover:border-cyan-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="rounded bg-indigo-950 px-2 py-0.5 text-cyan-300 font-bold border border-indigo-500/30">
                    {res.caseId}
                  </span>
                  <span className="text-slate-200 font-bold font-sans">{res.objective}</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 font-bold text-[10px] border ${
                    res.passed
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-950 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {res.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-indigo-950">
                <span>Mode: <strong className="text-cyan-300">{res.runMode}</strong></span>
                <span>Groundedness: <strong className="text-emerald-400">{res.groundednessPct}%</strong></span>
                <span>Latency: <strong>{res.latencyMs} ms</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};