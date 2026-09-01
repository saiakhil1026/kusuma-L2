import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
    if (process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
      return import.meta.env.VITE_SUPABASE_URL;
    }
  } catch {}
  return 'https://zmgchehdwvycngptkqnd.supabase.co';
}

function getSupabaseKey(): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.SUPABASE_PUBLISHABLE_KEY) return process.env.SUPABASE_PUBLISHABLE_KEY;
    if (process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
    if (process.env.VITE_SUPABASE_ANON_KEY) return process.env.VITE_SUPABASE_ANON_KEY;
    if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY) return process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    }
  } catch {}
  return '';
}

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

let wsTransport: any = undefined;
if (typeof window === 'undefined') {
  try {
    const wsMod = 'ws';
    wsTransport = require(wsMod);
  } catch {}
}

export const supabase = supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
    })
  : null;

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('nexus_vectors').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

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
  readonly mode: 'local' | 'supabase';
  addVector(entry: VectorRepositoryEntry): Promise<{ success: boolean; error?: string }>;
  searchVectors(queryEmbedding: number[], topK: number, ownerId: string): Promise<VectorSearchResult[]>;
  getVectors(ownerId: string): Promise<VectorRepositoryEntry[]>;
}

export class SupabaseVectorRepository implements VectorRepository {
  public readonly mode = 'supabase' as const;

  public async addVector(entry: VectorRepositoryEntry): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }
    try {
      const { error } = await supabase.from('nexus_vectors').insert({
        id: entry.id,
        owner_id: entry.ownerId,
        text: entry.text,
        agent_id: entry.agentId,
        agent_name: entry.agentName,
        modality: entry.modality,
        node_title: entry.nodeTitle,
        tokens: entry.tokens,
        embedding: entry.embedding,
        projection_2d: entry.projection2D,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async searchVectors(queryEmbedding: number[], topK: number = 5, ownerId: string): Promise<VectorSearchResult[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.rpc('match_nexus_vectors', {
        query_embedding: queryEmbedding,
        match_threshold: 0.70,
        match_count: topK,
        request_owner_id: ownerId,
      });

      if (error || !data) return [];
      return data.map((row: any) => ({
        id: row.id,
        text: row.text,
        agentId: row.agent_id,
        agentName: row.agent_name,
        modality: row.modality,
        nodeTitle: row.node_title,
        similarity: row.similarity,
        tokens: row.tokens,
        projection2D: row.projection_2d,
      }));
    } catch {
      return [];
    }
  }

  public async getVectors(ownerId: string): Promise<VectorRepositoryEntry[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('nexus_vectors')
        .select('*')
        .eq('owner_id', ownerId);

      if (error || !data) return [];
      return data.map((row: any) => ({
        id: row.id,
        ownerId: row.owner_id,
        text: row.text,
        agentId: row.agent_id,
        agentName: row.agent_name,
        modality: row.modality,
        nodeTitle: row.node_title,
        tokens: row.tokens,
        embedding: row.embedding,
        projection2D: row.projection_2d,
        createdAt: row.created_at,
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

  public async searchVectors(queryEmbedding: number[], topK: number = 5, ownerId: string): Promise<VectorSearchResult[]> {
    const userEntries = Array.from(this.entries.values()).filter((e) => e.ownerId === ownerId);
    
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

  public async getVectors(ownerId: string): Promise<VectorRepositoryEntry[]> {
    return Array.from(this.entries.values()).filter((e) => e.ownerId === ownerId);
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

export const activeVectorRepository: VectorRepository = supabase
  ? new SupabaseVectorRepository()
  : new LocalVectorRepository();
