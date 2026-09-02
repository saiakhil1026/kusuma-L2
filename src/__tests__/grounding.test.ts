import { describe, it, expect } from 'vitest';
import { claimGroundingValidator } from '../engine/grounding';
import type { ObservationItem } from '../engine/agentLoop';

describe('Authoritative Claim-to-Observation Grounding Engine Suite (Gate 5 & Issue 7)', () => {
  const sampleObservations: ObservationItem[] = [
    {
      id: 'O1',
      step: 1,
      toolName: 'vector_search',
      arguments: { query: 'authentication' },
      resultContent: 'Retrieved 768D vector similarity context memory for authentication tokens.',
      isError: false,
      timestamp: Date.now(),
    },
    {
      id: 'O2',
      step: 2,
      toolName: 'zero_trust_audit',
      arguments: { payloadToAudit: 'export function auth() { return true; }' },
      resultContent: 'Zero-trust safety audit PASSED: 0 vulnerabilities detected.',
      isError: false,
      timestamp: Date.now(),
    },
    {
      id: 'O3',
      step: 3,
      toolName: 'zero_trust_audit',
      arguments: { payloadToAudit: 'SELECT * FROM users WHERE id = ' + 1 },
      resultContent: 'Zero-trust audit FAILED: Three critical vulnerabilities detected in payload: SQL Injection.',
      isError: false,
      timestamp: Date.now(),
    },
  ];

  it('should pass grounding for valid claim citing existing observation with matching evidence', () => {
    const answer = 'Retrieved vector memory context for authentication. [Observation O1]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('grounded');
    expect(result.passed).toBe(true);
    expect(result.supportedClaimCount).toBe(1);
    expect(result.groundednessPct).toBe(100);
    expect(result.claims[0].isSupported).toBe(true);
    expect(result.claims[0].observationIds).toContain('O1');
  });

  it('detects semantic CONTRADICTION when claim asserts no vulnerabilities but observation reports vulnerabilities', () => {
    // Reviewer finding example: Claim "No vulnerabilities were found", Observation "Three critical vulnerabilities detected"
    const answer = 'No vulnerabilities were found during security audit. [Observation O3]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('contradicted');
    expect(result.passed).toBe(false);
    expect(result.contradictedClaimCount).toBe(1);
    expect(result.claims[0].isContradicted).toBe(true);
    expect(result.claims[0].supportStatus).toBe('contradicted');
    expect(result.claims[0].reason).toContain('vulnerabilities in payload');
  });

  it('should mark claim as unsupported when cited observation ID does not exist in run', () => {
    const answer = 'Completed zero-trust safety audit. [Observation O99]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('unsupported');
    expect(result.passed).toBe(false);
    expect(result.claims[0].isSupported).toBe(false);
  });

  it('should mark claim as unsupported when cited observation content does not support claim', () => {
    const answer = 'Refactored Python code to async await syntax. [Observation O1]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('unsupported');
    expect(result.passed).toBe(false);
    expect(result.claims[0].isSupported).toBe(false);
  });

  it('should support claim referencing multiple valid observations', () => {
    const answer = 'Verified vector memory context and zero-trust audit compliance. [Observation O1] [Observation O2]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('grounded');
    expect(result.passed).toBe(true);
    expect(result.claims[0].isSupported).toBe(true);
    expect(result.claims[0].observationIds).toEqual(['O1', 'O2']);
  });
});
