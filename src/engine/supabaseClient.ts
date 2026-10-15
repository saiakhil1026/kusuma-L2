import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

function getQdrantUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.QDRANT_URL) return process.env.QDRANT_URL;
  }
  return '';
}

function getQdrantApiKey(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.QDRANT_API_KEY) return process.env.QDRANT_API_KEY;
  }
  return '';
}

const qdrantUrl = getQdrantUrl();
const qdrantKey = getQdrantApiKey();

let qdrantClient: QdrantClient | null = null;
const isTestEnv = typeof process !== 'undefined' && (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test');

if (qdrantUrl && qdrantKey && !isTestEnv) {
  try {
    const cleanUrl = qdrantUrl.replace(/:\d+$/, '');
    const isCloud = cleanUrl.includes('.qdrant.io');
    qdrantClient = new QdrantClient({
      url: cleanUrl,
      port: isCloud ? 443 : 6333,
      apiKey: qdrantKey,
      checkCompatibility: false,
    });
  } catch (err) {
    console.warn('[Qdrant] Failed to initialize client:', err);
  }
}

export async function checkQdrantConnection(): Promise<boolean> {
  if (!qdrantClient) return false;
  try {
    await qdrantClient.getCollections();
    return true;
  } catch {
    return false;
  }
}

export const ACTIVE_QDRANT_COLLECTION = 'nexus_vectors';

// Vector Repository Abstraction (Gate 10)
export interface VectorRepositoryEntry {
  id: string;
  ownerId: string;
  text: string;
  agentId: string;
  agentName: string;
  modality: string;
  nodeTitle?: string;
  tokens: number;
  embedding: number[];
  projection2D?: { x: number; y: number };
  createdAt?: string;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  agentId: string;
  agentName: string;
  modality: string;
  nodeTitle?: string;
  similarity: number;
  tokens: number;
  projection2D?: { x: number; y: number };
}

export interface VectorRepository {
  readonly mode: 'local' | 'qdrant';
  addVector(entry: VectorRepositoryEntry): Promise<{ success: boolean; error?: string }>;
  searchVectors(queryEmbedding: number[], topK: number, ownerId: string): Promise<VectorSearchResult[]>;
  getVectors(ownerId: string): Promise<VectorRepositoryEntry[]>;
}

export class QdrantVectorRepository implements VectorRepository {
  public readonly mode = 'qdrant' as const;
  private readonly collectionName: string;

  constructor(collectionName: string = ACTIVE_QDRANT_COLLECTION) {
    this.collectionName = collectionName;
  }

  public async initCollection(): Promise<void> {
    if (!qdrantClient) return;
    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);
      if (!exists) {
        await qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 768,
            distance: 'Cosine',
          },
        });
      }
    } catch (err) {
      console.warn('[Qdrant] Collection init failed:', err);
    }
  }

  public async addVector(entry: VectorRepositoryEntry): Promise<{ success: boolean; error?: string }> {
    if (!qdrantClient) {
      return { success: false, error: 'Qdrant client not initialized' };
    }

    try {
      await this.initCollection();

      const payload = {
        owner_id: entry.ownerId,
        text: entry.text,
        agent_id: entry.agentId,
        agent_name: entry.agentName,
        modality: entry.modality,
        node_title: entry.nodeTitle || null,
        tokens: entry.tokens,
        projection_2d: entry.projection2D || null,
        created_at: new Date().toISOString(),
      };

      await qdrantClient.upsert(this.collectionName, {
        points: [
          {
            id: entry.id,
            vector: entry.embedding,
            payload,
          },
        ],
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public async searchVectors(queryEmbedding: number[], topK: number = 5, _ownerId?: string): Promise<VectorSearchResult[]> {
    if (!qdrantClient) return [];

    try {
      const response = await (qdrantClient as any).search(this.collectionName, {
        vector: queryEmbedding,
        limit: topK,
        score_threshold: 0.70,
      });
      const result: any[] = response.result || [];

      return result.map((point: any) => ({
        id: String(point.id),
        text: (point.payload?.text as string) || '',
        agentId: (point.payload?.agent_id as string) || '',
        agentName: (point.payload?.agent_name as string) || '',
        modality: (point.payload?.modality as string) || '',
        nodeTitle: (point.payload?.node_title as string) || undefined,
        similarity: parseFloat((point.score || 0).toFixed(4)),
        tokens: (point.payload?.tokens as number) || 0,
        projection2D: point.payload?.projection_2d
          ? { x: (point.payload.projection_2d as any).x, y: (point.payload.projection_2d as any).y }
          : undefined,
      }));
    } catch {
      return [];
    }
  }

  public async getVectors(_ownerId?: string): Promise<VectorRepositoryEntry[]> {
    if (!qdrantClient) return [];

    try {
      const response = await (qdrantClient as any).search(this.collectionName, {
        vector: new Array(768).fill(0.001),
        limit: 100,
      });
      const result: any[] = response.result || [];

      return result.map((point: any) => ({
        id: String(point.id),
        ownerId: (point.payload?.owner_id as string) || '',
        text: (point.payload?.text as string) || '',
        agentId: (point.payload?.agent_id as string) || '',
        agentName: (point.payload?.agent_name as string) || '',
        modality: (point.payload?.modality as string) || '',
        nodeTitle: (point.payload?.node_title as string) || undefined,
        tokens: (point.payload?.tokens as number) || 0,
        embedding: (point.vector as number[]) || new Array(768).fill(0),
        projection2D: point.payload?.projection_2d
          ? { x: (point.payload.projection_2d as any).x, y: (point.payload.projection_2d as any).y }
          : undefined,
        createdAt: (point.payload?.created_at as string) || undefined,
      }));
    } catch {
      return [];
    }
  }
}

export class LocalVectorRepository implements VectorRepository {
  public readonly mode = 'local' as const;
  private entries: Map<string, VectorRepositoryEntry> = new Map();

  public async addVector(entry: VectorRepositoryEntry): Promise<{ success: boolean; error?: string }> {
    this.entries.set(entry.id, entry);
    return { success: true };
  }

  public async searchVectors(queryEmbedding: number[], topK: number = 5, ownerId?: string): Promise<VectorSearchResult[]> {
    const allEntries = Array.from(this.entries.values());
    const userEntries = ownerId ? allEntries.filter((e) => e.ownerId === ownerId) : allEntries;

    const results: VectorSearchResult[] = userEntries.map((e) => {
      const sim = this.cosineSimilarity(queryEmbedding, e.embedding);
      return {
        id: e.id,
        text: e.text,
        agentId: e.agentId,
        agentName: e.agentName,
        modality: e.modality,
        nodeTitle: e.nodeTitle,
        similarity: sim,
        tokens: e.tokens,
        projection2D: e.projection2D,
      };
    });

    return results
      .filter((r) => r.similarity >= 0.70)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  public async getVectors(ownerId?: string): Promise<VectorRepositoryEntry[]> {
    const allEntries = Array.from(this.entries.values());
    return ownerId ? allEntries.filter((e) => e.ownerId === ownerId) : allEntries;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const activeVectorRepository: VectorRepository = qdrantClient
  ? new QdrantVectorRepository()
  : new LocalVectorRepository();
