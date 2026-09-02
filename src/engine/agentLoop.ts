import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { mcpSDKClient } from '../mcp/nexusMcpClient';
import { executeAgentInference, getGeminiApiKey, type InferenceResult } from './geminiClient';
import { reflectionEngine, type ReflectionVerdict } from './reflectionEngine';
import { claimGroundingValidator, type GroundedSynthesisResult } from './grounding';
import type { ModelName } from '../types';

// Runtime Zod Schemas for Model Actions (Gate 4)
export const ToolCallActionSchema = z.object({
  type: z.literal('tool_call'),
  tool: z.string().min(1, 'Tool name required'),
  arguments: z.record(z.string(), z.any()).optional().default({}),
});

export const FinishActionSchema = z.object({
  type: z.literal('finish'),
  answer: z.string().min(1, 'Answer string required'),
});

export const AgentActionSchema = z.discriminatedUnion('type', [
  ToolCallActionSchema,
  FinishActionSchema,
]);

export type AgentAction = z.infer<typeof AgentActionSchema>;

export interface ObservationItem {
  id: string;
  step: number;
  toolName: string;
  arguments: Record<string, any>;
  resultContent: string;
  isError: boolean;
  timestamp: number;
}

export interface AgentLoopStep {
  stepIndex: number;
  thought: string;
  actionType: 'tool_call' | 'finish';
  toolName?: string;
  toolArguments?: Record<string, any>;
  observation?: string;
  isError?: boolean;
  latencyMs: number;
}

// Execution Provenance (Gate 2 & Issue 1)
export interface AgentLoopExecutionResult {
  id: string;
  objective: string;
  status: 'completed' | 'partial' | 'failed';
  decisionSource: 'live_gemini' | 'offline_driver';
  provider: string;
  modelTarget: ModelName;
  localAttemptId: string;
  providerRequestId: string | null;
  timestamp: string;
  isLive: boolean;
  steps: AgentLoopStep[];
  observations: ObservationItem[];
  finalAnswer: string;
  groundingResult: GroundedSynthesisResult;
  evidenceCitations: string[];
  totalLatencyMs: number;
  totalTokens: number;
  reflectionVerdict: ReflectionVerdict;
  tracePath?: string;
}

export interface DynamicAgentLoopOptions {
  model?: ModelName;
  maxSteps?: number;
  maxRepairAttempts?: number;
  maxToolFailureRetries?: number;
  providerTimeoutMs?: number;
  toolTimeoutMs?: number;
  forceOffline?: boolean;
  signal?: AbortSignal;
}

export class DynamicAgentLoopRunner {
  public async runDynamicLoop(
    objective: string,
    options: DynamicAgentLoopOptions = {}
  ): Promise<AgentLoopExecutionResult> {
    const {
      model = 'gemini-3.7-flash',
      maxSteps = 10,
      maxRepairAttempts = 2,
      maxToolFailureRetries = 2,
      providerTimeoutMs = 15000,
      toolTimeoutMs = 10000,
      forceOffline = false,
      signal,
    } = options;

    const startTime = performance.now();
    const executionId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestampStr = new Date().toISOString();
    // Mod3: Local observationLedger array per invocation to prevent concurrent execution race conditions
    const observationLedger: ObservationItem[] = [];
    const steps: AgentLoopStep[] = [];
    let currentStep = 1;
    let isFinished = false;
    let rawFinalAnswer = '';
    let totalTokens = 0;
    let executionStatus: 'completed' | 'partial' | 'failed' = 'failed';
    let repairAttempts = 0;
    let toolFailureRetries = 0;

    const activeApiKey = getGeminiApiKey();
    const isTestEnv = typeof process !== 'undefined' && (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test');
    const isLiveAttempt = Boolean(activeApiKey) && !isTestEnv && !forceOffline;

    let lastInferenceResult: InferenceResult | null = null;
    let liveExecutionFailed = false;

    // Discover tools from real MCP Client (Gate 2)
    const mcpTools = await mcpSDKClient.listTools();
    const availableToolNames = new Set(mcpTools.map((t) => t.name));

    while (currentStep <= maxSteps && !isFinished) {
      if (signal?.aborted) {
        rawFinalAnswer = '[CANCELLED]: Execution aborted by signal.';
        executionStatus = 'failed';
        break;
      }

      const stepStartTime = performance.now();

      // 1. Build prompt context with ledger history
      const promptContext = `[Objective]: ${objective}
[Observation Ledger]:
${
  observationLedger.length > 0
    ? JSON.stringify(observationLedger, null, 2)
    : 'No observations recorded yet.'
}

[Available MCP Tools]:
${JSON.stringify(mcpTools, null, 2)}

[Instruction]: Respond strictly with a single valid JSON object representing your next action.
Option A (Tool Call):
{"type": "tool_call", "tool": "<registered_tool_name>", "arguments": { ... }}

Option B (Finish):
{"type": "finish", "answer": "<consolidated_grounded_answer>"}`;

      // 2. Call Gemini model / driver with provider timeout
      let inference: InferenceResult;
      try {
        inference = await this.withTimeout(
          executeAgentInference('orchestrator', model, promptContext, undefined, undefined, { forceOffline }),
          providerTimeoutMs,
          'Provider inference timeout'
        );
        lastInferenceResult = inference;
        totalTokens += inference.tokens;
      } catch (err: any) {
        const obsId = `O${observationLedger.length + 1}`;
        const errorMsg = err.message || String(err);
        observationLedger.push({
          id: obsId,
          step: currentStep,
          toolName: 'system_provider',
          arguments: {},
          resultContent: `[ERROR] Provider call failed: ${errorMsg}`,
          isError: true,
          timestamp: Date.now(),
        });
        steps.push({
          stepIndex: currentStep,
          thought: `Provider call error: ${errorMsg}`,
          actionType: 'tool_call',
          isError: true,
          observation: errorMsg,
          latencyMs: Math.round(performance.now() - stepStartTime),
        });

        if (isLiveAttempt) {
          liveExecutionFailed = true;
          rawFinalAnswer = `[LIVE API FAILURE]: ${errorMsg}`;
          executionStatus = 'failed';
          break;
        }

        currentStep++;
        continue;
      }

      // 3. Parse & Validate Model Response against Zod Schema (Gate 4)
      let parsedAction: AgentAction | null = null;
      try {
        const jsonText = this.extractJsonString(inference.text);
        const rawJson = JSON.parse(jsonText);
        parsedAction = AgentActionSchema.parse(rawJson);
      } catch (err: any) {
        repairAttempts++;
        const obsId = `O${observationLedger.length + 1}`;
        const errorMsg = `Malformed model action response: ${err.message}`;
        observationLedger.push({
          id: obsId,
          step: currentStep,
          toolName: 'system_validation',
          arguments: {},
          resultContent: `[ERROR] ${errorMsg}`,
          isError: true,
          timestamp: Date.now(),
        });

        steps.push({
          stepIndex: currentStep,
          thought: `Received malformed model response (Attempt ${repairAttempts}/${maxRepairAttempts}). Added error observation for recovery.`,
          actionType: 'tool_call',
          isError: true,
          observation: errorMsg,
          latencyMs: Math.round(performance.now() - stepStartTime),
        });

        if (repairAttempts >= maxRepairAttempts) {
          rawFinalAnswer = `[FAILURE]: Exceeded maximum malformed action repair budget (${maxRepairAttempts}).`;
          executionStatus = 'failed';
          break;
        }

        currentStep++;
        continue;
      }

      // 4. Handle Action: Tool Call
      if (parsedAction.type === 'tool_call') {
        const { tool, arguments: toolArgs } = parsedAction;

        if (!availableToolNames.has(tool)) {
          toolFailureRetries++;
          const obsId = `O${observationLedger.length + 1}`;
          const errorMsg = `Tool '${tool}' is not registered in MCP server. Available tools: ${Array.from(availableToolNames).join(', ')}`;
          observationLedger.push({
            id: obsId,
            step: currentStep,
            toolName: tool,
            arguments: toolArgs,
            resultContent: `[ERROR] ${errorMsg}`,
            isError: true,
            timestamp: Date.now(),
          });

          steps.push({
            stepIndex: currentStep,
            thought: `Attempted to invoke unregistered tool '${tool}'.`,
            actionType: 'tool_call',
            toolName: tool,
            toolArguments: toolArgs,
            isError: true,
            observation: errorMsg,
            latencyMs: Math.round(performance.now() - stepStartTime),
          });

          if (toolFailureRetries >= maxToolFailureRetries) {
            rawFinalAnswer = `[FAILURE]: Exceeded max tool failure retry budget (${maxToolFailureRetries}).`;
            executionStatus = 'failed';
            break;
          }

          currentStep++;
          continue;
        }

        // Execute tool via MCP Client with timeout
        let toolResult: { content: string; isError?: boolean; toolName?: string };
        try {
          toolResult = await this.withTimeout(
            mcpSDKClient.callTool(tool, toolArgs),
            toolTimeoutMs,
            `MCP Tool '${tool}' execution timeout`
          );
        } catch (err: any) {
          toolResult = { content: `[ERROR] Tool execution failed: ${err.message}`, isError: true };
        }

        const obsId = `O${observationLedger.length + 1}`;
        const obsItem: ObservationItem = {
          id: obsId,
          step: currentStep,
          toolName: tool,
          arguments: toolArgs,
          resultContent: toolResult.content,
          isError: Boolean(toolResult.isError),
          timestamp: Date.now(),
        };
        observationLedger.push(obsItem);

        steps.push({
          stepIndex: currentStep,
          thought: `Model selected MCP tool '${tool}' with arguments: ${JSON.stringify(toolArgs)}.`,
          actionType: 'tool_call',
          toolName: tool,
          toolArguments: toolArgs,
          isError: Boolean(toolResult.isError),
          observation: toolResult.content,
          latencyMs: Math.round(performance.now() - stepStartTime),
        });
      } else if (parsedAction.type === 'finish') {
        isFinished = true;
        executionStatus = 'completed';
        rawFinalAnswer = parsedAction.answer;

        steps.push({
          stepIndex: currentStep,
          thought: 'Model issued finish decision after evidence gathering.',
          actionType: 'finish',
          latencyMs: Math.round(performance.now() - stepStartTime),
        });
      }

      currentStep++;
    }

    if (!isFinished && executionStatus === 'failed' && !rawFinalAnswer) {
      rawFinalAnswer = `[FAILURE]: Dynamic agent loop reached max limit of ${maxSteps} steps without reaching finish decision.`;
      executionStatus = 'failed';
    }

    // 5. Wire Task-Derived Reflection Engine & Multi-Step Evidence Recovery Loop (M5 & Gate 6)
    let verdict = reflectionEngine.evaluateDeliverable(objective, rawFinalAnswer, observationLedger);

    // Iterative recovery loop: Executes recommended tool actions while evidence is missing (M5)
    // Strictly obeys global maxSteps budget (Issue 8)
    while (verdict.status === 'needs_more_evidence' && verdict.recommendedAction && currentStep <= maxSteps) {
      const recTool = verdict.recommendedAction.tool;
      const recArgs = verdict.recommendedAction.arguments;

      if (!availableToolNames.has(recTool)) {
        break; // Stop if recommended tool is unavailable
      }

      const stepStartTime = performance.now();
      const recResult = await mcpSDKClient.callTool(recTool, recArgs);
      const obsId = `O${observationLedger.length + 1}`;

      observationLedger.push({
        id: obsId,
        step: currentStep,
        toolName: recTool,
        arguments: recArgs,
        resultContent: recResult.content,
        isError: Boolean(recResult.isError),
        timestamp: Date.now(),
      });

      steps.push({
        stepIndex: currentStep,
        thought: `Reflection recovery pass (Step ${currentStep}/${maxSteps}) executed tool '${recTool}'.`,
        actionType: 'tool_call',
        toolName: recTool,
        toolArguments: recArgs,
        isError: Boolean(recResult.isError),
        observation: recResult.content,
        latencyMs: Math.round(performance.now() - stepStartTime),
      });

      verdict = reflectionEngine.evaluateDeliverable(objective, rawFinalAnswer, observationLedger);
      currentStep++;
    }

    let finalAnswer = rawFinalAnswer;
    if (verdict.revisedOutput && !verdict.passed) {
      finalAnswer = verdict.revisedOutput;
    }

    // 6. Grounded Claim Validation (Gate 5 & Issue 7)
    const groundingResult = claimGroundingValidator.validateSynthesisGrounding(finalAnswer, observationLedger);

    // Grounding & reflection impact execution status: completed cannot be returned if grounding failed or contradicted (Issue 7)
    if (!verdict.passed || !groundingResult.passed) {
      if (liveExecutionFailed) {
        executionStatus = 'failed';
      } else if (verdict.confidence > 0.4 && observationLedger.some((o) => !o.isError) && groundingResult.supportedClaimCount > 0) {
        executionStatus = 'partial';
      } else {
        executionStatus = 'failed';
      }
    }

    const evidenceCitations = observationLedger
      .filter((o) => !o.isError)
      .map((o) => `[Observation ${o.id}] (${o.toolName})`);

    if (!finalAnswer.includes('[Observation') && evidenceCitations.length > 0) {
      finalAnswer = `${finalAnswer}\n\nSupporting Evidence Citations:\n${evidenceCitations.join('\n')}`;
    }

    const totalLatencyMs = Math.round(performance.now() - startTime);

    // Provenance Integrity (Issue 1)
    const decisionSource = isLiveAttempt
      ? 'live_gemini'
      : lastInferenceResult?.decisionSource || 'offline_driver';

    const provider = isLiveAttempt
      ? 'google'
      : lastInferenceResult?.provider || 'offline';

    const isLive = isLiveAttempt || lastInferenceResult?.isRealApi || false;
    const localAttemptId = lastInferenceResult?.localAttemptId || executionId;
    const providerRequestId = lastInferenceResult?.providerRequestId || null;

    const result: AgentLoopExecutionResult = {
      id: executionId,
      objective,
      status: liveExecutionFailed ? 'failed' : executionStatus,
      decisionSource,
      provider,
      modelTarget: model,
      localAttemptId,
      providerRequestId,
      timestamp: timestampStr,
      isLive,
      steps,
      observations: observationLedger,
      finalAnswer,
      groundingResult,
      evidenceCitations,
      totalLatencyMs,
      totalTokens,
      reflectionVerdict: verdict,
    };

    // 7. Save Execution Trace JSON with Provenance (Gate 2 & 15)
    const tracePath = this.saveExecutionTrace(result, model);
    result.tracePath = tracePath;

    return result;
  }

  private extractJsonString(text: string): string {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return braceMatch[0].trim();
    }
    return text.trim();
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    let timer: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer);
    }
  }

  private saveExecutionTrace(result: AgentLoopExecutionResult, _model: ModelName): string {
    if (typeof window !== 'undefined') {
      return `trace_${result.id}`;
    }

    try {
      const tracesDir = path.join(process.cwd(), 'traces');
      if (!fs.existsSync(tracesDir)) {
        fs.mkdirSync(tracesDir, { recursive: true });
      }

      const filename = `trace_${Date.now()}_${result.id.substring(0, 8)}.json`;
      const filePath = path.join(tracesDir, filename);

      const traceRecord = {
        executionId: result.id,
        localAttemptId: result.localAttemptId,
        timestamp: result.timestamp,
        executionMode: result.isLive ? 'model_mediated_mcp' : 'test',
        decisionSource: result.decisionSource,
        provider: result.provider,
        modelTarget: result.modelTarget,
        providerRequestId: result.providerRequestId,
        isLive: result.isLive,
        userObjective: result.objective,
        status: result.status,
        steps: result.steps,
        observations: result.observations,
        reflectionVerdict: result.reflectionVerdict,
        groundingResult: result.groundingResult,
        finalAnswer: result.finalAnswer,
        evidenceCitations: result.evidenceCitations,
        metrics: {
          totalLatencyMs: result.totalLatencyMs,
          totalTokens: result.totalTokens,
          observationCount: result.observations.length,
          errorCount: result.observations.filter((o) => o.isError).length,
        },
      };

      fs.writeFileSync(filePath, JSON.stringify(traceRecord, null, 2), 'utf-8');
      return filePath;
    } catch {
      return `trace_${result.id}`;
    }
  }
}

export const dynamicAgentRunner = new DynamicAgentLoopRunner();
