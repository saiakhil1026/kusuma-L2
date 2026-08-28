import { describe, it, expect } from 'vitest';
import { frameworkEvaluator } from '../engine/evaluationEngine';

describe('Empirical Framework Evaluation Suite', () => {
  it('should run full benchmark evaluation across dataset test cases and return empirical metrics', async () => {
    const report = await frameworkEvaluator.runFullEvaluation();

    expect(report.totalEvaluatedCases).toBeGreaterThan(0);
    expect(report.caseResults.length).toBe(report.totalEvaluatedCases);
    expect(report.overallScore).toBeGreaterThan(0);
    expect(report.dimensions.length).toBe(5);

    // Verify each case has real execution results recorded
    report.caseResults.forEach((caseRes) => {
      expect(caseRes.execution).toBeDefined();
      expect(caseRes.execution.observations.length).toBeGreaterThan(0);
      expect(caseRes.latencyMs).toBeGreaterThan(0);
    });
  });

  it('should measure empirical tool groundedness and reflection pass rate from actual case executions', async () => {
    const report = await frameworkEvaluator.runFullEvaluation();
    const mcpDim = report.dimensions.find((d) => d.id === 'mcp_groundedness');
    const reflDim = report.dimensions.find((d) => d.id === 'reflection_pass_rate');

    expect(mcpDim).toBeDefined();
    expect(reflDim).toBeDefined();

    expect(mcpDim?.score).toBeGreaterThan(0);
    expect(reflDim?.score).toBeGreaterThan(0);
  });
});
