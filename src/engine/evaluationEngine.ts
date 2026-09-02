import { dynamicAgentRunner, type AgentLoopExecutionResult } from './agentLoop';
import datasetV1 from '../../evaluation/dataset/v1.json';

export interface DatasetTestCase {
  id: string;
  objective: string;
  category: string;
  difficulty: string;
  requiredEvidence: string[];
  allowedTools: string[];
  forbiddenTools: string[];
  expectedAnswerProperties: string[];
  groundingRequired?: boolean;
  expectedOutcome?: string;
}

export interface BenchmarkCaseExecutionResult {
  caseId: string;
  objective: string;
  category: string;
  runMode: 'live' | 'offline';
  decisionSource: 'live_gemini' | 'offline_driver';
  execution: AgentLoopExecutionResult;
  passed: boolean;
  toolSelectionMatched: boolean;
  answerPropertiesMatched: boolean;
  requiredEvidencePresent: boolean;
  groundednessPct: number;
  groundingPassed: boolean;
  reflectionPassed: boolean;
  latencyMs: number;
  metrics: {
    tp: number;
    fp: number;
    fn: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
}

export interface EvaluationGroupMetrics {
  runMode: 'live' | 'offline';
  decisionSource: 'live_gemini' | 'offline_driver';
  totalCasesEvaluated: number;
  passedCasesCount: number;
  passRatePct: number;
  precisionPct: number | 'Not measured';
  recallPct: number | 'Not measured';
  f1ScorePct: number | 'Not measured';
  groundednessPct: number;
  toolSuccessRatePct: number;
  reflectionSuccessRatePct: number;
  avgLatencyMs: number;
}

export interface ComprehensiveEvaluationReport {
  timestamp: string;
  version: string;
  datasetName: string;
  liveMetrics: EvaluationGroupMetrics | null;
  offlineMetrics: EvaluationGroupMetrics;
  caseResults: BenchmarkCaseExecutionResult[];
  summaryMessage: string;
}

export class FrameworkEvaluationEngine {
  public async runFullEvaluation(): Promise<ComprehensiveEvaluationReport> {
    const testCases: DatasetTestCase[] = datasetV1.testCases as any;
    const caseResults: BenchmarkCaseExecutionResult[] = [];

    for (const testCase of testCases) {
      const execution = await dynamicAgentRunner.runDynamicLoop(testCase.objective);

      const executedTools = Array.from(new Set(execution.steps.map((s) => s.toolName).filter(Boolean) as string[]));

      // 1. Multilabel Tool Selection Classification Metrics (Issue 9)
      const tp = executedTools.filter((t) => testCase.requiredEvidence.includes(t)).length;
      const fp = executedTools.filter((t) => !testCase.allowedTools.includes(t)).length;
      const fn = testCase.requiredEvidence.filter((t) => !executedTools.includes(t)).length;

      const precision = (tp + fp) > 0 ? parseFloat((tp / (tp + fp)).toFixed(4)) : 0;
      const recall = (tp + fn) > 0 ? parseFloat((tp / (tp + fn)).toFixed(4)) : 0;
      const f1Score = (precision + recall) > 0 ? parseFloat(((2 * precision * recall) / (precision + recall)).toFixed(4)) : 0;

      // 2. Evidence Presence Verification
      const hasRequiredEvidence = testCase.requiredEvidence.every((reqTool) =>
        execution.observations.some((o) => o.toolName === reqTool && !o.isError)
      );

      const usedForbiddenTools = testCase.forbiddenTools.some((forb) => executedTools.includes(forb));
      const toolSelectionMatched = hasRequiredEvidence && !usedForbiddenTools && fp === 0;

      // 3. Expected Answer Properties Check
      const lowerAnswer = execution.finalAnswer.toLowerCase();
      const answerPropertiesMatched = testCase.expectedAnswerProperties.every((prop) => lowerAnswer.includes(prop.toLowerCase()));

      // 4. Grounding Requirement Verification
      const groundingPassed = Boolean(execution.groundingResult?.passed);
      const groundednessPct = execution.groundingResult?.groundednessPct ?? 0;
      const reflectionPassed = execution.reflectionVerdict.passed;

      const casePassed = toolSelectionMatched && answerPropertiesMatched && groundingPassed && reflectionPassed && execution.status === 'completed';

      caseResults.push({
        caseId: testCase.id,
        objective: testCase.objective,
        category: testCase.category,
        runMode: execution.isLive ? 'live' : 'offline',
        decisionSource: execution.decisionSource,
        execution,
        passed: casePassed,
        toolSelectionMatched,
        answerPropertiesMatched,
        requiredEvidencePresent: hasRequiredEvidence,
        groundednessPct,
        groundingPassed,
        reflectionPassed,
        latencyMs: execution.totalLatencyMs,
        metrics: {
          tp,
          fp,
          fn,
          precision,
          recall,
          f1Score,
        },
      });
    }

    // Separate Live vs Offline Execution Metrics (Gate 8 & Issue 9)
    const liveCases = caseResults.filter((c) => c.runMode === 'live');
    const offlineCases = caseResults.filter((c) => c.runMode === 'offline');

    const liveMetrics = liveCases.length > 0 ? this.calculateGroupMetrics('live', 'live_gemini', liveCases) : null;
    const offlineMetrics = this.calculateGroupMetrics('offline', 'offline_driver', offlineCases);

    return {
      timestamp: new Date().toISOString(),
      version: datasetV1.version,
      datasetName: datasetV1.datasetName,
      liveMetrics,
      offlineMetrics,
      caseResults,
      summaryMessage: liveMetrics
        ? `Live evaluation completed over ${liveCases.length} held-out cases. Offline evaluation completed over ${offlineCases.length} cases.`
        : `Offline benchmark evaluation completed over ${offlineCases.length} held-out cases. Live Gemini evaluation not yet executed (set GEMINI_API_KEY to run live benchmark).`,
    };
  }

  private calculateGroupMetrics(
    runMode: 'live' | 'offline',
    decisionSource: 'live_gemini' | 'offline_driver',
    cases: BenchmarkCaseExecutionResult[]
  ): EvaluationGroupMetrics {
    const totalCasesEvaluated = cases.length;
    if (totalCasesEvaluated === 0) {
      return {
        runMode,
        decisionSource,
        totalCasesEvaluated: 0,
        passedCasesCount: 0,
        passRatePct: 0,
        precisionPct: 'Not measured',
        recallPct: 'Not measured',
        f1ScorePct: 'Not measured',
        groundednessPct: 0,
        toolSuccessRatePct: 0,
        reflectionSuccessRatePct: 0,
        avgLatencyMs: 0,
      };
    }

    const passedCasesCount = cases.filter((c) => c.passed).length;
    const passRatePct = parseFloat(((passedCasesCount / totalCasesEvaluated) * 100).toFixed(1));

    const totalTp = cases.reduce((acc, c) => acc + c.metrics.tp, 0);
    const totalFp = cases.reduce((acc, c) => acc + c.metrics.fp, 0);
    const totalFn = cases.reduce((acc, c) => acc + c.metrics.fn, 0);

    const precision = (totalTp + totalFp) > 0 ? totalTp / (totalTp + totalFp) : 1.0;
    const recall = (totalTp + totalFn) > 0 ? totalTp / (totalTp + totalFn) : 1.0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 1.0;

    const precisionPct = parseFloat((precision * 100).toFixed(1));
    const recallPct = parseFloat((recall * 100).toFixed(1));
    const f1ScorePct = parseFloat((f1 * 100).toFixed(1));

    const avgGroundedness = parseFloat(
      (cases.reduce((acc, c) => acc + c.groundednessPct, 0) / totalCasesEvaluated).toFixed(1)
    );

    let totalToolCalls = 0;
    let successfulToolCalls = 0;
    cases.forEach((c) => {
      c.execution.observations.forEach((obs) => {
        totalToolCalls++;
        if (!obs.isError) successfulToolCalls++;
      });
    });

    const toolSuccessRatePct = totalToolCalls > 0
      ? parseFloat(((successfulToolCalls / totalToolCalls) * 100).toFixed(1))
      : 0;

    const reflectionSuccessCount = cases.filter((c) => c.reflectionPassed).length;
    const reflectionSuccessRatePct = parseFloat(((reflectionSuccessCount / totalCasesEvaluated) * 100).toFixed(1));

    const avgLatencyMs = Math.round(cases.reduce((acc, c) => acc + c.latencyMs, 0) / totalCasesEvaluated);

    return {
      runMode,
      decisionSource,
      totalCasesEvaluated,
      passedCasesCount,
      passRatePct,
      precisionPct,
      recallPct,
      f1ScorePct,
      groundednessPct: avgGroundedness,
      toolSuccessRatePct,
      reflectionSuccessRatePct,
      avgLatencyMs,
    };
  }
}

export const frameworkEvaluator = new FrameworkEvaluationEngine();
