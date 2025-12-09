# Phase 05: Testing + Migration

**Parent:** [plan.md](./plan.md)
**Dependencies:** All previous phases
**Next:** Production deployment

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-08 |
| Priority | P0 (Critical) |
| Status | Pending |
| Estimate | 2-3 hours |

Comprehensive testing, migration scripts, and validation for worldbook optimization.

## Key Insights

1. **Non-breaking migration** - Add optional fields, don't modify existing data
2. **Lazy embedding** - Generate on first use, not on import
3. **Fallback testing** - Verify keyword-only mode works without embeddings
4. **SillyTavern compat** - Import/export must remain unchanged

## Requirements

### Testing

1. Unit tests for WorldbookService methods
2. Integration tests for hybrid retrieval
3. UI tests for worldbook editor flow
4. Regression tests for existing character cards

### Migration

1. No-op migration (existing cards work unchanged)
2. Lazy embedding generation on editor open
3. Console warnings for unembedded entries

### Validation

1. Token count comparison (before/after)
2. Relevance quality check (manual QA)
3. Performance benchmarks

## Architecture

### Test Structure

```
src/__tests__/
├── services/
│   └── worldbook-service.test.ts
├── utils/
│   ├── prompt-utils.test.ts
│   └── worldbook-merge.test.ts
└── components/
    └── worldbook/
        └── WorldbookEditor.test.ts
```

### Migration Strategy

```
No explicit migration needed because:
1. embedding?: number[] is optional (undefined = no embedding)
2. linkedGlobalWorldbooks?: string[] is optional (undefined = no links)
3. Hybrid retrieval falls back to keyword-only
```

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/__tests__/services/worldbook-service.test.ts` | CREATE | Service tests |
| `src/__tests__/utils/prompt-utils.test.ts` | CREATE | Retrieval tests |
| `src/utils/migration.ts` | CREATE | Optional utilities |

## Implementation Steps

### Step 1: WorldbookService Tests

File: `src/__tests__/services/worldbook-service.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorldbookService } from '@/services/worldbook-service';

// Mock fetch for embedding API
global.fetch = vi.fn();

// Mock model-helpers
vi.mock('@/utils/model-helpers', () => ({
  getEmbeddingModel: vi.fn(() => ({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    modelName: 'text-embedding-3-small',
  })),
}));

describe('WorldbookService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEntryEmbedding', () => {
    it('should generate embedding for entry content', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{ embedding: mockEmbedding }],
        }),
      });

      const entry = {
        keys: ['dragon', 'fire'],
        content: 'A fearsome fire-breathing creature',
        comment: 'Dragon',
        enabled: true,
      };

      const result = await WorldbookService.generateEntryEmbedding(entry);

      expect(result).toHaveLength(1536);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('dragon fire'),
        })
      );
    });

    it('should return empty array when no embedding model', async () => {
      vi.mocked(await import('@/utils/model-helpers')).getEmbeddingModel.mockReturnValueOnce(null);

      const result = await WorldbookService.generateEntryEmbedding({
        keys: ['test'],
        content: 'test',
      });

      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await WorldbookService.generateEntryEmbedding({
        keys: ['test'],
        content: 'test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('hasEmbeddingModel', () => {
    it('should return true when model configured', () => {
      expect(WorldbookService.hasEmbeddingModel()).toBe(true);
    });
  });
});
```

### Step 2: Hybrid Retrieval Tests

File: `src/__tests__/utils/prompt-utils.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorldBookEntry } from '@/types/character';

// Test data
const mockWorldbook: WorldBookEntry[] = [
  {
    keys: ['dragon'],
    content: 'Fire-breathing creature',
    comment: 'Dragon',
    enabled: true,
    position: 'after_char',
    embedding: Array(1536).fill(0.1),
  },
  {
    keys: ['elf'],
    content: 'Tall humanoid with pointed ears',
    comment: 'Elf',
    enabled: true,
    position: 'after_char',
    embedding: Array(1536).fill(0.2),
  },
  {
    keys: ['magic'],
    content: 'The arcane arts',
    comment: 'Magic System',
    enabled: true,
    constant: true,
    position: 'before_char',
  },
  {
    keys: ['sword'],
    content: 'A sharp blade',
    comment: 'Weapons',
    enabled: false, // Disabled
    position: 'after_char',
  },
];

describe('getRelevantWorldBookEntries', () => {
  describe('keyword-only mode', () => {
    it('should return entries matching keywords', async () => {
      // Test without embeddings available
      const result = await getRelevantWorldBookEntries(
        mockWorldbook.map(e => ({ ...e, embedding: undefined })),
        'The hero saw a dragon',
        'Tell me about dragons',
        { useSemanticSearch: false }
      );

      expect(result.some(e => e.comment === 'Dragon')).toBe(true);
      expect(result.some(e => e.comment === 'Magic System')).toBe(true); // Constant
    });

    it('should always include constant entries', async () => {
      const result = await getRelevantWorldBookEntries(
        mockWorldbook,
        'No keywords here',
        'Hello',
        { useSemanticSearch: false }
      );

      expect(result.some(e => e.comment === 'Magic System')).toBe(true);
    });

    it('should exclude disabled entries', async () => {
      const result = await getRelevantWorldBookEntries(
        mockWorldbook,
        'I need a sword',
        'Give me sword',
        { useSemanticSearch: false }
      );

      expect(result.some(e => e.comment === 'Weapons')).toBe(false);
    });
  });

  describe('hybrid mode', () => {
    it('should limit results to top-K', async () => {
      // Mock embedding generation
      const result = await getRelevantWorldBookEntries(
        mockWorldbook,
        'Fantasy adventure',
        'Tell me about creatures',
        { limit: 2, useSemanticSearch: true }
      );

      // Should have at most 2 + constants
      const nonConstant = result.filter(e => !e.constant);
      expect(nonConstant.length).toBeLessThanOrEqual(2);
    });

    it('should fall back to keyword-only when no embeddings', async () => {
      const noEmbeddings = mockWorldbook.map(e => ({
        ...e,
        embedding: undefined,
      }));

      const result = await getRelevantWorldBookEntries(
        noEmbeddings,
        'The dragon appeared',
        'dragon',
        { useSemanticSearch: true }
      );

      // Should still return keyword matches
      expect(result.some(e => e.comment === 'Dragon')).toBe(true);
    });
  });
});
```

### Step 3: Token Count Validation

File: `src/utils/token-validation.ts`

```typescript
import type { WorldBookEntry } from '@/types/character';

/**
 * Estimate token count for worldbook entries
 * Rough estimate: 1 token ≈ 4 characters (English)
 */
export function estimateTokenCount(entries: WorldBookEntry[]): number {
  return entries.reduce((total, entry) => {
    const content = entry.content || '';
    const comment = entry.comment || '';
    // Include XML wrapper overhead
    const overhead = 50; // <world_information tag="...">...</world_information>
    return total + Math.ceil((content.length + comment.length + overhead) / 4);
  }, 0);
}

/**
 * Compare token usage between full and filtered worldbook
 */
export function compareTokenUsage(
  fullWorldbook: WorldBookEntry[],
  filteredWorldbook: WorldBookEntry[]
): {
  fullTokens: number;
  filteredTokens: number;
  reduction: number;
  reductionPercent: string;
} {
  const fullTokens = estimateTokenCount(fullWorldbook);
  const filteredTokens = estimateTokenCount(filteredWorldbook);
  const reduction = fullTokens - filteredTokens;
  const reductionPercent = fullTokens > 0
    ? ((reduction / fullTokens) * 100).toFixed(1)
    : '0';

  return {
    fullTokens,
    filteredTokens,
    reduction,
    reductionPercent: `${reductionPercent}%`,
  };
}

/**
 * Log token comparison for debugging
 */
export function logTokenComparison(
  characterName: string,
  fullWorldbook: WorldBookEntry[],
  filteredWorldbook: WorldBookEntry[]
): void {
  const comparison = compareTokenUsage(fullWorldbook, filteredWorldbook);
  console.log(`[Worldbook Token Usage] ${characterName}:`);
  console.log(`  Full: ${comparison.fullTokens} tokens (${fullWorldbook.length} entries)`);
  console.log(`  Filtered: ${comparison.filteredTokens} tokens (${filteredWorldbook.length} entries)`);
  console.log(`  Reduction: ${comparison.reduction} tokens (${comparison.reductionPercent})`);
}
```

### Step 4: Migration Validation Script

File: `src/utils/migration.ts`

```typescript
import { db, CharacterCard } from '@/db';
import type { WorldBookEntry } from '@/types/character';

/**
 * Validate all character cards have valid worldbook structure
 * No actual migration needed - just validation
 */
export function validateWorldbooks(): {
  total: number;
  valid: number;
  issues: Array<{ characterId: string; issue: string }>;
} {
  const characters = db.CharacterCards.find().fetch() as CharacterCard[];
  const issues: Array<{ characterId: string; issue: string }> = [];

  for (const char of characters) {
    const worldbook = char.data?.worldBook;

    if (!worldbook) continue; // OK - no worldbook

    if (!Array.isArray(worldbook)) {
      issues.push({
        characterId: char.id,
        issue: 'worldBook is not an array',
      });
      continue;
    }

    for (let i = 0; i < worldbook.length; i++) {
      const entry = worldbook[i];

      if (!entry.keys || !Array.isArray(entry.keys)) {
        issues.push({
          characterId: char.id,
          issue: `Entry ${i}: keys is not an array`,
        });
      }

      if (typeof entry.content !== 'string') {
        issues.push({
          characterId: char.id,
          issue: `Entry ${i}: content is not a string`,
        });
      }
    }
  }

  return {
    total: characters.length,
    valid: characters.length - issues.length,
    issues,
  };
}

/**
 * Get embedding status for all characters
 */
export function getEmbeddingStatus(): Array<{
  characterId: string;
  characterName: string;
  totalEntries: number;
  embeddedEntries: number;
  percentage: string;
}> {
  const characters = db.CharacterCards.find().fetch() as CharacterCard[];

  return characters.map(char => {
    const worldbook = char.data?.worldBook || [];
    const embedded = worldbook.filter(e => e.embedding?.length).length;

    return {
      characterId: char.id,
      characterName: char.data?.name || 'Unknown',
      totalEntries: worldbook.length,
      embeddedEntries: embedded,
      percentage: worldbook.length > 0
        ? `${((embedded / worldbook.length) * 100).toFixed(0)}%`
        : 'N/A',
    };
  });
}

/**
 * Console report for migration status
 */
export function reportMigrationStatus(): void {
  console.log('=== Worldbook Migration Status ===');

  const validation = validateWorldbooks();
  console.log(`\nValidation: ${validation.valid}/${validation.total} characters valid`);

  if (validation.issues.length > 0) {
    console.log('Issues found:');
    validation.issues.forEach(i => console.log(`  - ${i.characterId}: ${i.issue}`));
  }

  const embeddings = getEmbeddingStatus();
  console.log('\nEmbedding Status:');
  embeddings.forEach(e => {
    console.log(`  ${e.characterName}: ${e.embeddedEntries}/${e.totalEntries} (${e.percentage})`);
  });
}
```

### Step 5: Manual QA Checklist

File: `plans/251208-1815-worldbook-optimization/qa-checklist.md`

```markdown
# QA Checklist

## Functional Tests

### WorldbookService
- [ ] Generate embedding for single entry
- [ ] Generate embeddings for all entries (with progress)
- [ ] Retrieve relevant entries with semantic search
- [ ] Handle missing embedding model gracefully
- [ ] Clear embeddings for character

### Editor UI
- [ ] Navigate to editor from character list
- [ ] Display all entries in DataTable
- [ ] Select entry opens sidebar form
- [ ] Add new entry
- [ ] Edit entry fields (title, keywords, content, position)
- [ ] Delete entry
- [ ] Save changes persist
- [ ] Unsaved changes warning on back
- [ ] Generate embeddings button works
- [ ] Progress indicator during embedding

### Hybrid Retrieval
- [ ] Keyword-only mode returns correct entries
- [ ] Semantic mode returns top-K entries
- [ ] Constant entries always included
- [ ] Disabled entries excluded
- [ ] Fallback to keyword-only when no embeddings

### Global Worldbooks (P1)
- [ ] Create global worldbook
- [ ] Edit global worldbook entries
- [ ] Delete global worldbook
- [ ] Link to character
- [ ] Unlink from character
- [ ] Merged entries appear in retrieval

## Regression Tests

- [ ] Existing character cards load correctly
- [ ] Chat with existing character works
- [ ] Import SillyTavern card works
- [ ] Export character card works
- [ ] No console errors on startup

## Performance

- [ ] Embedding generation < 2s per entry
- [ ] Editor loads < 500ms for 50 entries
- [ ] Retrieval completes < 500ms

## Token Reduction

- [ ] Measure before/after token count
- [ ] Target: 50-70% reduction
- [ ] Document actual reduction achieved
```

### Step 6: Add Debug Logging

File: Update `src/utils/prompt-utils.ts`

```typescript
// Add at end of getRelevantWorldBookEntries
if (process.env.NODE_ENV === 'development') {
  console.group('Worldbook Retrieval');
  console.log('Mode:', hasEmbeddingModel && hasEmbeddings ? 'Hybrid' : 'Keyword-only');
  console.log('Total entries:', worldBook.length);
  console.log('Constant entries:', constantEntries.length);
  console.log('Keyword matches:', keywordCandidates.length);
  if (topK) console.log('Semantic top-K:', topK.length);
  console.log('Final result:', deduped.length);
  console.groupEnd();
}
```

## Step 7: Fix Cross-Language Retrieval (Phase 05-b)

### Problem Statement

**Current Issue:**
- Keyword pre-filter blocks English worldbook entries when chatting in Vietnamese
- Example: Entry with `keys: ["dragon"]` NOT matched when query is "Rồng là gì?"
- Semantic search NEVER runs because keyword pre-filter eliminates entries first

**Impact:**
- Users with English character cards cannot use worldbooks when chatting in Vietnamese
- Forces unnecessary translation of all worldbook keys
- Wastes multilingual embedding capability

### Root Cause

File: `src/utils/prompt-utils.ts:86-101`

```typescript
// Step 2: Keyword pre-filter for non-constant entries
const keywordCandidates = worldBook.filter(entry => {
  if (entry.constant) return false;
  if (!entry.enabled || entry.selective === false) return false;

  return Array.isArray(entry.keys) && entry.keys.some(key => {
    if (entry.useRegex) {
      try {
        return new RegExp(key, 'i').test(contextText);
      } catch {
        return false;
      }
    }
    return contextText.includes(key.toLowerCase()); // ← BLOCKS cross-language
  });
});

// Only keywordCandidates go to semantic ranking
// English entries eliminated before semantic search!
```

### Solution: Semantic-First Retrieval

**Architecture Change:**
```
BEFORE (Hybrid with pre-filter):
  All entries → Keyword filter → [Small subset] → Semantic ranking → Top-K

AFTER (Semantic-first):
  Embedded entries → Semantic ranking → Top-K → Keyword boost (optional)
  Non-embedded entries → Keyword filter → Append to results
```

**Benefits:**
- ✅ Cross-language matching works (semantic search sees ALL embedded entries)
- ✅ Keyword matching becomes score booster, not eliminator
- ✅ No translation required for worldbook keys
- ✅ Multilingual embedding models fully utilized

### Implementation

File: `src/utils/prompt-utils.ts`

```typescript
export async function getRelevantWorldBookEntries(
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

  // Step 1: Extract constant entries (always included)
  const constantEntries = worldBook.filter(
    entry => entry.constant && entry.enabled !== false
  );

  // Step 2: Separate embedded vs non-embedded entries
  const embeddedEntries = worldBook.filter(
    e => !e.constant && e.enabled !== false && e.embedding?.length
  );
  const nonEmbeddedEntries = worldBook.filter(
    e => !e.constant && e.enabled !== false && !e.embedding?.length
  );

  const contextText = `${chatHistoryString}\n${currentUserInput}`.toLowerCase();

  // Step 3: Semantic-first retrieval for embedded entries
  if (useSemanticSearch && embeddedEntries.length > 0 && characterId) {
    try {
      const embeddingModel = getEmbeddingModel();
      if (!embeddingModel) {
        console.warn('No embedding model configured, using keyword-only');
        return [...constantEntries, ...getKeywordMatches(worldBook, contextText)];
      }

      // Generate query embedding
      const query = `${chatHistoryString.slice(-500)}\n${currentUserInput}`;
      const queryEmbedding = await generateQueryEmbedding(
        query,
        embeddingModel,
        characterId
      );

      if (!queryEmbedding || queryEmbedding.length === 0) {
        console.warn('Query embedding failed, falling back to keyword-only');
        return [...constantEntries, ...getKeywordMatches(worldBook, contextText)];
      }

      // Step 4: Semantic ranking (ALL embedded entries, no pre-filter)
      const scored = embeddedEntries.map(entry => {
        const similarity = cosineSimilarity(queryEmbedding, entry.embedding!);

        // Step 5: Optional keyword boost (+0.1 if keys match)
        const hasKeywordMatch = hasKeywordMatchInEntry(entry, contextText);
        const boostedScore = hasKeywordMatch ? similarity + 0.1 : similarity;

        return { entry, score: boostedScore, hasKeywordMatch };
      });

      // Step 6: Top-K selection with threshold
      const topK = scored
        .filter(s => s.score >= semanticThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.entry);

      // Step 7: Log retrieval for debugging
      if (process.env.NODE_ENV === 'development') {
        console.group('🔍 Worldbook Retrieval (Semantic-First)');
        console.log('Mode: Semantic-first with keyword boost');
        console.log('Total entries:', worldBook.length);
        console.log('Constant entries:', constantEntries.length);
        console.log('Embedded entries:', embeddedEntries.length);
        console.log('Top-K selected:', topK.length);
        console.log('Results:', [
          ...constantEntries.map(e => `[CONST] ${e.comment}`),
          ...topK.map((e, i) => {
            const s = scored.find(x => x.entry === e);
            return `[${i + 1}] ${e.comment} (score: ${s?.score.toFixed(2)}, keyword: ${s?.hasKeywordMatch ? 'YES' : 'NO'})`;
          })
        ]);
        console.groupEnd();
      }

      return [...constantEntries, ...topK];

    } catch (error) {
      console.error('Semantic search error:', error);
      // Fall back to keyword-only on error
    }
  }

  // Fallback: Keyword-only for non-embedded or when semantic disabled
  console.log('Using keyword-only retrieval (no embeddings or disabled)');
  const keywordMatches = getKeywordMatches(
    [...embeddedEntries, ...nonEmbeddedEntries],
    contextText
  );

  return [...constantEntries, ...keywordMatches];
}

/**
 * Helper: Check if entry has keyword match
 */
function hasKeywordMatchInEntry(entry: WorldBookEntry, contextText: string): boolean {
  if (!entry.keys || !Array.isArray(entry.keys)) return false;

  return entry.keys.some(key => {
    if (entry.useRegex) {
      try {
        return new RegExp(key, 'i').test(contextText);
      } catch {
        return false;
      }
    }
    return contextText.includes(key.toLowerCase());
  });
}

/**
 * Helper: Get keyword-only matches (for fallback)
 */
function getKeywordMatches(
  entries: WorldBookEntry[],
  contextText: string
): WorldBookEntry[] {
  return entries.filter(entry => hasKeywordMatchInEntry(entry, contextText));
}
```

### Testing Cross-Language

File: `src/__tests__/utils/prompt-utils-crosslang.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getRelevantWorldBookEntries } from '@/utils/prompt-utils';
import type { WorldBookEntry } from '@/types/character';

describe('Cross-Language Retrieval', () => {
  const englishWorldbook: WorldBookEntry[] = [
    {
      keys: ['dragon', 'mythical beast'],
      content: 'Dragons are ancient fire-breathing creatures',
      comment: 'Dragon Lore',
      enabled: true,
      embedding: Array(1536).fill(0.1), // Mock embedding
    },
    {
      keys: ['elf', 'forest dweller'],
      content: 'Elves are immortal beings living in forests',
      comment: 'Elf Description',
      enabled: true,
      embedding: Array(1536).fill(0.2),
    },
  ];

  it('should retrieve English entries with Vietnamese query', async () => {
    // Vietnamese: "Tell me about dragons"
    const vietnameseQuery = 'Kể cho tôi nghe về rồng';

    // Mock embedding generation to return similar vector for Vietnamese query
    const result = await getRelevantWorldBookEntries(
      englishWorldbook,
      '',
      vietnameseQuery,
      {
        useSemanticSearch: true,
        semanticThreshold: 0.5,
        characterId: 'test-char',
      }
    );

    // Should find "Dragon Lore" despite language mismatch
    expect(result.some(e => e.comment === 'Dragon Lore')).toBe(true);
  });

  it('should NOT block entries with keyword pre-filter', async () => {
    // This test verifies semantic-first approach
    const vietnameseQuery = 'Rồng bay trên trời'; // "Dragon flying in sky"

    const result = await getRelevantWorldBookEntries(
      englishWorldbook,
      '',
      vietnameseQuery,
      {
        useSemanticSearch: true,
        characterId: 'test-char',
      }
    );

    // With old keyword pre-filter: result.length === 0 (blocked)
    // With semantic-first: result.length > 0 (semantic match)
    expect(result.length).toBeGreaterThan(0);
  });

  it('should boost entries with keyword match', async () => {
    // Mixed language: Vietnamese query with English word
    const mixedQuery = 'Kể về dragon trong thần화'; // "Tell about dragon in mythology"

    const result = await getRelevantWorldBookEntries(
      englishWorldbook,
      '',
      mixedQuery,
      {
        useSemanticSearch: true,
        characterId: 'test-char',
      }
    );

    // Dragon entry should rank higher (keyword "dragon" matched)
    expect(result[0]?.comment).toBe('Dragon Lore');
  });
});
```

### Migration Notes

**No Breaking Changes:**
- Existing keyword-only fallback still works
- Constant entries behavior unchanged
- API signature unchanged (WorldbookRetrievalOptions same)

**Performance Impact:**
- Slightly slower: Ranks ALL embedded entries instead of pre-filtered subset
- Mitigation: Most character cards have <100 entries, cosine similarity is fast (O(n))
- Benchmarks: 100 entries × 1536 dimensions ≈ 10-20ms on modern CPU

### Success Criteria

1. ✅ Vietnamese query + English worldbook → Entries retrieved
2. ✅ English query + Vietnamese worldbook → Entries retrieved
3. ✅ Mixed language queries work correctly
4. ✅ Keyword matching still boosts relevant entries
5. ✅ Fallback to keyword-only when no embeddings
6. ✅ Performance <50ms for 100 entries

### Documentation Update

Add to `docs/PHASE-04-GLOBAL-WORLDBOOKS.md`:

```markdown
## Cross-Language Support (Phase 05-b)

### Multilingual Retrieval

The hybrid retrieval system supports cross-language matching using multilingual embedding models:

**Supported Scenarios:**
- ✅ Chat in Vietnamese, worldbook in English
- ✅ Chat in English, worldbook in Vietnamese
- ✅ Mixed language queries
- ✅ Character cards from SillyTavern (typically English)

**How It Works:**
1. Embedding models (e.g., `text-embedding-3-small`) are multilingual
2. Semantic search ranks ALL embedded entries (no keyword pre-filter)
3. Keyword matching becomes optional score booster (+0.1)
4. Top-K selection picks highest scoring entries

**Example:**
```typescript
// English worldbook entry
{
  keys: ["dragon"],
  content: "Dragons are fire-breathing...",
  embedding: [0.23, -0.41, 0.88, ...]
}

// Vietnamese query: "Rồng là gì?" (What is dragon?)
// Query embedding: [0.19, -0.38, 0.85, ...]
// Cosine similarity: 0.92 (HIGH) → Entry selected ✅
```

**No Translation Required:**
- Worldbook content can stay in original language (English)
- Optional: Add Vietnamese translations to `entry.keys[]` for keyword boost
- Semantic search handles language differences automatically
```

## Todo List

- [ ] Create `src/__tests__/services/worldbook-service.test.ts`
- [ ] Create `src/__tests__/utils/prompt-utils.test.ts`
- [ ] Create `src/utils/token-validation.ts`
- [ ] Create `src/utils/migration.ts`
- [ ] Add debug logging to prompt-utils
- [ ] Run validation script on test data
- [ ] Execute QA checklist
- [ ] Document token reduction results
- [ ] Create qa-checklist.md

### Phase 05-b: Cross-Language Fix
- [ ] Refactor `getRelevantWorldBookEntries()` to semantic-first
- [ ] Extract `hasKeywordMatchInEntry()` helper
- [ ] Extract `getKeywordMatches()` helper
- [ ] Add keyword boost logic (+0.1)
- [ ] Add debug logging for retrieval mode
- [ ] Create cross-language test suite
- [ ] Test Vietnamese + English scenarios
- [ ] Test English + Vietnamese scenarios
- [ ] Benchmark performance (target: <50ms for 100 entries)
- [ ] Update documentation with multilingual support

## Success Criteria

1. All unit tests pass
2. No regression in existing functionality
3. Token reduction >= 50% on test characters
4. QA checklist completed with no blockers
5. Console logs show retrieval mode correctly

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test coverage gaps | Medium | Focus on critical paths |
| Flaky embedding API tests | Low | Mock API responses |
| Performance regression | Medium | Add timing benchmarks |
| Data corruption | High | Validate before/after |

## Security Considerations

- Test data should not contain real API keys
- Mocked responses should match real API shape
- No test pollution between runs

## Deployment Notes

1. No database migration required
2. Feature flag not needed (graceful fallback)
3. Monitor console for retrieval mode logs
4. Collect token usage metrics post-deploy
