import { describe, it, expect } from 'vitest';
import { claimGroundingValidator } from '../engine/grounding';
import type { ObservationItem } from '../engine/agentLoop';

describe('Claim-to-Observation Grounding Engine Suite (Gate 5)', () => {
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
  ];

  it('should pass grounding for valid claim citing existing observation with matching evidence', () => {
    const answer = 'Retrieved vector memory context for authentication. [Observation O1]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('grounded');
    expect(result.supportedClaimCount).toBe(1);
    expect(result.groundednessPct).toBe(100);
    expect(result.claims[0].isSupported).toBe(true);
    expect(result.claims[0].observationIds).toContain('O1');
  });

  it('should mark claim as unsupported when observation citation is missing', () => {
    const answer = 'Retrieved vector memory context for authentication.';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('unsupported');
    expect(result.supportedClaimCount).toBe(0);
    expect(result.claims[0].isSupported).toBe(false);
    expect(result.claims[0].reason).toContain('No observation citation provided');
  });

  it('should mark claim as unsupported when cited observation ID does not exist in run', () => {
    const answer = 'Completed zero-trust safety audit. [Observation O99]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('unsupported');
    expect(result.claims[0].isSupported).toBe(false);
    expect(result.claims[0].reason).toContain('does not exist in current execution ledger');
  });

  it('should mark claim as unsupported when cited observation content does not support claim', () => {
    const answer = 'Refactored Python code to async await syntax. [Observation O1]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('unsupported');
    expect(result.claims[0].isSupported).toBe(false);
    expect(result.claims[0].reason).toContain('does not contain evidence supporting claim');
  });

  it('should support claim referencing multiple valid observations', () => {
    const answer = 'Verified vector memory context and zero-trust audit compliance. [Observation O1] [Observation O2]';
    const result = claimGroundingValidator.validateSynthesisGrounding(answer, sampleObservations);

    expect(result.status).toBe('grounded');
    expect(result.claims[0].isSupported).toBe(true);
    expect(result.claims[0].observationIds).toEqual(['O1', 'O2']);
  });
});
