import { describe, it, expect } from 'vitest';
import { generate768DEmbedding, calculateCosineSimilarity } from '../engine/embeddings';
import { semanticCache, CACHE_SIMILARITY_THRESHOLD } from '../engine/semanticCache';

describe('768-Dimensional Vector Math & Cosine Engine', () => {
  it('should generate vectors with exactly 768 float dimensions', () => {
    const vec = generate768DEmbedding('Test vector prompt');
    expect(vec.length).toBe(768);
  });

  it('should guarantee L2 normalization where vector norm equals 1.0', () => {
    const vec = generate768DEmbedding('Enterprise AI agent orchestration');
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    expect(norm).toBeCloseTo(1.0, 4);
  });

  it('should compute Cosine Similarity of identical text as 1.0', () => {
    const vecA = generate768DEmbedding('NexusMatrix architecture spec');
    const vecB = generate768DEmbedding('NexusMatrix architecture spec');
    const sim = calculateCosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(1.0, 4);
  });

  it('should evaluate >0.88 Cosine similarity threshold for semantic cache hits', () => {
    expect(CACHE_SIMILARITY_THRESHOLD).toBe(0.88);
    const result = semanticCache.checkCache('NexusMatrix System Architecture Spec');
    expect(result).toHaveProperty('hit');
    expect(result).toHaveProperty('similarity');
    expect(result).toHaveProperty('distance');
    expect(result.similarity).toBeGreaterThanOrEqual(0.0);
  });
});
