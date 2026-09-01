import { describe, it, expect } from 'vitest';
import { reflectionEngine, type ObservationItem } from '../engine/reflectionEngine';

describe('Task-Derived Reflection Engine Suite (Gate 6)', () => {
  it('should pass reflection evaluation for vision tasks when parse_vision_tags evidence is present', () => {
    const observations: ObservationItem[] = [
      {
        id: 'O1',
        step: 1,
        toolName: 'parse_vision_tags',
        arguments: { imagePrompt: 'Analyze vision diagram' },
        resultContent: 'Extracted spatial vision diagram tags.',
        isError: false,
        timestamp: Date.now(),
      },
    ];

    const draftAnswer = 'Analyzed visual spatial scene diagram. [Observation O1]';
    const verdict = reflectionEngine.evaluateDeliverable(
      'Analyze visual spatial scene diagram for DAG',
      draftAnswer,
      observations
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.status).toBe('passed');
    expect(verdict.confidence).toBeGreaterThan(0.8);
    expect(verdict.missingRequirements.length).toBe(0);
  });

  it('should NOT require vector_search for vision tasks (removing universal 30-char rule)', () => {
    const observations: ObservationItem[] = [
      {
        id: 'O1',
        step: 1,
        toolName: 'parse_vision_tags',
        arguments: { imagePrompt: 'Analyze visual architecture diagram for canvas layout' },
        resultContent: 'Processed vision diagram tags.',
        isError: false,
        timestamp: Date.now(),
      },
    ];

    const objectiveLongerThan30Chars = 'Analyze visual spatial scene diagram for DAG canvas topological node layout';
    expect(objectiveLongerThan30Chars.length).toBeGreaterThan(30);

    const verdict = reflectionEngine.evaluateDeliverable(
      objectiveLongerThan30Chars,
      'Processed visual diagram. [Observation O1]',
      observations
    );

    expect(verdict.passed).toBe(true);
    expect(verdict.missingRequirements).not.toContain('Prerequisite 768D vector memory context search was omitted.');
  });

  it('should request needs_more_evidence with recommendedAction when required tool evidence is missing', () => {
    const observations: ObservationItem[] = [];
    const verdict = reflectionEngine.evaluateDeliverable(
      'Audit security zero_trust_audit safety of code payload',
      'Code is safe.',
      observations
    );

    expect(verdict.passed).toBe(false);
    expect(verdict.status).toBe('needs_more_evidence');
    expect(verdict.requiredEvidence).toContain('zero_trust_audit');
    expect(verdict.recommendedAction).toBeDefined();
    expect(verdict.recommendedAction?.tool).toBe('zero_trust_audit');
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
  });
});
