import type { ObservationItem } from './agentLoop';

export interface GroundedClaim {
  text: string;
  observationIds: string[];
  isSupported: boolean;
  reason?: string;
}

export interface GroundedSynthesisResult {
  claims: GroundedClaim[];
  answer: string;
  status: 'grounded' | 'unsupported' | 'partially_grounded';
  supportedClaimCount: number;
  totalClaimCount: number;
  groundednessPct: number;
}

export class ClaimGroundingValidator {
  /**
   * Verifies each claim against observation ledger items (Gate 5).
   * Ensures observation IDs exist in run, belong to current run, and contain supporting evidence.
   */
  public validateSynthesisGrounding(
    rawAnswer: string,
    observations: ObservationItem[]
  ): GroundedSynthesisResult {
    const validObsMap = new Map<string, ObservationItem>();
    observations.forEach((o) => validObsMap.set(o.id, o));

    const claimTexts = this.extractFactualClaims(rawAnswer);
    const claims: GroundedClaim[] = [];

    for (const claimText of claimTexts) {
      const citedObsIds = this.extractCitedObsIds(claimText);

      if (citedObsIds.length === 0) {
        claims.push({
          text: claimText,
          observationIds: [],
          isSupported: false,
          reason: 'No observation citation provided for claim.',
        });
        continue;
      }

      const validCitedIds: string[] = [];
      let hasSupportingEvidence = false;

      for (const obsId of citedObsIds) {
        const obs = validObsMap.get(obsId);
        if (!obs) {
          continue;
        }

        if (obs.isError) {
          continue;
        }

        validCitedIds.push(obsId);

        if (this.doesObservationSupportClaim(claimText, obs)) {
          hasSupportingEvidence = true;
        }
      }

      if (validCitedIds.length > 0 && hasSupportingEvidence) {
        claims.push({
          text: claimText,
          observationIds: validCitedIds,
          isSupported: true,
        });
      } else {
        claims.push({
          text: claimText,
          observationIds: validCitedIds,
          isSupported: false,
          reason: validCitedIds.length === 0
            ? 'Cited observation ID does not exist in current execution ledger.'
            : 'Cited observation content does not contain evidence supporting claim.',
        });
      }
    }

    const totalClaimCount = claims.length;
    const supportedClaimCount = claims.filter((c) => c.isSupported).length;
    const groundednessPct = totalClaimCount > 0
      ? parseFloat(((supportedClaimCount / totalClaimCount) * 100).toFixed(1))
      : 0;

    let status: 'grounded' | 'unsupported' | 'partially_grounded' = 'grounded';
    if (supportedClaimCount === 0 && totalClaimCount > 0) {
      status = 'unsupported';
    } else if (supportedClaimCount < totalClaimCount) {
      status = 'partially_grounded';
    }

    return {
      claims,
      answer: rawAnswer,
      status,
      supportedClaimCount,
      totalClaimCount,
      groundednessPct,
    };
  }

  private extractFactualClaims(answerText: string): string[] {
    const cleanText = answerText.replace(/Supporting Evidence Citations:[\s\S]*/, '').trim();
    
    // Split on lines or paragraphs to keep citations grouped with claim text
    const parts = cleanText
      .split(/\n+|\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5 && !s.startsWith('[Grounded Revision') && !s.startsWith('Objective:'));

    return parts.length > 0 ? parts : [cleanText];
  }

  private extractCitedObsIds(text: string): string[] {
    const matches = text.match(/\[Observation\s+(O\d+|\w+)\]/g) || text.match(/\bO\d+\b/g);
    if (!matches) return [];

    const ids = new Set<string>();
    matches.forEach((m) => {
      const cleanId = m.replace(/\[Observation\s+/, '').replace(/\]/, '').trim();
      ids.add(cleanId);
    });
    return Array.from(ids);
  }

  private doesObservationSupportClaim(claim: string, obs: ObservationItem): boolean {
    const lowerClaim = claim.toLowerCase();
    const lowerContent = obs.resultContent.toLowerCase();
    const lowerTool = obs.toolName.toLowerCase();

    if (lowerTool === 'vector_search' && (lowerClaim.includes('vector') || lowerClaim.includes('search') || lowerClaim.includes('memory') || lowerClaim.includes('retrieved') || lowerClaim.includes('found'))) {
      return true;
    }

    if (lowerTool === 'zero_trust_audit' && (lowerClaim.includes('audit') || lowerClaim.includes('security') || lowerClaim.includes('vulnerability') || lowerClaim.includes('compliant') || lowerClaim.includes('passed'))) {
      return true;
    }

    if (lowerTool === 'refactor_code' && (lowerClaim.includes('code') || lowerClaim.includes('refactor') || lowerClaim.includes('typescript') || lowerClaim.includes('python') || lowerClaim.includes('syntax'))) {
      return true;
    }

    if (lowerTool === 'parse_vision_tags' && (lowerClaim.includes('vision') || lowerClaim.includes('diagram') || lowerClaim.includes('image') || lowerClaim.includes('tag') || lowerClaim.includes('scene'))) {
      return true;
    }

    if (lowerTool === 'store_memory' && (lowerClaim.includes('store') || lowerClaim.includes('index') || lowerClaim.includes('memory'))) {
      return true;
    }

    const claimWords = lowerClaim.split(/\W+/).filter((w) => w.length > 3);
    const contentWords = new Set(lowerContent.split(/\W+/));
    const overlap = claimWords.filter((w) => contentWords.has(w));

    return overlap.length >= 1;
  }
}

export const claimGroundingValidator = new ClaimGroundingValidator();
