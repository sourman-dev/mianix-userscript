# Phase 03: Hybrid Retrieval Integration

**Parent:** [plan.md](./plan.md)
**Dependencies:** [Phase 01: WorldbookService](./phase-01-worldbook-service.md)
**Next:** [Phase 05: Testing + Migration](./phase-05-testing-migration.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-08 |
| Priority | P0 (Core) |
| Status | Pending |
| Estimate | 2-3 hours |

Modify `prompt-utils.ts` to use hybrid retrieval: keyword pre-filter + semantic ranking + Top-K selection.

## Key Insights (from Research)

1. **Keyword pre-filter first** - Fast initial screening (existing logic)
2. **Semantic ranking second** - Cosine similarity with query embedding
3. **Top-K selection** - Budget-aware (default: 5 entries)
4. **Minimum threshold** - 0.5 similarity (align with MemoryService)
5. **Fallback** - Return to keyword-only if no embeddings available

## Requirements

1. Refactor `getRelevantWorldBookEntries()` to support hybrid mode
2. Add `limit` parameter for Top-K selection
3. Add `semanticThreshold` parameter (default: 0.5)
4. Integrate `WorldbookService.retrieveRelevantEntries()`
5. Preserve "constant" entries regardless of ranking
6. Graceful fallback when no embedding model configured

## Architecture

### Retrieval Flow

```
getRelevantWorldBookEntries(worldBook, chatHistory, userInput, options)
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 1: Extract "constant" entries (always included)          │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 2: Keyword pre-filter (existing logic)                   │
│   - Match entry.keys against context text                     │
│   - Return candidates with keyword matches                    │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 3: Semantic ranking (if embeddings available)            │
│   - Generate query embedding                                  │
│   - Score candidates by cosine similarity                     │
│   - Filter by threshold (0.5)                                 │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 4: Top-K selection                                       │
│   - Sort by score descending                                  │
│   - Take top K (default: 5)                                   │
│   - Merge with constant entries                               │
└───────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│ Step 5: Sort by insertionOrder and return                     │
└───────────────────────────────────────────────────────────────┘
```

### Fallback Logic

```
if (no embeddings available) {
  // Fallback: keyword-only (current behavior)
  return keywordMatchedEntries.sort(byInsertionOrder);
}
```

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/utils/prompt-utils.ts` | MODIFY | Refactor getRelevantWorldBookEntries |
| `src/services/worldbook-service.ts` | REFERENCE | Use retrieval methods |
| `src/types/character.d.ts` | REFERENCE | WorldBookEntry with embedding |

## Implementation Steps

### Step 1: Add Options Interface

File: `src/utils/prompt-utils.ts`

```typescript
// Add at top of file
export interface WorldbookRetrievalOptions {
  limit?: number;              // Max entries to return (default: 5)
  semanticThreshold?: number;  // Min similarity (default: 0.5)
  useSemanticSearch?: boolean; // Enable semantic ranking (default: true)
  characterId?: string;        // Required for semantic search
}
```

### Step 2: Refactor getRelevantWorldBookEntries

File: `src/utils/prompt-utils.ts`

```typescript
import { WorldbookService } from '@/services/worldbook-service';
import { getEmbeddingModel } from '@/utils/model-helpers';

/**
 * Hybrid retrieval: keyword pre-filter + semantic ranking + Top-K selection
 * Falls back to keyword-only if no embeddings available
 */
async function getRelevantWorldBookEntries(
  worldBook: WorldBookEntry[],
  chatHistoryString: string,
  currentUserInput: string,
  options: WorldbookRetrievalOptions = {}
): Promise<WorldBookEntry[]> {
  const {
    limit = 5,
    semanticThreshold = 0.5,
    useSemanticSearch = true,
    characterId,
  } = options;

  if (!worldBook || worldBook.length === 0) return [];

  const contextText = `${chatHistoryString}\nUser: ${currentUserInput}`.toLowerCase();

  // Step 1: Extract constant entries (always included)
  const constantEntries = worldBook.filter(
    entry => entry.constant && entry.enabled !== false
  );

  // Step 2: Keyword pre-filter for non-constant entries
  const keywordCandidates = worldBook.filter(entry => {
    if (entry.constant) return false; // Already in constantEntries
    if (!entry.enabled || entry.selective === false) return false;

    return Array.isArray(entry.keys) && entry.keys.some(key => {
      if (entry.useRegex) {
        try {
          return new RegExp(key, 'i').test(contextText);
        } catch {
          return false;
        }
      }
      return contextText.includes(key.toLowerCase());
    });
  });

  // Step 3: Check if semantic search is possible
  const hasEmbeddingModel = !!getEmbeddingModel();
  const hasEmbeddings = keywordCandidates.some(e => e.embedding?.length);

  // If no semantic search capability, fall back to keyword-only
  if (!useSemanticSearch || !hasEmbeddingModel || !hasEmbeddings) {
    console.log('Worldbook: Using keyword-only retrieval');
    const result = [...constantEntries, ...keywordCandidates];
    return result.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
  }

  // Step 4: Semantic ranking
  const query = `${chatHistoryString.slice(-500)}\n${currentUserInput}`;
  let queryEmbedding: number[] = [];

  try {
    // Generate query embedding (reuse WorldbookService logic)
    const embeddingModel = getEmbeddingModel()!;
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

    if (response.ok) {
      const data = await response.json();
      queryEmbedding = data.data?.[0]?.embedding || [];
    }
  } catch (e) {
    console.warn('Worldbook: Failed to generate query embedding, using keyword-only');
  }

  // Fallback if embedding generation failed
  if (!queryEmbedding.length) {
    const result = [...constantEntries, ...keywordCandidates];
    return result.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
  }

  // Score candidates by cosine similarity
  const scored = keywordCandidates
    .filter(e => e.embedding?.length) // Only score entries with embeddings
    .map(entry => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding!),
    }));

  // Step 5: Top-K selection
  const topK = scored
    .filter(s => s.score >= semanticThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);

  // Include keyword matches without embeddings (don't penalize unembedded entries)
  const unembeddedKeywordMatches = keywordCandidates.filter(e => !e.embedding?.length);

  // Merge: constants + topK semantic + unembedded keyword matches
  const merged = [...constantEntries, ...topK, ...unembeddedKeywordMatches];

  // Dedupe (in case constant entries also matched keywords)
  const seen = new Set<string>();
  const deduped = merged.filter(entry => {
    const key = entry.comment || entry.content?.slice(0, 50) || '';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Worldbook: Hybrid retrieval selected ${deduped.length} entries (${topK.length} semantic + ${constantEntries.length} constant)`);

  return deduped.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
}

// Cosine similarity helper (copy from memory-service or extract to shared util)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}
```

### Step 3: Update buildFinalPrompt Signature

File: `src/utils/prompt-utils.ts`

```typescript
export async function buildFinalPrompt(
  characterData: CharacterCard,
  chatHistoryString: string,
  currentUserInput: string,
  userProfile: { /* ... */ },
  prompts: { /* ... */ },
  responseInstructionHint?: string,
  responseLength?: number,
  relevantMemories?: string,
  worldbookOptions?: WorldbookRetrievalOptions  // NEW parameter
): Promise<{ systemPrompt: string; userPrompt: string }> {

  // Update call to getRelevantWorldBookEntries
  const relevantWorldBook = await getRelevantWorldBookEntries(
    characterData.data.worldBook || [],
    chatHistoryString,
    currentUserInput,
    {
      characterId: characterData.id,
      ...worldbookOptions,
    }
  );

  // ... rest of function unchanged
}
```

### Step 4: Update Callers of buildFinalPrompt

File: `src/components/chat_screen/ChatScreen.vue` (or wherever buildFinalPrompt is called)

```typescript
// Update call to include worldbook options
const { systemPrompt, userPrompt } = await buildFinalPrompt(
  characterData,
  chatHistoryString,
  currentUserInput,
  userProfile,
  prompts,
  responseInstructionHint,
  responseLength,
  relevantMemories,
  {
    limit: 5,                // Max worldbook entries
    semanticThreshold: 0.5,  // Min similarity
    useSemanticSearch: true, // Enable hybrid retrieval
    characterId: characterData.id,
  }
);
```

### Step 5: Extract Shared Utilities

File: `src/utils/vector-utils.ts` (NEW - optional refactor)

```typescript
/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}
```

Then import in both `memory-service.ts` and `prompt-utils.ts`.

## Todo List

- [ ] Add `WorldbookRetrievalOptions` interface
- [ ] Refactor `getRelevantWorldBookEntries()` to async with options
- [ ] Implement keyword pre-filter step
- [ ] Implement semantic ranking step
- [ ] Implement Top-K selection with threshold
- [ ] Add fallback to keyword-only mode
- [ ] Update `buildFinalPrompt()` signature
- [ ] Update all callers of `buildFinalPrompt()`
- [ ] Extract `cosineSimilarity` to shared utility (optional)
- [ ] Add console logs for debugging retrieval mode

## Success Criteria

1. Hybrid retrieval selects top-K semantically relevant entries
2. Constant entries always included regardless of ranking
3. Fallback to keyword-only when no embeddings available
4. Token usage reduced 50-70% compared to all-matching
5. No breaking changes to existing character cards
6. Console logs indicate retrieval mode (semantic vs. keyword-only)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Async change to buildFinalPrompt | High | Update all callers, test thoroughly |
| Query embedding API latency | Medium | Cache query embedding per request |
| Semantic vs. keyword mismatch | Low | Include unembedded entries in results |
| Breaking existing behavior | Medium | Extensive testing with existing cards |

## Security Considerations

- No user-controlled input in embedding API URL
- Query text truncated to prevent token abuse
- Embedding API key from stored LLMModels only

## Performance Notes

- Query embedding: ~100-300ms per request (API dependent)
- Cosine similarity: O(n) where n = candidate count, negligible
- Consider caching query embedding if chat history unchanged

## Next Steps

After completing this phase:
1. Proceed to [Phase 05: Testing + Migration](./phase-05-testing-migration.md)
2. Monitor token usage reduction in production
3. Tune limit and threshold parameters based on user feedback
