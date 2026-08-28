import { z } from 'zod';
import { sharedVectorDB } from '../engine/vectorStore';
import type { AgentId, Modality } from '../types';

export const storeMemoryInputSchema = z.object({
  text: z.string().min(1, 'Memory text payload cannot be empty'),
  agentId: z.string().min(1, 'agentId is required'),
  modality: z.enum(['text', 'code', 'vision', 'structured']).optional().default('text'),
  nodeTitle: z.string().optional().default('MCP Memory Item'),
});

export type StoreMemoryInput = z.infer<typeof storeMemoryInputSchema>;

export async function executeStoreMemoryTool(input: StoreMemoryInput) {
  const validated = storeMemoryInputSchema.parse(input);
  const item = sharedVectorDB.addVector(
    validated.text,
    validated.agentId as AgentId,
    `Agent ${validated.agentId}`,
    validated.modality as Modality,
    validated.nodeTitle
  );

  return {
    status: 'INDEXED',
    vectorId: item.id,
    tokens: item.metadata.tokens,
    totalVectorsCount: sharedVectorDB.size(),
    message: `Indexed 768D vector memory entry successfully. Vector ID: ${item.id}`,
  };
}
