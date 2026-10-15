import { describe, it, expect } from 'vitest';
import { frameworkEvaluator } from '../engine/evaluationEngine';

describe('Empirical Benchmark Dataset Evaluation Suite (Gates 7 & 8)', () => {
  it('should evaluate versioned benchmark dataset v1.json and return empirical offline metrics', async () => {
    const report = await frameworkEvaluator.runFullEvaluation();

    expect(report.version).toBe('v2.0.0');
    expect(report.caseResults.length).toBeGreaterThan(0);
    expect(report.offlineMetrics).toBeDefined();

    const offline = report.offlineMetrics;
    expect(offline.totalCasesEvaluated).toBe(report.caseResults.length);
    expect(offline.passRatePct).toBeGreaterThanOrEqual(0);
    expect(offline.groundednessPct).toBeGreaterThanOrEqual(0);
    expect(offline.toolSuccessRatePct).toBeGreaterThanOrEqual(0);
    expect(offline.reflectionSuccessRatePct).toBeGreaterThanOrEqual(0);
    expect(offline.avgLatencyMs).toBeGreaterThan(0);
  });

  it('should separate langfuse and offline metrics without merging fake live scores', async () => {
    const report = await frameworkEvaluator.runFullEvaluation();

    // In test environment, runMode is offline_driver
    expect(report.offlineMetrics.runMode).toBe('offline');
    expect(report.langfuseMetrics).toBeNull(); // No live Langfuse run in offline vitest environment
    expect(report.summaryMessage).toContain('Langfuse tracing not yet executed');
  });

  it('should calculate empirical precision and recall or return "Not measured" if insufficient data', async () => {
    const report = await frameworkEvaluator.runFullEvaluation();
    const precision = report.offlineMetrics.precisionPct;
    const recall = report.offlineMetrics.recallPct;

    if (typeof precision === 'number') {
      expect(precision).toBeGreaterThanOrEqual(0);
      expect(precision).toBeLessThanOrEqual(100);
    } else {
      expect(precision).toBe('Not measured');
    }

    if (typeof recall === 'number') {
      expect(recall).toBeGreaterThanOrEqual(0);
      expect(recall).toBeLessThanOrEqual(100);
    } else {
      expect(recall).toBe('Not measured');
    }
  });
});