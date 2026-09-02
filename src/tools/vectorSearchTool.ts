import { z } from 'zod';
import { activeVectorRepository } from '../engine/supabaseClient';
import { generateHashEmbedding } from '../engine/embeddings';
import { semanticCache } from '../engine/semanticCache';
import { sharedVectorDB } from '../engine/vectorStore';

export const vectorSearchInputSchema = z.object({
  query: z.string().min(1, 'Query string cannot be empty'),
  topK: z.number().min(1).max(50).optional().default(5),
  ownerId: z.string().optional(),
});

export type VectorSearchInput = z.infer<typeof vectorSearchInputSchema>;

export async function executeVectorSearchTool(input: VectorSearchInput, authenticatedUserId?: string) {
  const validated = vectorSearchInputSchema.parse(input);
  const ownerId = authenticatedUserId || validated.ownerId || 'tenant_default_user';

  const cacheCheck = semanticCache.checkCache(validated.query);
  const queryEmbedding = generateHashEmbedding(validated.query);

  // Search through production active VectorRepository interface (Supabase RPC or Local)
  const repositoryResults = await activeVectorRepository.searchVectors(queryEmbedding, validated.topK, ownerId);

  let formattedMatches = repositoryResults.map((r) => ({
    id: r.id,
    similarity: parseFloat(r.similarity.toFixed(4)),
    agent: r.agentName,
    modality: r.modality,
    snippet: r.text.substring(0, 200),
  }));

  // Fallback to in-memory vector store if repository results are empty
  if (formattedMatches.length === 0) {
    const localResults = sharedVectorDB.searchSimilar(validated.query, validated.topK);
    formattedMatches = localResults.map((r) => ({
      id: r.item.id,
      similarity: parseFloat(r.similarity.toFixed(4)),
      agent: r.item.metadata.agentName,
      modality: r.item.metadata.modality,
      snippet: r.item.text.substring(0, 200),
    }));
  }

  return {
    query: validated.query,
    ownerId,
    persistenceMode: activeVectorRepository.mode,
    cacheResult: {
      hit: cacheCheck.hit,
      similarityPct: `${(cacheCheck.similarity * 100).toFixed(1)}%`,
      latencyMs: cacheCheck.latencyMs,
    },
    topMatches: formattedMatches,
    matchesCount: formattedMatches.length,
  };
}
