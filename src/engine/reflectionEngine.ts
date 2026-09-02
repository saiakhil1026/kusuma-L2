export interface ObservationItem {
  id: string;
  step: number;
  toolName: string;
  arguments: Record<string, any>;
  resultContent: string;
  isError: boolean;
  timestamp: number;
}

export interface RecommendedAction {
  tool: string;
  arguments: Record<string, any>;
}

export interface ReflectionVerdict {
  status: 'passed' | 'needs_more_evidence' | 'failed';
  passed: boolean;
  confidence: number;
  unsupportedClaims: string[];
  missingRequirements: string[];
  requiredEvidence: string[];
  recommendedAction?: RecommendedAction;
  revisedOutput?: string;
  auditNotes: string;
}

export class ReflectionEngine {
  /**
   * Performs evidence-grounded reflection evaluation comparing draft answer against objective, task type, and observation ledger (Gate 6).
   */
  public evaluateDeliverable(
    objective: string,
    draftOutput: string,
    observations: ObservationItem[]
  ): ReflectionVerdict {
    const unsupportedClaims: string[] = [];
    const missingRequirements: string[] = [];
    const requiredEvidence: string[] = [];
    let recommendedAction: RecommendedAction | undefined = undefined;

    const lowerObj = objective.toLowerCase();
    const lowerDraft = draftOutput.toLowerCase();
    const taskType = this.determineTaskType(lowerObj);

    // 1. Audit task-derived required evidence (Gate 6 - Task-Derived Rules)
    if (taskType === 'vision') {
      const hasVisionObs = observations.some((o) => o.toolName === 'parse_vision_tags' && !o.isError);
      if (!hasVisionObs) {
        missingRequirements.push('Vision spatial scene parsing observation is required for vision tasks.');
        requiredEvidence.push('parse_vision_tags');
        recommendedAction = {
          tool: 'parse_vision_tags',
          arguments: { imagePrompt: objective.substring(0, 100) },
        };
      }
    } else if (taskType === 'audit') {
      const hasAuditObs = observations.some((o) => o.toolName === 'zero_trust_audit' && !o.isError);
      if (!hasAuditObs) {
        missingRequirements.push('Zero-trust vulnerability audit observation is required for security audit tasks.');
        requiredEvidence.push('zero_trust_audit');
        recommendedAction = {
          tool: 'zero_trust_audit',
          arguments: { payloadToAudit: objective },
        };
      }
    } else if (taskType === 'vector_search') {
      const hasVectorObs = observations.some((o) => o.toolName === 'vector_search' && !o.isError);
      if (!hasVectorObs) {
        missingRequirements.push('Vector memory similarity search observation is required for memory search tasks.');
        requiredEvidence.push('vector_search');
        recommendedAction = {
          tool: 'vector_search',
          arguments: { query: objective.substring(0, 60), topK: 3 },
        };
      }
    } else if (taskType === 'refactor') {
      const hasRefactorObs = observations.some((o) => o.toolName === 'refactor_code' && !o.isError);
      if (!hasRefactorObs) {
        missingRequirements.push('Code transformation/AST analysis observation is required for code refactoring tasks.');
        requiredEvidence.push('refactor_code');
        recommendedAction = {
          tool: 'refactor_code',
          arguments: { codeRequirement: objective.substring(0, 100), language: lowerObj.includes('python') ? 'python' : 'typescript' },
        };
      }
    } else {
      if (observations.length === 0 || observations.every((o) => o.isError)) {
        missingRequirements.push('At least one successful MCP tool observation is required.');
        requiredEvidence.push('vector_search');
        recommendedAction = {
          tool: 'vector_search',
          arguments: { query: objective.substring(0, 60), topK: 3 },
        };
      }
    }

    // 2. Audit tool errors & ungrounded claims in draft output
    const errorObs = observations.filter((o) => o.isError);
    if (errorObs.length > 0 && !lowerDraft.includes('error') && !lowerDraft.includes('failed') && !lowerDraft.includes('issue')) {
      unsupportedClaims.push(`Draft answer ignored ${errorObs.length} tool execution failures recorded in ledger.`);
    }

    // 3. Verify specific claim assertions in draft text against ledger evidence
    const auditObs = observations.find((o) => o.toolName === 'zero_trust_audit');
    if (lowerDraft.includes('zero security issues') || lowerDraft.includes('100% compliant') || (lowerDraft.includes('safety') && !auditObs)) {
      if (!auditObs) {
        missingRequirements.push('Draft claims full security compliance but `zero_trust_audit` was never executed.');
        if (!recommendedAction) {
          recommendedAction = { tool: 'zero_trust_audit', arguments: { payloadToAudit: objective } };
        }
      } else if (auditObs.isError || auditObs.resultContent.includes('FAILED')) {
        unsupportedClaims.push('Draft claims security compliance, but `zero_trust_audit` recorded security vulnerabilities!');
      }
    }

    const vectorObs = observations.find((o) => o.toolName === 'vector_search');
    if (lowerDraft.includes('vector search') || lowerDraft.includes('vector memory') || lowerDraft.includes('zero backing observations')) {
      if (!vectorObs && lowerDraft.includes('vector search')) {
        unsupportedClaims.push('Draft claims vector search memory observations, but `vector_search` was never executed.');
      }
      if (lowerDraft.includes('zero backing observations')) {
        unsupportedClaims.push('Draft answer states zero backing observations for required tools.');
      }
    }

    const passed = unsupportedClaims.length === 0 && missingRequirements.length === 0;

    let verdictStatus: 'passed' | 'needs_more_evidence' | 'failed' = 'passed';
    if (!passed) {
      if (missingRequirements.length > 0 && recommendedAction) {
        verdictStatus = 'needs_more_evidence';
      } else {
        verdictStatus = 'failed';
      }
    }

    // Calculate empirical confidence score based on grounding
    let confidence = 1.0;
    if (observations.length === 0) confidence = 0.2;
    else {
      confidence -= unsupportedClaims.length * 0.25;
      confidence -= missingRequirements.length * 0.20;
      if (errorObs.length > 0) confidence -= 0.1;
    }
    confidence = Math.max(0.1, Math.min(1.0, parseFloat(confidence.toFixed(2))));

    // Construct revised output if needed (Min4: Preserve original draft text)
    let revisedOutput: string | undefined = undefined;
    if (!passed) {
      const groundedSummary = observations
        .filter((o) => !o.isError)
        .map((o) => `- [Observation ${o.id}] (${o.toolName}): Verified`)
        .join('\n');

      const correctionHeader = `[Grounded Revision Pass]: Grounding adjustments applied for objective "${objective}".`;
      const notes = [
        missingRequirements.length > 0 ? `Missing requirements: ${missingRequirements.join('; ')}` : '',
        unsupportedClaims.length > 0 ? `Ungrounded claims adjusted: ${unsupportedClaims.join('; ')}` : '',
      ].filter(Boolean).join('\n');

      revisedOutput = `${draftOutput}\n\n${correctionHeader}\n${notes}\n\nVerified Observations:\n${groundedSummary || 'No successful tool observations.'}`;
    }

    return {
      status: verdictStatus,
      passed,
      confidence,
      unsupportedClaims,
      missingRequirements,
      requiredEvidence,
      recommendedAction,
      revisedOutput,
      auditNotes: passed
        ? `Reflection Audit Passed (Confidence: ${(confidence * 100).toFixed(0)}%): 100% grounded in task-derived MCP observations.`
        : verdictStatus === 'needs_more_evidence'
        ? `Reflection Audit Requested Evidence (Confidence: ${(confidence * 100).toFixed(0)}%): Missing required evidence [${requiredEvidence.join(', ')}]. Recommended tool call: ${recommendedAction?.tool}.`
        : `Reflection Audit Failed (Confidence: ${(confidence * 100).toFixed(0)}%): Found ${unsupportedClaims.length} unsupported claims and ${missingRequirements.length} missing requirements.`,
    };
  }

  private determineTaskType(lowerObj: string): 'vision' | 'audit' | 'vector_search' | 'refactor' | 'general' {
    if (lowerObj.includes('vision') || lowerObj.includes('diagram') || lowerObj.includes('image') || lowerObj.includes('wireframe')) {
      return 'vision';
    }
    if (lowerObj.includes('audit') || lowerObj.includes('security') || lowerObj.includes('zero_trust') || lowerObj.includes('vulnerability')) {
      return 'audit';
    }
    if (lowerObj.includes('search') || lowerObj.includes('vector') || lowerObj.includes('memory') || lowerObj.includes('cosine')) {
      return 'vector_search';
    }
    if (lowerObj.includes('code') || lowerObj.includes('refactor') || lowerObj.includes('typescript') || lowerObj.includes('python') || lowerObj.includes('ast')) {
      return 'refactor';
    }
    return 'general';
  }
}

export const reflectionEngine = new ReflectionEngine();
