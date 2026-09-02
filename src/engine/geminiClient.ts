import { GoogleGenAI } from '@google/genai';
import type { ModelName, AgentId } from '../types';

export function getGeminiApiKey(): string {
  if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  return '';
}

export interface InferenceResult {
  text: string;
  tokens: number;
  latencyMs: number;
  isRealApi: boolean;
  decisionSource: 'live_gemini' | 'offline_driver';
  provider: 'google' | 'offline';
  modelTarget: ModelName;
  localAttemptId: string;
  providerRequestId: string | null;
  timestamp: string;
}

export async function executeAgentInference(
  _agentId: AgentId,
  model: ModelName,
  prompt: string,
  extraContext?: string,
  imagePayload?: string,
  options?: { forceOffline?: boolean }
): Promise<InferenceResult> {
  const activeKey = getGeminiApiKey();
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  const localAttemptId = `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const isTestEnv = typeof process !== 'undefined' && (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test');
  const shouldUseLiveApi = Boolean(activeKey) && !isTestEnv && !options?.forceOffline;

  if (shouldUseLiveApi) {
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });

      const parts: any[] = [{ text: prompt }];
      if (extraContext) {
        parts.unshift({ text: `[Prerequisite Memory Context]:\n${extraContext}\n\n[Task Prompt]:` });
      }

      if (imagePayload && imagePayload.includes('data:image')) {
        const base64Data = imagePayload.split(',')[1];
        const mimeType = imagePayload.substring(imagePayload.indexOf(':') + 1, imagePayload.indexOf(';'));
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const response: any = await ai.models.generateContent({
        model: model,
        contents: parts,
      });

      const text = response.text || 'No response text returned.';
      const latencyMs = Math.round(performance.now() - startTime);

      // Token Accounting: Use actual provider-reported usageMetadata when available (Issue 1)
      const providerTokens = response.usageMetadata?.totalTokenCount;
      const tokens = typeof providerTokens === 'number' && providerTokens > 0
        ? providerTokens
        : Math.max(12, Math.floor(text.length / 3.8));

      // Provider Request ID: ONLY populate if Gemini actually returns a responseId or id (Issue 1)
      const providerRequestId = (response.responseId || response.id || null);

      return {
        text,
        tokens,
        latencyMs,
        isRealApi: true,
        decisionSource: 'live_gemini',
        provider: 'google',
        modelTarget: model,
        localAttemptId,
        providerRequestId,
        timestamp,
      };
    } catch (err: any) {
      throw new Error(`Google Gemini Live API Call Failed: ${err.message || String(err)}`);
    }
  }

  // Local model decision driver for deterministic offline test suites and unconfigured API keys (Gate 2)
  const latencyMs = Math.round(performance.now() - startTime);
  const text = generateDynamicModelDecisionText(prompt);
  const tokens = Math.floor(text.length / 3.5);

  return {
    text,
    tokens,
    latencyMs,
    isRealApi: false,
    decisionSource: 'offline_driver',
    provider: 'offline',
    modelTarget: model,
    localAttemptId,
    providerRequestId: null,
    timestamp,
  };
}

function generateDynamicModelDecisionText(prompt: string): string {
  const objMatch = prompt.match(/\[Objective\]:\s*([\s\S]*?)(?=\n\[|$)/i);
  const objText = objMatch ? objMatch[1] : prompt;
  const lowerObj = objText.toLowerCase();

  const hasVectorObs = prompt.includes('"toolName": "vector_search"');
  const hasRefactorObs = prompt.includes('"toolName": "refactor_code"');
  const hasAuditObs = prompt.includes('"toolName": "zero_trust_audit"');
  const hasVisionObs = prompt.includes('"toolName": "parse_vision_tags"');
  const hasErrorObs = prompt.includes('isError": true') || prompt.includes('[ERROR]');

  if ((lowerObj.includes('trigger_error') || lowerObj.includes('tool-error-recovery')) && !hasErrorObs) {
    return JSON.stringify({
      type: 'tool_call',
      tool: 'non_existent_tool',
      arguments: { query: 'trigger_error_recovery' },
    });
  }

  if (hasErrorObs && !hasAuditObs) {
    return JSON.stringify({
      type: 'tool_call',
      tool: 'zero_trust_audit',
      arguments: {
        payloadToAudit: 'export class SecurityCheck { sanitize() { return true; } }',
      },
    });
  }

  if (lowerObj.includes('search') || lowerObj.includes('vector') || lowerObj.includes('memory') || lowerObj.includes('context')) {
    if (!hasVectorObs) {
      return JSON.stringify({
        type: 'tool_call',
        tool: 'vector_search',
        arguments: {
          query: extractSearchQuery(objText),
          topK: 3,
        },
      });
    }
    return JSON.stringify({
      type: 'finish',
      answer: 'Retrieved 768D vector similarity context memory. [Observation O1]',
    });
  }

  if (lowerObj.includes('audit') || lowerObj.includes('security') || lowerObj.includes('zero_trust') || lowerObj.includes('safe') || lowerObj.includes('unsafe')) {
    if (!hasAuditObs) {
      return JSON.stringify({
        type: 'tool_call',
        tool: 'zero_trust_audit',
        arguments: {
          payloadToAudit: extractPayloadForAudit(objText),
        },
      });
    }
    return JSON.stringify({
      type: 'finish',
      answer: 'Completed zero-trust safety audit and schema validation check. [Observation O1]',
    });
  }

  if (lowerObj.includes('vision') || lowerObj.includes('diagram') || lowerObj.includes('wireframe') || lowerObj.includes('image')) {
    if (!hasVisionObs) {
      return JSON.stringify({
        type: 'tool_call',
        tool: 'parse_vision_tags',
        arguments: {
          imagePrompt: objText.substring(0, 100),
        },
      });
    }
    return JSON.stringify({
      type: 'finish',
      answer: 'Completed vision spatial diagram analytics. [Observation O1]',
    });
  }

  if (lowerObj.includes('code') || lowerObj.includes('refactor') || lowerObj.includes('typescript') || lowerObj.includes('python')) {
    if (!hasRefactorObs) {
      return JSON.stringify({
        type: 'tool_call',
        tool: 'refactor_code',
        arguments: {
          codeRequirement: objText.substring(0, 120),
          language: lowerObj.includes('python') ? 'python' : 'typescript',
        },
      });
    }
    return JSON.stringify({
      type: 'finish',
      answer: 'Synthesized type-safe code implementation matching requirement. [Observation O1]',
    });
  }

  if (!hasVectorObs) {
    return JSON.stringify({
      type: 'tool_call',
      tool: 'vector_search',
      arguments: {
        query: extractSearchQuery(objText),
        topK: 3,
      },
    });
  }

  return JSON.stringify({
    type: 'finish',
    answer: `Completed objective after evidence gathering. Verified context search, refactoring requirements, and zero-trust audit compliance. [Observation O1]`,
  });
}

function extractSearchQuery(objText: string): string {
  return objText.substring(0, 60).trim();
}

function extractPayloadForAudit(objText: string): string {
  if (objText.includes('export ') || objText.includes('const ') || objText.includes('function ')) {
    return objText.trim();
  }
  return `export function validateInput(val: string): boolean { return val.length > 0; }`;
}
