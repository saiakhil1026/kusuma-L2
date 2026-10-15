import type { ObservationItem } from './agentLoop';

export interface GroundedClaim {
  text: string;
  observationIds: string[];
  isSupported: boolean;
  isContradicted: boolean;
  supportStatus: 'supported' | 'unsupported' | 'contradicted';
  reason?: string;
}

export interface GroundedSynthesisResult {
  claims: GroundedClaim[];
  answer: string;
  status: 'grounded' | 'unsupported' | 'partially_grounded' | 'contradicted';
  supportedClaimCount: number;
  unsupportedClaimsCount: number;
  contradictedClaimCount: number;
  totalClaimCount: number;
  groundednessPct: number;
  passed: boolean;
}

export class ClaimGroundingValidator {
  /**
   * Performs semantic claim-level grounding validation against the observation ledger (Issue 7).
   * Extracts claims from final answer, maps to evidence, detects contradictions, and calculates groundedness.
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

      // If no citation, try matching against all observations in ledger
      const obsToUse = citedObsIds.length > 0
        ? citedObsIds.map((id) => validObsMap.get(id)).filter(Boolean) as ObservationItem[]
        : observations.filter((o) => !o.isError);

      if (obsToUse.length === 0) {
        claims.push({
          text: claimText,
          observationIds: [],
          isSupported: false,
          isContradicted: false,
          supportStatus: 'unsupported',
          reason: 'No valid observation evidence available for claim.',
        });
        continue;
      }

      let foundContradiction = false;
      let contradictionReason = '';
      let hasSupportingEvidence = false;
      const validCitedIds: string[] = [];

      for (const obs of obsToUse) {
        if (obs.isError) continue;
        validCitedIds.push(obs.id);

        const checkResult = this.evaluateClaimAgainstObservation(claimText, obs);
        if (checkResult.isContradicted) {
          foundContradiction = true;
          contradictionReason = checkResult.reason || 'Claim contradicts observation data.';
          break;
        }
        if (checkResult.isSupported) {
          hasSupportingEvidence = true;
        }
      }

      if (foundContradiction) {
        claims.push({
          text: claimText,
          observationIds: validCitedIds,
          isSupported: false,
          isContradicted: true,
          supportStatus: 'contradicted',
          reason: contradictionReason,
        });
      } else if (hasSupportingEvidence) {
        claims.push({
          text: claimText,
          observationIds: validCitedIds,
          isSupported: true,
          isContradicted: false,
          supportStatus: 'supported',
        });
      } else {
        claims.push({
          text: claimText,
          observationIds: validCitedIds,
          isSupported: false,
          isContradicted: false,
          supportStatus: 'unsupported',
          reason: 'Cited observation does not contain factual evidence supporting claim.',
        });
      }
    }

    const totalClaimCount = claims.length;
    const supportedClaimCount = claims.filter((c) => c.isSupported).length;
    const unsupportedClaimsCount = claims.filter((c) => c.supportStatus === 'unsupported').length;
    const contradictedClaimCount = claims.filter((c) => c.isContradicted).length;

    const groundednessPct = totalClaimCount > 0
      ? parseFloat(((supportedClaimCount / totalClaimCount) * 100).toFixed(1))
      : 0;

    let status: 'grounded' | 'unsupported' | 'partially_grounded' | 'contradicted' = 'grounded';
    if (contradictedClaimCount > 0) {
      status = 'contradicted';
    } else if (supportedClaimCount === 0 && totalClaimCount > 0) {
      status = 'unsupported';
    } else if (supportedClaimCount < totalClaimCount) {
      status = 'partially_grounded';
    }

    const passed = status === 'grounded' && contradictedClaimCount === 0;

    return {
      claims,
      answer: rawAnswer,
      status,
      supportedClaimCount,
      unsupportedClaimsCount,
      contradictedClaimCount,
      totalClaimCount,
      groundednessPct,
      passed,
    };
  }

  private extractFactualClaims(answerText: string): string[] {
    const cleanText = answerText.replace(/Supporting Evidence Citations:[\s\S]*/, '').trim();
    
    const parts = cleanText
      .split(/\n+|\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5 && !s.endsWith(':') && !s.startsWith('[Grounded Revision') && !s.startsWith('Objective:'));

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

  private evaluateClaimAgainstObservation(claim: string, obs: ObservationItem): { isSupported: boolean; isContradicted: boolean; reason?: string } {
    const lowerClaim = claim.toLowerCase();
    const lowerContent = obs.resultContent.toLowerCase();

    // 1. Semantic Contradiction Check
    const claimClaimsNoVulns = lowerClaim.includes('no vulnerabilities') || lowerClaim.includes('zero vulnerabilities') || lowerClaim.includes('no security flaws') || lowerClaim.includes('100% secure') || lowerClaim.includes('no issues found');
    const obsHasVulns = lowerContent.includes('critical vulnerabilities') || lowerContent.includes('vulnerability') || lowerContent.includes('sql injection') || lowerContent.includes('xss') || lowerContent.includes('insecure');

    if (claimClaimsNoVulns && obsHasVulns) {
      return {
        isSupported: false,
        isContradicted: true,
        reason: `Claim asserts "${claim}" but observation ${obs.id} reports vulnerabilities in payload: "${obs.resultContent.substring(0, 100)}..."`,
      };
    }

    const claimClaimsSuccess = lowerClaim.includes('completed successfully') || lowerClaim.includes('passed') || lowerClaim.includes('verified');
    const obsHasFailure = obs.isError || lowerContent.includes('[error]') || lowerContent.includes('failed') || lowerContent.includes('unsupported');

    if (claimClaimsSuccess && obsHasFailure) {
      return {
        isSupported: false,
        isContradicted: true,
        reason: `Claim asserts success but observation ${obs.id} contains failure/error payload.`,
      };
    }

    // 2. Keyword-Based Support Check (M3: Honest method — requires meaningful overlap, not single-word)
    // NOTE: This is keyword intersection, not semantic NLI. Documented as such.
    const stopWords = new Set(['with', 'from', 'that', 'this', 'have', 'were', 'been', 'also', 'more', 'than',
      'into', 'some', 'each', 'when', 'does', 'will', 'just', 'only', 'very', 'should', 'would', 'could',
      'about', 'after', 'before', 'their', 'there', 'which', 'these', 'those', 'other']);
    const claimKeywords = lowerClaim.split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w));
    const contentWords = new Set(lowerContent.split(/\W+/).filter((w) => w.length > 3));

    const matchedWords = claimKeywords.filter((w) => contentWords.has(w));

    // Check numeric match: if claim contains digits and observation contains those digits
    const claimDigits = lowerClaim.match(/\b\d+\b/g) || [];
    const contentDigits = new Set(lowerContent.match(/\b\d+\b/g) || []);
    const matchedDigits = claimDigits.filter((d) => contentDigits.has(d));
    const numericSupported = claimDigits.length >= 1 && matchedDigits.length >= 1 && (matchedDigits.length / claimDigits.length) >= 0.5;

    // Require at least 2 matched keywords AND 30% overlap ratio for support, or substring/numeric match
    const overlapRatio = claimKeywords.length > 0 ? matchedWords.length / claimKeywords.length : 0;
    const substringMatch = lowerClaim.length >= 25 && lowerContent.includes(lowerClaim.substring(0, 25));
    const isSupported = (matchedWords.length >= 2 && overlapRatio >= 0.3) || substringMatch || numericSupported;

    return {
      isSupported,
      isContradicted: false,
      reason: isSupported
        ? undefined
        : `Keyword overlap insufficient: ${matchedWords.length}/${claimKeywords.length} keywords matched (${(overlapRatio * 100).toFixed(0)}% < 30% threshold). Method: keyword intersection, not semantic NLI.`,
    };
  }
}

export const claimGroundingValidator = new ClaimGroundingValidator();
