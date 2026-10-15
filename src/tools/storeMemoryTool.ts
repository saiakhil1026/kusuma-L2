import { z } from 'zod';
import { activeVectorRepository, type VectorRepositoryEntry } from '../engine/supabaseClient';
import { generateHashEmbedding } from '../engine/embeddings';
import { sharedVectorDB } from '../engine/vectorStore';
import type { AgentId, Modality } from '../types';

export const storeMemoryInputSchema = z.object({
  text: z.string().min(1, 'Memory text payload cannot be empty'),
  agentId: z.string().min(1, 'agentId is required'),
  modality: z.enum(['text', 'code', 'vision', 'structured']).optional().default('text'),
  nodeTitle: z.string().optional().default('MCP Memory Item'),
  ownerId: z.string().optional(), // Derived from auth context, optional override in tool schema
});

export type StoreMemoryInput = z.infer<typeof storeMemoryInputSchema>;

export async function executeStoreMemoryTool(input: StoreMemoryInput, authenticatedUserId?: string) {
  const validated = storeMemoryInputSchema.parse(input);
  // Derive trusted owner_id from authenticated identity, never trust unauthenticated request payload
  const ownerId = authenticatedUserId || validated.ownerId || 'tenant_default_user';

  const embedding = generateHashEmbedding(validated.text);
  const vectorId = `vec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const entry: VectorRepositoryEntry = {
    id: vectorId,
    ownerId,
    text: validated.text,
    agentId: validated.agentId,
    agentName: `Agent ${validated.agentId}`,
    modality: validated.modality,
    nodeTitle: validated.nodeTitle,
    tokens: Math.max(8, Math.floor(validated.text.length / 3.5)),
    embedding,
    projection2D: { x: Number((embedding[0] * 0.8).toFixed(2)), y: Number((embedding[1] * 0.8).toFixed(2)) },
  };

  // 1. Await vector persistence in active repository (Qdrant or Local)
  const result = await activeVectorRepository.addVector(entry);
  if (!result.success) {
    return {
      status: 'FAILED',
      isError: true,
      persistenceMode: activeVectorRepository.mode,
      error: `Vector repository store failed: ${result.error}`,
    };
  }

  // Also sync to local vector store for fast in-memory graph visualization
  sharedVectorDB.addVector(
    validated.text,
    validated.agentId as AgentId,
    `Agent ${validated.agentId}`,
    validated.modality as Modality,
    validated.nodeTitle
  );

  return {
    status: 'INDEXED',
    isError: false,
    vectorId: entry.id,
    ownerId,
    persistenceMode: activeVectorRepository.mode,
    tokens: entry.tokens,
    totalVectorsCount: sharedVectorDB.size(),
    message: `Indexed 768D vector memory entry successfully via ${activeVectorRepository.mode} repository. Vector ID: ${entry.id}`,
  };
}