import { describe, it, expect } from 'vitest';
import { dynamicAgentRunner } from '../engine/agentLoop';

describe('Evidence Grounding & Citation Test Suite', () => {
  it('should include explicit observation citations in final synthesized answer', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Search vector memory and audit security for code',
      'gemini-3.7-flash',
      5
    );

    expect(result.status).toBe('completed');
    expect(result.evidenceCitations.length).toBeGreaterThan(0);
    expect(result.finalAnswer).toContain('[Observation');
  });

  it('should differentiate between verified facts and tool observations', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Audit safe TypeScript function export function ping(): string { return "pong"; }',
      'gemini-3.7-flash',
      4
    );

    expect(result.observations.length).toBeGreaterThan(0);
    const auditObs = result.observations.find((o) => o.toolName === 'zero_trust_audit');
    expect(auditObs).toBeDefined();
    expect(auditObs?.resultContent).toContain('PASSED');
  });
});
