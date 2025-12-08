// src/services/worldbook-service.ts
import { db, CharacterCard } from '@/db';
import { getEmbeddingModel } from '@/utils/model-helpers';
import type { WorldBookEntry } from '@/types/character';

// Copy from memory-service.ts
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

export class WorldbookService {

  /**
   * Generate embedding for a single worldbook entry
   * Combines content + keys for better semantic representation
   */
  static async generateEntryEmbedding(entry: WorldBookEntry): Promise<number[]> {
    const embeddingModel = getEmbeddingModel();
    if (!embeddingModel) {
      console.warn('No embedding model configured');
      return [];
    }

    // Combine content + keys for embedding
    const textToEmbed = `${entry.comment || ''} ${entry.content} ${entry.keys?.join(' ') || ''}`.trim();

    try {
      let embedUrl = embeddingModel.baseUrl;
      if (embedUrl.endsWith('/')) embedUrl = embedUrl.slice(0, -1);
      if (!embedUrl.includes('/embeddings')) embedUrl = `${embedUrl}/embeddings`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(embedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${embeddingModel.apiKey}`,
          },
          body: JSON.stringify({
            input: textToEmbed,
            model: embeddingModel.modelName,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error('Embedding API error:', response.status);
          return [];
        }

        const data = await response.json();
        return data.data?.[0]?.embedding || [];
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('Embedding request timeout (30s)');
        } else {
          throw fetchError;
        }
        return [];
      }
    } catch (e) {
      console.error('Embedding generation failed:', e);
      return [];
    }
  }

  /**
   * Generate embeddings for all entries in a character's worldbook
   * Returns count of successfully embedded entries
   */
  static async embedAllEntries(
    characterId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<number> {
    const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
    if (!character?.data?.worldBook) return 0;

    const entries = character.data.worldBook;
    let embedded = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Skip if already has embedding
      if (entry.embedding?.length) {
        embedded++;
        continue;
      }

      const embedding = await this.generateEntryEmbedding(entry);
      if (embedding.length > 0) {
        entries[i] = { ...entry, embedding };
        embedded++;
      }

      onProgress?.(i + 1, entries.length);
    }

    // Save updated worldbook
    db.CharacterCards.updateOne(
      { id: characterId },
      { $set: { 'data.worldBook': entries } }
    );

    return embedded;
  }

  /**
   * Retrieve relevant worldbook entries using semantic similarity
   * Filters by keyword first, then ranks by embedding similarity
   */
  static async retrieveRelevantEntries(
    characterId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.5
  ): Promise<WorldBookEntry[]> {
    const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
    if (!character?.data?.worldBook?.length) return [];

    const queryEmbedding = await this.generateQueryEmbedding(query);

    // If no embedding model, return empty (fallback handled in prompt-utils)
    if (!queryEmbedding.length) return [];

    const entries = character.data.worldBook.filter(e => e.enabled !== false);

    // Score entries by similarity
    const scored = entries
      .filter(e => e.embedding?.length) // Only entries with embeddings
      .map(entry => ({
        entry,
        score: cosineSimilarity(queryEmbedding, entry.embedding!),
      }));

    // Filter by threshold and sort by score
    return scored
      .filter(s => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /**
   * Generate embedding for query text (reuse embedding logic)
   */
  private static async generateQueryEmbedding(query: string): Promise<number[]> {
    const embeddingModel = getEmbeddingModel();
    if (!embeddingModel) return [];

    try {
      let embedUrl = embeddingModel.baseUrl;
      if (embedUrl.endsWith('/')) embedUrl = embedUrl.slice(0, -1);
      if (!embedUrl.includes('/embeddings')) embedUrl = `${embedUrl}/embeddings`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(embedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${embeddingModel.apiKey}`,
          },
          body: JSON.stringify({
            input: query,
            model: embeddingModel.modelName,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) return [];
        const data = await response.json();
        return data.data?.[0]?.embedding || [];
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('Query embedding timeout (30s)');
        }
        return [];
      }
    } catch {
      return [];
    }
  }

  /**
   * Update single entry embedding and save
   */
  static async updateEntryEmbedding(
    characterId: string,
    entryIndex: number
  ): Promise<boolean> {
    const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
    if (!character?.data?.worldBook?.[entryIndex]) return false;

    const entry = character.data.worldBook[entryIndex];
    const embedding = await this.generateEntryEmbedding(entry);

    if (!embedding.length) return false;

    character.data.worldBook[entryIndex] = { ...entry, embedding };

    db.CharacterCards.updateOne(
      { id: characterId },
      { $set: { 'data.worldBook': character.data.worldBook } }
    );

    return true;
  }

  /**
   * Check if embedding model is configured
   */
  static hasEmbeddingModel(): boolean {
    return !!getEmbeddingModel();
  }

  /**
   * Clear all embeddings for a character (useful for regeneration)
   */
  static clearEmbeddings(characterId: string): void {
    const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
    if (!character?.data?.worldBook) return;

    const entries = character.data.worldBook.map(e => {
      const { embedding, ...rest } = e;
      return rest;
    });

    db.CharacterCards.updateOne(
      { id: characterId },
      { $set: { 'data.worldBook': entries } }
    );
  }
}
