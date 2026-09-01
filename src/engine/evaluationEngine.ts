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
  requiredEvidencePresent: boolean;
  groundednessPct: number;
  reflectionPassed: boolean;
  latencyMs: number;
}

export interface EvaluationGroupMetrics {
  runMode: 'live' | 'offline';
  decisionSource: 'live_gemini' | 'offline_driver';
  totalCasesEvaluated: number;
  passedCasesCount: number;
  passRatePct: number;
  precisionPct: number | 'Not measured';
  recallPct: number | 'Not measured';
  groundednessPct: number;
  toolSuccessRatePct: number;
  reflectionSuccessRatePct: number;
  avgLatencyMs: number;
}

export interface ComprehensiveEvaluationReport {
  timestamp: string;
  version: string;
  liveMetrics: EvaluationGroupMetrics | null;
  offlineMetrics: EvaluationGroupMetrics;
  caseResults: BenchmarkCaseExecutionResult[];
  summaryMessage: string;
}

export class FrameworkEvaluationEngine {
  public async runFullEvaluation(): Promise<ComprehensiveEvaluationReport> {
    const testCases: DatasetTestCase[] = datasetV1.testCases;
    const caseResults: BenchmarkCaseExecutionResult[] = [];

    for (const testCase of testCases) {
      const execution = await dynamicAgentRunner.runDynamicLoop(testCase.objective);

      const executedTools = execution.steps.map((s) => s.toolName).filter(Boolean) as string[];

      // Verify tool selection against allowed/required tools
      const hasRequiredEvidence = testCase.requiredEvidence.every((reqTool) =>
        execution.observations.some((o) => o.toolName === reqTool && !o.isError)
      );

      const usedForbiddenTools = testCase.forbiddenTools.some((forb) => executedTools.includes(forb));
      const toolSelectionMatched = hasRequiredEvidence && !usedForbiddenTools;
      const groundednessPct = execution.groundingResult?.groundednessPct ?? 0;
      const reflectionPassed = execution.reflectionVerdict.passed;

      const casePassed = toolSelectionMatched && reflectionPassed && execution.status === 'completed';

      caseResults.push({
        caseId: testCase.id,
        objective: testCase.objective,
        category: testCase.category,
        runMode: execution.isLive ? 'live' : 'offline',
        decisionSource: execution.decisionSource,
        execution,
        passed: casePassed,
        toolSelectionMatched,
        requiredEvidencePresent: hasRequiredEvidence,
        groundednessPct,
        reflectionPassed,
        latencyMs: execution.totalLatencyMs,
      });
    }

    // Separate Live vs Offline Execution Metrics (Gate 8)
    const liveCases = caseResults.filter((c) => c.runMode === 'live');
    const offlineCases = caseResults.filter((c) => c.runMode === 'offline');

    const liveMetrics = liveCases.length > 0 ? this.calculateGroupMetrics('live', 'live_gemini', liveCases) : null;
    const offlineMetrics = this.calculateGroupMetrics('offline', 'offline_driver', offlineCases);

    return {
      timestamp: new Date().toISOString(),
      version: datasetV1.version,
      liveMetrics,
      offlineMetrics,
      caseResults,
      summaryMessage: liveMetrics
        ? `Live evaluation completed over ${liveCases.length} cases. Offline evaluation completed over ${offlineCases.length} cases.`
        : 'Offline benchmark evaluation completed. Live Gemini evaluation not yet executed (set GEMINI_API_KEY to run live benchmark).',
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
        groundednessPct: 0,
        toolSuccessRatePct: 0,
        reflectionSuccessRatePct: 0,
        avgLatencyMs: 0,
      };
    }

    const passedCasesCount = cases.filter((c) => c.passed).length;
    const passRatePct = parseFloat(((passedCasesCount / totalCasesEvaluated) * 100).toFixed(1));

    // Empirical Precision & Recall from Tool Selection matches (Gate 7)
    // True Positives (TP): Cases where required tool was selected correctly and passed
    const truePositives = cases.filter((c) => c.toolSelectionMatched && c.passed).length;
    // False Positives (FP): Cases where tools were invoked but failed acceptance
    const falsePositives = cases.filter((c) => !c.passed && c.execution.observations.length > 0).length;
    // False Negatives (FN): Cases where required tools were omitted
    const falseNegatives = cases.filter((c) => !c.requiredEvidencePresent).length;

    const precisionPct = (truePositives + falsePositives) > 0
      ? parseFloat(((truePositives / (truePositives + falsePositives)) * 100).toFixed(1))
      : 'Not measured';

    const recallPct = (truePositives + falseNegatives) > 0
      ? parseFloat(((truePositives / (truePositives + falseNegatives)) * 100).toFixed(1))
      : 'Not measured';

    const avgGroundedness = parseFloat(
      (cases.reduce((acc, c) => acc + c.groundednessPct, 0) / totalCasesEvaluated).toFixed(1)
    );

    // Calculate Empirical Tool Call Success Rate
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
      groundednessPct: avgGroundedness,
      toolSuccessRatePct,
      reflectionSuccessRatePct,
      avgLatencyMs,
    };
  }
}

export const frameworkEvaluator = new FrameworkEvaluationEngine();
