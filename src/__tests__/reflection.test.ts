import { describe, it, expect } from 'vitest';
import { reflectionEngine, type ObservationItem } from '../engine/reflectionEngine';

describe('Evidence-Grounded Reflection Engine Test Suite', () => {
  it('should pass reflection evaluation when all claims are grounded in tool observations', () => {
    const observations: ObservationItem[] = [
      {
        id: 'O1',
        step: 1,
        toolName: 'vector_search',
        arguments: { query: 'security spec' },
        resultContent: 'Found 768D vector memory match.',
        isError: false,
        timestamp: Date.now(),
      },
      {
        id: 'O2',
        step: 2,
        toolName: 'zero_trust_audit',
        arguments: { payloadToAudit: 'export class Test {}' },
        resultContent: 'Zero-Trust Audit Verdict: PASSED',
        isError: false,
        timestamp: Date.now(),
      },
    ];

    const draftAnswer = 'Verified architecture spec against 768D vector memory [Observation O1]. Zero-trust safety audit PASSED [Observation O2].';

    const verdict = reflectionEngine.evaluateDeliverable(
      'Audit security architecture spec',
      draftAnswer,
      observations
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.confidence).toBeGreaterThan(0.9);
    expect(verdict.unsupportedClaims.length).toBe(0);
    expect(verdict.missingRequirements.length).toBe(0);
  });

  it('should fail reflection evaluation when draft claims zero security issues without running zero_trust_audit', () => {
    const observations: ObservationItem[] = [
      {
        id: 'O1',
        step: 1,
        toolName: 'vector_search',
        arguments: { query: 'test' },
        resultContent: 'Found 1 vector.',
        isError: false,
        timestamp: Date.now(),
      },
    ];

    const draftAnswer = 'The deliverable has zero security issues and is 100% compliant.';

    const verdict = reflectionEngine.evaluateDeliverable(
      'Audit security architecture spec',
      draftAnswer,
      observations
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.missingRequirements).toContain(
      'Draft claims full security compliance but `zero_trust_audit` was never executed.'
    );
  });

  it('should trigger revision pass and produce revised output when unsupported claims are detected', () => {
    const observations: ObservationItem[] = [
      {
        id: 'O1',
        step: 1,
        toolName: 'refactor_code',
        arguments: { codeRequirement: 'Refactor code' },
        resultContent: 'Refactored code output.',
        isError: false,
        timestamp: Date.now(),
      },
    ];

    const ungroundedDraft = 'Draft answer making claims with zero backing observations for vector search and safety.';

    const verdict = reflectionEngine.evaluateDeliverable(
      'Complex multi-hop technical task',
      ungroundedDraft,
      observations
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.revisedOutput).toBeDefined();
    expect(verdict.revisedOutput).toContain('[Grounded Revision Pass]');
    expect(verdict.revisedOutput).toContain('[Observation O1]');
  });
});
