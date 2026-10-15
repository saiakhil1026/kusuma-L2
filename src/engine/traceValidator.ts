import { z } from 'zod';

export const TraceSchema = z.object({
  executionId: z.string().min(1),
  localAttemptId: z.string().min(1).optional(),
  langfuseTraceId: z.string().nullable().optional(),
  timestamp: z.string().min(1),
  executionMode: z.string(),
  isLive: z.boolean().optional(),
  providerRequestId: z.string().nullable().optional(),
  decisionSource: z.string().optional(),
  provider: z.string().optional(),
  modelTarget: z.string().optional(),
  status: z.enum(['completed', 'partial', 'failed']),
  userObjective: z.string(),
  steps: z.array(z.object({
    stepIndex: z.number(),
    thought: z.string(),
    actionType: z.string(),
    toolName: z.string().optional(),
    toolArguments: z.record(z.string(), z.any()).optional(),
    observation: z.string().optional(),
    isError: z.boolean().optional(),
    latencyMs: z.number(),
  })),
  observations: z.array(z.object({
    id: z.string(),
    step: z.number(),
    toolName: z.string(),
    arguments: z.record(z.string(), z.any()),
    resultContent: z.string(),
    isError: z.boolean(),
    timestamp: z.number(),
  })),
  reflectionVerdict: z.object({
    status: z.string(),
    passed: z.boolean(),
    confidence: z.number(),
  }),
  groundingResult: z.object({
    status: z.string(),
    groundednessPct: z.number(),
    supportedClaimCount: z.number().optional(),
    unsupportedClaimsCount: z.number().optional(),
    totalClaimCount: z.number().optional(),
  }),
  finalAnswer: z.string(),
  evidenceCitations: z.array(z.string()),
  metrics: z.object({
    totalLatencyMs: z.number(),
    totalTokens: z.number(),
    observationCount: z.number(),
    errorCount: z.number(),
  }),
});

export type TraceRecord = z.infer<typeof TraceSchema>;

export function validateTraceSchema(trace: unknown): TraceRecord {
  const parsed = TraceSchema.parse(trace);
  if (!parsed.localAttemptId) {
    parsed.localAttemptId = parsed.executionId;
  }
  return parsed;
}

export function validateTraceScenario(trace: TraceRecord, scenarioName: string): { valid: boolean; reason?: string } {
  // Provenance Rule 1: trace must have executionId
  if (!trace.executionId || trace.executionId.length === 0) {
    return { valid: false, reason: 'executionId is required and must be non-empty' };
  }

  // Provenance Rule 2: Never claim live decisionSource or providerRequestId when offline
  if (trace.isLive === false) {
    if (trace.decisionSource === 'live_gemini' || (trace.decisionSource && trace.decisionSource.startsWith('live_'))) {
      return { valid: false, reason: 'Offline trace cannot claim decisionSource: live_gemini' };
    }
    if (trace.providerRequestId !== null && trace.providerRequestId !== undefined) {
      return { valid: false, reason: 'Offline trace cannot claim live providerRequestId without live execution' };
    }
  }

  if (scenarioName === 'tool-error-recovery.json' || scenarioName === 'tool-error-recovery') {
    const hasErrorObs = trace.observations.some((o) => o.isError) || trace.steps.some((s) => s.isError);
    if (!hasErrorObs) {
      return { valid: false, reason: 'Scenario tool-error-recovery requires at least one recorded error observation' };
    }
    const hasSuccessAfterError = trace.observations.some((o) => !o.isError);
    if (!hasSuccessAfterError) {
      return { valid: false, reason: 'Scenario tool-error-recovery requires subsequent recovery observation' };
    }
  }

  if (scenarioName === 'reflection-recovery.json' || scenarioName === 'reflection-recovery') {
    const hasReflectionStep = trace.steps.some((s) => s.thought.includes('Reflection') || s.thought.includes('evidence'));
    const isReflectionStatus = trace.reflectionVerdict.status !== undefined;
    if (!hasReflectionStep && !isReflectionStatus) {
      return { valid: false, reason: 'Scenario reflection-recovery requires reflection pass execution' };
    }
  }

  if (scenarioName === 'bounded-failure-execution.json' || scenarioName === 'bounded-failure-execution') {
    if (trace.status !== 'failed') {
      return { valid: false, reason: 'Scenario bounded-failure-execution requires status: failed' };
    }
  }

  return { valid: true };
}