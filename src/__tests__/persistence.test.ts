import { describe, it, expect } from 'vitest';
import { LocalVectorRepository, type VectorRepositoryEntry } from '../engine/supabaseClient';

describe('VectorRepository Persistence & Tenant Isolation Suite (Gate 10)', () => {
  it('should await addVector and return explicit success status', async () => {
    const repo = new LocalVectorRepository();
    const entry: VectorRepositoryEntry = {
      id: 'vec_1',
      ownerId: 'user_123',
      text: 'Sample vector memory test entry',
      agentId: 'code',
      agentName: 'Code Agent',
      modality: 'code',
      tokens: 42,
      embedding: new Array(768).fill(0.1),
    };

    const res = await repo.addVector(entry);
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();

    const userVectors = await repo.getVectors('user_123');
    expect(userVectors.length).toBe(1);
    expect(userVectors[0].id).toBe('vec_1');
  });

  it('should isolate search results by ownerId', async () => {
    const repo = new LocalVectorRepository();
    const embA = new Array(768).fill(0.5);
    const embB = new Array(768).fill(0.5);

    await repo.addVector({
      id: 'vec_userA',
      ownerId: 'user_A',
      text: 'User A secret record',
      agentId: 'logic',
      agentName: 'Logic Agent',
      modality: 'text',
      tokens: 20,
      embedding: embA,
    });

    await repo.addVector({
      id: 'vec_userB',
      ownerId: 'user_B',
      text: 'User B confidential record',
      agentId: 'logic',
      agentName: 'Logic Agent',
      modality: 'text',
      tokens: 20,
      embedding: embB,
    });

    const searchResultUserA = await repo.searchVectors(embA, 5, 'user_A');
    expect(searchResultUserA.length).toBe(1);
    expect(searchResultUserA[0].id).toBe('vec_userA');

    const searchResultUserB = await repo.searchVectors(embB, 5, 'user_B');
    expect(searchResultUserB.length).toBe(1);
    expect(searchResultUserB[0].id).toBe('vec_userB');

    // Unauthorized query returns empty
    const searchResultUnauthorized = await repo.searchVectors(embA, 5, 'user_C');
    expect(searchResultUnauthorized.length).toBe(0);
  });
});