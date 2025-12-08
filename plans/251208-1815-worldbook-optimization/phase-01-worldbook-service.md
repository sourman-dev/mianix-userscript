# Phase 01: WorldbookService + Embeddings

**Parent:** [plan.md](./plan.md)
**Dependencies:** None (can run parallel with Phase 02)
**Next:** [Phase 03: Hybrid Retrieval](./phase-03-hybrid-retrieval.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-08 |
| Priority | P0 (Core) |
| Status | ✅ Completed (Needs High Priority Fixes) |
| Estimate | 3-4 hours |
| Review | [Code Review Report](./reports/code-reviewer-251208-worldbook-phase01-phase02.md) |

Create `WorldbookService` that generates and stores embeddings for worldbook entries, enabling semantic retrieval.

## Key Insights (from Research)

1. **Reuse MemoryService pattern** - Already has `generateEmbedding()`, `cosineSimilarity()`, IndexedDB storage
2. **Store embeddings in-place** - Add `embedding?: number[]` to WorldBookEntry (no separate collection)
3. **Lazy generation** - Generate on save/first-use, not on import
4. **Threshold 0.5** - Align with existing memory retrieval threshold

## Requirements

1. Create `WorldbookService` class mirroring `MemoryService`
2. Add `embedding?: number[]` field to `WorldBookEntry` type
3. Implement `generateWorldbookEmbedding(entry)` method
4. Implement `retrieveRelevantEntries(characterId, query, limit)` method
5. Generate embeddings async (non-blocking UI)
6. Fallback gracefully if no embedding model configured

## Architecture

### Data Flow

```
User saves worldbook entry
        │
        ▼
WorldbookService.embedEntry(entry)
        │
        ▼
generateEmbedding(entry.content + entry.keys.join(' '))
        │
        ▼
Store embedding in entry.embedding
        │
        ▼
Save CharacterCard to db
```

### State Management

- No new Pinia store needed
- Embeddings stored directly in `CharacterCard.data.worldBook[].embedding`
- Reuse existing `db.CharacterCards` collection

### Component Interaction

```
WorldbookEditor.vue
       │
       │ onSave()
       ▼
WorldbookService.embedAndSave(characterId, entry)
       │
       │ async
       ▼
db.CharacterCards.updateOne()
```

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/services/worldbook-service.ts` | CREATE | Main service class |
| `src/services/memory-service.ts` | REFERENCE | Copy pattern from here |
| `src/types/character.d.ts` | MODIFY | Add `embedding` field |
| `src/db/index.ts` | REFERENCE | Use CharacterCards collection |
| `src/utils/model-helpers.ts` | REFERENCE | Use `getEmbeddingModel()` |

## Implementation Steps

### Step 1: Extend WorldBookEntry Type

File: `src/types/character.d.ts`

```typescript
export interface WorldBookEntry {
  // ... existing fields ...

  // NEW: RAG embedding
  embedding?: number[];  // Vector for semantic search
}
```

### Step 2: Create WorldbookService

File: `src/services/worldbook-service.ts`

```typescript
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
      });

      if (!response.ok) {
        console.error('Embedding API error:', response.status);
        return [];
      }

      const data = await response.json();
      return data.data?.[0]?.embedding || [];
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
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.data?.[0]?.embedding || [];
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
}
```

### Step 3: Export from Services Index

File: `src/services/index.ts` (create if not exists)

```typescript
export { MemoryService } from './memory-service';
export { WorldbookService } from './worldbook-service';
```

### Step 4: Add Utility for Batch Embedding

Add to `WorldbookService`:

```typescript
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
```

## Todo List

- [x] Add `embedding?: number[]` to WorldBookEntry type
- [x] Create `src/services/worldbook-service.ts`
- [x] Implement `generateEntryEmbedding()` method
- [x] Implement `embedAllEntries()` with progress callback
- [x] Implement `retrieveRelevantEntries()` for semantic search
- [x] Test with mock embedding model
- [x] Verify fallback when no embedding model configured

## Success Criteria

1. `WorldbookService.generateEntryEmbedding()` returns valid vector
2. `WorldbookService.embedAllEntries()` processes all entries with progress
3. `WorldbookService.retrieveRelevantEntries()` returns semantically relevant entries
4. Service fails gracefully (empty array) when no embedding model
5. Embeddings persist in CharacterCard across sessions

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Embedding API slow | High | Show progress indicator, batch with delays |
| Large worldbooks (100+ entries) | Medium | Lazy embed on first use, skip embedded |
| Embedding model not configured | Low | Graceful fallback to keyword-only |
| IndexedDB storage limits | Low | Embeddings ~1KB each, 100 entries = ~100KB |

## Security Considerations

- API key stored in LLMModels, not exposed in service
- No external network calls except to configured embedding endpoint
- Input sanitized (trim whitespace, no user-controlled URLs)

## Next Steps

After completing this phase:
1. Proceed to [Phase 03: Hybrid Retrieval](./phase-03-hybrid-retrieval.md) to integrate with prompt generation
2. Phase 02 (Editor UI) can use `WorldbookService.updateEntryEmbedding()` on save
