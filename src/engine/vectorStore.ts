import type { VectorItem, AgentId, Modality } from '../types';
import { generate768DEmbedding, calculateCosineSimilarity, projectTo2DSpace } from './embeddings';
import { activeVectorRepository } from './supabaseClient';

class VectorDatabase {
  private items: Map<string, VectorItem> = new Map();

  constructor() {
    this.seedInitialVectors();
  }

  private seedInitialVectors() {
    const seedData: Array<{ text: string; agentId: AgentId; agentName: string; modality: Modality; title: string }> = [
      {
        text: 'NexusMatrix System Architecture Spec: Directed Acyclic Graph dynamic decomposition and inter-agent memory sharing via 768D embeddings.',
        agentId: 'orchestrator',
        agentName: 'Master Orchestrator Agent',
        modality: 'structured',
        title: 'System Spec Architecture v1.0',
      },
      {
        text: 'Zero-trust guardrail policies: Enforce TypeScript strict mode, sanitize inputs, reject unsafe shell execution, mandate schema validation.',
        agentId: 'guardrail',
        agentName: 'Guardrail & Data Validator Agent',
        modality: 'structured',
        title: 'Zero-Trust Safety Protocol',
      },
      {
        text: 'Code Synthesis standard: Use async/await patterns, strict interface typing, comprehensive error boundaries, unit test coverage.',
        agentId: 'code',
        agentName: 'Code Assistant Agent',
        modality: 'code',
        title: 'Static Analysis Code Standard',
      },
      {
        text: 'Visual analytics schema: Bounding box format [ymin, xmin, ymax, xmax], spatial scene tag hierarchy, visual wireframe analytics.',
        agentId: 'vision',
        agentName: 'Vision & Image Captioner Agent',
        modality: 'vision',
        title: 'Spatial Scene Bounding Schema',
      },
      {
        text: 'Deep mathematical logic: Cosine distance threshold <= 0.12 corresponds to Cosine similarity >= 0.88 for semantic cache hit validation.',
        agentId: 'logic',
        agentName: 'Deep Logic Reasoning Agent',
        modality: 'text',
        title: 'Cosine Threshold Proof Matrix',
      },
      {
        text: 'Document compression policy: Retain key technical entities, compute compression ratio (input_tokens / output_tokens), flag density metrics.',
        agentId: 'summarizer',
        agentName: 'Text Summarizer Agent',
        modality: 'text',
        title: 'High-Density Summarization Rule',
      },
      {
        text: 'Executive report synthesizer template: Merge multi-agent deliverables, section breakdown, latency benchmark audit, confidence summary.',
        agentId: 'synthesizer',
        agentName: 'Executive Synthesizer Agent',
        modality: 'text',
        title: 'Executive Report Blueprint Template',
      },
    ];

    seedData.forEach((item, index) => {
      const embedding = generate768DEmbedding(item.text);
      const vecId = `vec_seed_${index + 1}`;
      this.items.set(vecId, {
        id: vecId,
        embedding,
        text: item.text,
        metadata: {
          agentId: item.agentId,
          agentName: item.agentName,
          nodeTitle: item.title,
          timestamp: Date.now() - (seedData.length - index) * 60000,
          modality: item.modality,
          tokens: Math.floor(item.text.length / 4),
        },
        projection2D: projectTo2DSpace(embedding),
      });
    });
  }

  public addVector(
    text: string,
    agentId: AgentId,
    agentName: string,
    modality: Modality,
    nodeTitle?: string,
    tokens?: number,
    prerequisiteVectorIds?: string[]
  ): VectorItem {
    const embedding = generate768DEmbedding(text);
    const id = `vec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const vectorItem: VectorItem = {
      id,
      embedding,
      text,
      metadata: {
        agentId,
        agentName,
        nodeTitle,
        timestamp: Date.now(),
        modality,
        tokens: tokens || Math.floor(text.length / 4),
        prerequisiteVectorIds,
      },
      projection2D: projectTo2DSpace(embedding),
    };

    this.items.set(id, vectorItem);

    // Sync to Qdrant in background if configured
    const userId = 'tenant_default_user';
    activeVectorRepository.addVector({
      id,
      ownerId: userId,
      text,
      agentId,
      agentName,
      modality,
      nodeTitle,
      tokens: vectorItem.metadata.tokens || 0,
      embedding,
      projection2D: vectorItem.projection2D ? { x: vectorItem.projection2D[0], y: vectorItem.projection2D[1] } : undefined,
    }).catch((err) => console.warn('[Qdrant] Vector sync note:', err));

    return vectorItem;
  }

  public getVectorById(id: string): VectorItem | undefined {
    return this.items.get(id);
  }

  public getAllVectors(): VectorItem[] {
    return Array.from(this.items.values());
  }

  public searchSimilar(queryText: string, topK: number = 5): Array<{ item: VectorItem; similarity: number }> {
    const queryEmbedding = generate768DEmbedding(queryText);
    const results: Array<{ item: VectorItem; similarity: number }> = [];

    this.items.forEach((item) => {
      const similarity = calculateCosineSimilarity(queryEmbedding, item.embedding);
      results.push({ item, similarity });
    });

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  public clearNonSeedVectors(): void {
    const seedIds = Array.from(this.items.keys()).filter((id) => id.startsWith('vec_seed_'));
    const newItems = new Map<string, VectorItem>();
    seedIds.forEach((id) => {
      const item = this.items.get(id);
      if (item) newItems.set(id, item);
    });
    this.items = newItems;
  }

  public size(): number {
    return this.items.size;
  }
}

export const sharedVectorDB = new VectorDatabase();