import type { SemanticCacheResult } from '../types';
import { sharedVectorDB } from './vectorStore';
import { generate768DEmbedding, calculateCosineSimilarity } from './embeddings';

export const CACHE_SIMILARITY_THRESHOLD = 0.88; // > 88% similarity threshold

class SemanticCacheManager {
  private cacheHitsCount: number = 0;
  private totalQueriesCount: number = 0;

  /**
   * Evaluates query prompt vector against vector store memory.
   * If similarity > 0.88, returns a sub-millisecond CACHE HIT.
   */
  public checkCache(prompt: string): SemanticCacheResult {
    const startTime = performance.now();
    this.totalQueriesCount++;

    const queryEmbedding = generate768DEmbedding(prompt);
    const allVectors = sharedVectorDB.getAllVectors();

    let bestSimilarity = 0;
    let bestMatchVector = undefined;

    for (const item of allVectors) {
      const sim = calculateCosineSimilarity(queryEmbedding, item.embedding);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatchVector = item;
      }
    }

    const latencyMs = parseFloat((performance.now() - startTime).toFixed(3));
    const distance = parseFloat((1 - bestSimilarity).toFixed(4));
    const isHit = bestSimilarity >= CACHE_SIMILARITY_THRESHOLD;

    if (isHit) {
      this.cacheHitsCount++;
    }

    return {
      hit: isHit,
      similarity: parseFloat(bestSimilarity.toFixed(4)),
      distance,
      cachedVector: isHit ? bestMatchVector : undefined,
      latencyMs, // M1: Report real measured latency, not capped
    };
  }

  public getCacheHitRatio(): number {
    if (this.totalQueriesCount === 0) return 0;
    return parseFloat(((this.cacheHitsCount / this.totalQueriesCount) * 100).toFixed(1));
  }

  public getStats() {
    return {
      totalQueries: this.totalQueriesCount,
      cacheHits: this.cacheHitsCount,
      hitRatioPct: this.getCacheHitRatio(),
      threshold: CACHE_SIMILARITY_THRESHOLD,
    };
  }

  public resetStats() {
    this.cacheHitsCount = 0;
    this.totalQueriesCount = 0;
  }
}

export const semanticCache = new SemanticCacheManager();
