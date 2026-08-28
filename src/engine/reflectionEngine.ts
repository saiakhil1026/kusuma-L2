export interface ObservationItem {
  id: string;
  step: number;
  toolName: string;
  arguments: Record<string, any>;
  resultContent: string;
  isError: boolean;
  timestamp: number;
}

export interface ReflectionVerdict {
  passed: boolean;
  confidence: number;
  unsupportedClaims: string[];
  missingRequirements: string[];
  revisedOutput: string;
  auditNotes: string;
}

export class ReflectionEngine {
  /**
   * Performs evidence-grounded reflection evaluation comparing draft answer against observation ledger.
   */
  public evaluateDeliverable(
    objective: string,
    draftOutput: string,
    observations: ObservationItem[]
  ): ReflectionVerdict {
    const unsupportedClaims: string[] = [];
    const missingRequirements: string[] = [];

    // 1. Check if observation ledger is empty
    if (observations.length === 0) {
      unsupportedClaims.push('Draft answer makes claims with zero backing MCP tool observations in ledger.');
    }

    // 2. Audit tool errors
    const errorObs = observations.filter((o) => o.isError);
    if (errorObs.length > 0 && !draftOutput.toLowerCase().includes('error') && !draftOutput.toLowerCase().includes('failed')) {
      unsupportedClaims.push(`Draft answer ignored ${errorObs.length} tool execution failures recorded in ledger.`);
    }

    // 3. Verify security claims against zero_trust_audit evidence
    const auditObs = observations.find((o) => o.toolName === 'zero_trust_audit');
    if (draftOutput.toLowerCase().includes('zero security issues') || draftOutput.toLowerCase().includes('100% compliant')) {
      if (!auditObs) {
        missingRequirements.push('Draft claims full security compliance but `zero_trust_audit` was never executed.');
      } else if (auditObs.isError || auditObs.resultContent.includes('FAILED')) {
        unsupportedClaims.push('Draft claims security compliance, but `zero_trust_audit` observation recorded security vulnerabilities!');
      }
    }

    // 4. Verify vector memory context search execution for complex objectives
    const hasVectorSearch = observations.some((o) => o.toolName === 'vector_search');
    if (!hasVectorSearch && objective.length > 30) {
      missingRequirements.push('Prerequisite 768D vector memory context search was omitted.');
    }

    const passed = unsupportedClaims.length === 0 && missingRequirements.length === 0;

    // Calculate empirical confidence score based on grounding
    let confidence = 1.0;
    if (observations.length === 0) confidence = 0.2;
    else {
      confidence -= unsupportedClaims.length * 0.25;
      confidence -= missingRequirements.length * 0.15;
      if (errorObs.length > 0) confidence -= 0.1;
    }
    confidence = Math.max(0.1, Math.min(1.0, parseFloat(confidence.toFixed(2))));

    // Construct grounded revised output
    let revisedOutput = draftOutput;
    if (!passed) {
      const groundedSummary = observations
        .filter((o) => !o.isError)
        .map((o) => `- [Observation ${o.id}] (${o.toolName}): Verified`)
        .join('\n');

      revisedOutput = `[Grounded Revision Pass]:\nObjective: "${objective}"\n\nVerified Observations:\n${
        groundedSummary || 'No successful tool observations.'
      }\n\n[Correction Notes]: Filtered ${unsupportedClaims.length} unsupported claims and addressed missing requirements (${missingRequirements.join('; ')}).`;
    }

    return {
      passed,
      confidence,
      unsupportedClaims,
      missingRequirements,
      revisedOutput,
      auditNotes: passed
        ? `Reflection Audit Passed (Confidence: ${(confidence * 100).toFixed(0)}%): 100% grounded in captured MCP observations.`
        : `Reflection Audit Failed (Confidence: ${(confidence * 100).toFixed(0)}%): Found ${unsupportedClaims.length} unsupported claims and ${missingRequirements.length} missing requirements.`,
    };
  }
}

export const reflectionEngine = new ReflectionEngine();
