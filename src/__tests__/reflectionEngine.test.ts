import { describe, it, expect } from 'vitest';
import { reflectionEngine } from '../engine/reflectionEngine';

describe('Evidence-Grounded Reflection Engine Suite', () => {
  it('should pass reflection verification when draft is fully grounded in observations', () => {
    const observations = [
      { step: 1, toolName: 'vector_search', arguments: { query: 'test' }, resultContent: 'Matches', timestamp: Date.now() },
      { step: 2, toolName: 'zero_trust_audit', arguments: { payload: 'code' }, resultContent: 'PASSED', timestamp: Date.now() },
    ];

    const verdict = reflectionEngine.evaluateDeliverable(
      'Test Security Pipeline',
      'Verified draft output deliverable.',
      observations
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.confidence).toBe(0.99);
    expect(verdict.unsupportedClaims.length).toBe(0);
    expect(verdict.missingRequirements.length).toBe(0);
  });

  it('should flag missing requirements if vector search observation was omitted', () => {
    const observations = [
      { step: 1, toolName: 'refactor_code', arguments: { requirement: 'test' }, resultContent: 'Code', timestamp: Date.now() },
    ];

    const verdict = reflectionEngine.evaluateDeliverable(
      'Test Pipeline',
      'Unverified draft output.',
      observations
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.missingRequirements.length).toBeGreaterThan(0);
    expect(verdict.revisedOutput).toContain('REVISED DRAFT');
  });
});
