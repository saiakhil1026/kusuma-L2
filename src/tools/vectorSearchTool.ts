import { z } from 'zod';
import { sharedVectorDB } from '../engine/vectorStore';
import { semanticCache } from '../engine/semanticCache';

export const vectorSearchInputSchema = z.object({
  query: z.string().min(1, 'Query string cannot be empty'),
  topK: z.number().min(1).max(50).optional().default(5),
});

export type VectorSearchInput = z.infer<typeof vectorSearchInputSchema>;

export async function executeVectorSearchTool(input: VectorSearchInput) {
  const validated = vectorSearchInputSchema.parse(input);
  const cacheCheck = semanticCache.checkCache(validated.query);
  const results = sharedVectorDB.searchSimilar(validated.query, validated.topK);

  const formattedMatches = results.map((r) => ({
    id: r.item.id,
    similarity: parseFloat(r.similarity.toFixed(4)),
    agent: r.item.metadata.agentName,
    modality: r.item.metadata.modality,
    snippet: r.item.text.substring(0, 200),
  }));

  return {
    query: validated.query,
    cacheResult: {
      hit: cacheCheck.hit,
      similarityPct: `${(cacheCheck.similarity * 100).toFixed(1)}%`,
      latencyMs: cacheCheck.latencyMs,
    },
    topMatches: formattedMatches,
    matchesCount: formattedMatches.length,
  };
}
