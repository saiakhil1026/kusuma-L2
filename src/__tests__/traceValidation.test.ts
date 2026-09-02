import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { validateTraceSchema, validateTraceScenario } from '../engine/traceValidator';

describe('Execution Trace Integrity & Scenario Validation Suite (Issue 12 & 13)', () => {
  it('validates schema and scenario rules for all curated traces in traces/curated/', () => {
    const curatedDir = path.join(process.cwd(), 'traces', 'curated');
    expect(fs.existsSync(curatedDir)).toBe(true);

    const files = fs.readdirSync(curatedDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(6);

    for (const filename of files) {
      const filePath = path.join(curatedDir, filename);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const trace = JSON.parse(rawContent);

      // 1. Zod Schema Validation
      const validated = validateTraceSchema(trace);
      expect(validated.executionId).toBeDefined();
      expect(validated.localAttemptId).toBeDefined();

      // 2. Provenance Integrity Check: Never manufacture fake provider IDs
      if (!trace.isLive) {
        expect(trace.providerRequestId).toBeNull();
      }

      // 3. Scenario Event Rule Validation
      const result = validateTraceScenario(validated, filename);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects manufactured providerRequestId strings when no live provider request occurred', () => {
    const invalidOfflineTrace = {
      executionId: 'trace_123',
      localAttemptId: 'attempt_123',
      timestamp: new Date().toISOString(),
      executionMode: 'test',
      decisionSource: 'live_gemini', // Contradiction: isLive: false but decisionSource: live_gemini
      provider: 'offline',
      modelTarget: 'gemini-3.7-flash',
      providerRequestId: 'fake_gemini_req_12345678', // Manufactured ID
      isLive: false,
      userObjective: 'Test objective',
      status: 'completed',
      steps: [],
      observations: [],
      reflectionVerdict: { status: 'passed', passed: true, confidence: 1.0 },
      groundingResult: { status: 'grounded', groundednessPct: 100, supportedClaimsCount: 1, unsupportedClaimsCount: 0 },
      finalAnswer: 'Test answer',
      evidenceCitations: [],
      metrics: { totalLatencyMs: 100, totalTokens: 50, observationCount: 0, errorCount: 0 },
    };

    const validation = validateTraceScenario(invalidOfflineTrace as any, 'offline-success.json');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Offline trace cannot claim decisionSource: live_gemini');
  });
});
