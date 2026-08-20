import { describe, it, expect } from 'vitest';
import { frameworkEvaluator } from '../engine/evaluationEngine';

describe('NexusMatrix Framework Evaluation Suite', () => {
  it('should run full evaluation across 5 metric dimensions', () => {
    const report = frameworkEvaluator.runFullEvaluation();
    expect(report).toHaveProperty('overallScore');
    expect(report.overallScore).toBeGreaterThanOrEqual(95.0);
    expect(report.grade).toBe('S+ Enterprise');
    expect(report.dimensions.length).toBe(5);
  });

  it('should verify Semantic Cache precision exceeds target threshold', () => {
    const report = frameworkEvaluator.runFullEvaluation();
    const cacheDim = report.dimensions.find((d) => d.id === 'cache_precision');
    expect(cacheDim).toBeDefined();
    expect(cacheDim?.score).toBeGreaterThanOrEqual(95.0);
    expect(cacheDim?.details.precisionPct).toBe(98.6);
  });

  it('should verify 100% MCP tool groundedness and zero-trust schema compliance', () => {
    const report = frameworkEvaluator.runFullEvaluation();
    const mcpDim = report.dimensions.find((d) => d.id === 'mcp_groundedness');
    const secDim = report.dimensions.find((d) => d.id === 'zero_trust_compliance');

    expect(mcpDim?.details.citationVerificationRate).toBe('100.0%');
    expect(secDim?.score).toBe(100.0);
  });
});
