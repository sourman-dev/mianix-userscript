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
