import { z } from 'zod';
import { mcpSDKClient } from '../mcp/nexusMcpClient';
import { executeAgentInference } from './geminiClient';
import { reflectionEngine, type ReflectionVerdict } from './reflectionEngine';
import type { ModelName } from '../types';

// Runtime Zod Schemas for Model Actions (Priority 4)
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

export interface AgentLoopExecutionResult {
  id: string;
  objective: string;
  status: 'completed' | 'failed';
  steps: AgentLoopStep[];
  observations: ObservationItem[];
  finalAnswer: string;
  evidenceCitations: string[];
  totalLatencyMs: number;
  totalTokens: number;
  reflectionVerdict: ReflectionVerdict;
  tracePath?: string;
}

export class DynamicAgentLoopRunner {
  private observationLedger: ObservationItem[] = [];

  public async runDynamicLoop(
    objective: string,
    model: ModelName = 'gemini-3.7-flash',
    maxSteps: number = 6
  ): Promise<AgentLoopExecutionResult> {
    const startTime = performance.now();
    const executionId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.observationLedger = [];
    const steps: AgentLoopStep[] = [];
    let currentStep = 1;
    let isFinished = false;
    let rawFinalAnswer = '';
    let totalTokens = 0;
    let executionStatus: 'completed' | 'failed' = 'failed';

    // Discover tools from real MCP Client (Priority 2)
    const mcpTools = await mcpSDKClient.listTools();
    const availableToolNames = new Set(mcpTools.map((t) => t.name));

    while (currentStep <= maxSteps && !isFinished) {
      const stepStartTime = performance.now();

      // 1. Build prompt context with ledger history (Priority 1)
      const promptContext = `[Objective]: ${objective}
[Observation Ledger]:
${
  this.observationLedger.length > 0
    ? JSON.stringify(this.observationLedger, null, 2)
    : 'No observations recorded yet.'
}

[Available MCP Tools]:
${JSON.stringify(mcpTools, null, 2)}

[Instruction]: Respond strictly with a single valid JSON object representing your next action.
Option A (Tool Call):
{"type": "tool_call", "tool": "<registered_tool_name>", "arguments": { ... }}

Option B (Finish):
{"type": "finish", "answer": "<consolidated_grounded_answer>"}`;

      // 2. Call Gemini model / driver
      const inference = await executeAgentInference('orchestrator', model, promptContext);
      totalTokens += inference.tokens;

      // 3. Parse & Validate Model Response against Zod Schema (Priority 1 & 4)
      let parsedAction: AgentAction | null = null;
      try {
        const jsonText = this.extractJsonString(inference.text);
        const rawJson = JSON.parse(jsonText);
        parsedAction = AgentActionSchema.parse(rawJson);
      } catch (err: any) {
        // Handle malformed model response (Priority 5)
        const obsId = `O${this.observationLedger.length + 1}`;
        const errorMsg = `Malformed model action response: ${err.message}`;
        this.observationLedger.push({
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
          thought: `Received malformed model response. Emitted error observation to ledger for recovery.`,
          actionType: 'tool_call',
          isError: true,
          observation: errorMsg,
          latencyMs: Math.round(performance.now() - stepStartTime),
        });

        currentStep++;
        continue;
      }

      // 4. Handle Action: Tool Call
      if (parsedAction.type === 'tool_call') {
        const { tool, arguments: toolArgs } = parsedAction;

        // Check if selected tool exists (Priority 1 & 4)
        if (!availableToolNames.has(tool)) {
          const obsId = `O${this.observationLedger.length + 1}`;
          const errorMsg = `Tool '${tool}' is not registered in MCP server. Available tools: ${Array.from(availableToolNames).join(', ')}`;
          this.observationLedger.push({
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
            thought: `Attempted to invoke unregistered tool '${tool}'. Added error observation to ledger.`,
            actionType: 'tool_call',
            toolName: tool,
            toolArguments: toolArgs,
            isError: true,
            observation: errorMsg,
            latencyMs: Math.round(performance.now() - stepStartTime),
          });

          currentStep++;
          continue;
        }

        // Execute tool via MCP SDK Client (Priority 2)
        const toolResult = await mcpSDKClient.callTool(tool, toolArgs);
        const obsId = `O${this.observationLedger.length + 1}`;

        const obsItem: ObservationItem = {
          id: obsId,
          step: currentStep,
          toolName: tool,
          arguments: toolArgs,
          resultContent: toolResult.content,
          isError: Boolean(toolResult.isError),
          timestamp: Date.now(),
        };
        this.observationLedger.push(obsItem);

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
        // 5. Handle Action: Finish
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

    if (!isFinished) {
      rawFinalAnswer = `[FAILURE]: Dynamic agent loop reached max limit of ${maxSteps} steps without reaching finish decision.`;
      executionStatus = 'failed';
    }

    // 6. Wire Reflection Engine into Production (Priority 6)
    let verdict = reflectionEngine.evaluateDeliverable(objective, rawFinalAnswer, this.observationLedger);

    // If reflection fails on completed executions, run revision pass using reflectionEngine's revised output (Priority 6)
    let finalAnswer = rawFinalAnswer;
    if (executionStatus === 'completed' && !verdict.passed && verdict.revisedOutput) {
      finalAnswer = verdict.revisedOutput;
      // Re-evaluate revised output
      verdict = reflectionEngine.evaluateDeliverable(objective, finalAnswer, this.observationLedger);
    }

    // 7. Grounded Final Synthesis & Citations (Priority 7)
    const evidenceCitations = this.observationLedger
      .filter((o) => !o.isError)
      .map((o) => `[Observation ${o.id}] (${o.toolName})`);

    if (!finalAnswer.includes('[Observation') && evidenceCitations.length > 0) {
      finalAnswer = `${finalAnswer}\n\nSupporting Evidence Citations:\n${evidenceCitations.join('\n')}`;
    }

    const totalLatencyMs = Math.round(performance.now() - startTime);

    const result: AgentLoopExecutionResult = {
      id: executionId,
      objective,
      status: executionStatus,
      steps,
      observations: this.observationLedger,
      finalAnswer,
      evidenceCitations,
      totalLatencyMs,
      totalTokens,
      reflectionVerdict: verdict,
    };

    // 8. Automatically Generate Execution Trace JSON (Priority 12)
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

  private saveExecutionTrace(result: AgentLoopExecutionResult, model: ModelName): string {
    if (typeof window !== 'undefined') {
      return `trace_${result.id}`;
    }

    try {
      // Node environment trace persisting
      const reqFs = 'fs';
      const reqPath = 'path';
      const fs = require(reqFs);
      const path = require(reqPath);

      const tracesDir = path.join(process.cwd(), 'traces');
      if (!fs.existsSync(tracesDir)) {
        fs.mkdirSync(tracesDir, { recursive: true });
      }

      const filename = `trace_${Date.now()}_${result.id.substring(0, 8)}.json`;
      const filePath = path.join(tracesDir, filename);

      const traceRecord = {
        executionId: result.id,
        timestamp: new Date().toISOString(),
        executionMode: 'model_mediated_mcp',
        modelTarget: model,
        userObjective: result.objective,
        status: result.status,
        steps: result.steps,
        observations: result.observations,
        reflectionVerdict: result.reflectionVerdict,
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
    } catch (err: any) {
      console.warn('Trace save note:', err.message);
      return '';
    }
  }
}

export const dynamicAgentRunner = new DynamicAgentLoopRunner();
