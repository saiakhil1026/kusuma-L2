import { describe, it, expect } from 'vitest';
import { dynamicAgentRunner } from '../engine/agentLoop';

describe('Dynamic Model-Mediated Agent Loop Test Suite (Gates 2, 4, 14)', () => {
  it('should record explicit execution decision provenance metadata', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Search 768D vector space for zero-trust security architecture context memory',
      { maxSteps: 4 }
    );

    expect(result.isLive).toBe(false);
    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it('should dynamically select vector_search tool for vector context objectives', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Search 768D vector space for zero-trust security architecture context memory',
      { maxSteps: 4 }
    );

    expect(result.status).toBe('completed');
    expect(result.observations.length).toBeGreaterThan(0);
    const toolsUsed = result.steps.map((s) => s.toolName).filter(Boolean);
    expect(toolsUsed).toContain('vector_search');
  });

  it('should dynamically select refactor_code tool for code refactoring objectives', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Refactor TypeScript function converting legacy var declarations to const with async await',
      { maxSteps: 4 }
    );

    expect(result.status).toBe('completed');
    const toolsUsed = result.steps.map((s) => s.toolName).filter(Boolean);
    expect(toolsUsed).toContain('refactor_code');
  });

  it('should dynamically select zero_trust_audit tool for security checking objectives', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Audit safety of code payload: export function add(a: number, b: number): number { return a + b; }',
      { maxSteps: 4 }
    );

    expect(result.status).toBe('completed');
    const toolsUsed = result.steps.map((s) => s.toolName).filter(Boolean);
    expect(toolsUsed).toContain('zero_trust_audit');
  });

  it('should select different tool sequences for different objectives', async () => {
    const resVector = await dynamicAgentRunner.runDynamicLoop('Find vector memory embeddings', { maxSteps: 3 });
    const resVision = await dynamicAgentRunner.runDynamicLoop('Analyze visual spatial scene diagram for DAG', { maxSteps: 3 });

    const toolsVector = resVector.steps.map((s) => s.toolName).filter(Boolean);
    const toolsVision = resVision.steps.map((s) => s.toolName).filter(Boolean);

    expect(toolsVector).toContain('vector_search');
    expect(toolsVision).toContain('parse_vision_tags');
  });

  it('should terminate with failure state when max steps limit is exceeded', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Complex multi-hop objective requiring deep reasoning',
      { maxSteps: 1 } // maxSteps = 1 forces max steps exceeded before finish
    );

    expect(result.status).toBe('failed');
    expect(result.finalAnswer).toContain('max limit');
  });

  it('should handle request cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await dynamicAgentRunner.runDynamicLoop(
      'Search vector database context',
      { signal: controller.signal }
    );

    expect(result.status).toBe('failed');
    expect(result.finalAnswer).toContain('CANCELLED');
  });

  it('should automatically generate an execution trace file with complete provenance', async () => {
    const result = await dynamicAgentRunner.runDynamicLoop(
      'Generate execution trace test objective',
      { maxSteps: 3 }
    );

    expect(result.tracePath).toBeDefined();
    expect(result.tracePath?.length).toBeGreaterThan(0);
  });
});