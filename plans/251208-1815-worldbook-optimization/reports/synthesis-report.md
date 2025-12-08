# Synthesis Report: Worldbook Optimization Strategy

**Date:** 2025-12-08
**Plan:** `plans/251208-1815-worldbook-optimization`

## Executive Summary

Optimize worldbook/lorebook system to reduce token usage by 50-70% through:
1. Hybrid retrieval (keyword + semantic search)
2. Dedicated worldbook editor UI
3. Global + character-specific worldbook hierarchy
4. RAG integration for intelligent selection

## Research Synthesis

### Token Optimization (Researcher 01)

**Current State:** All matching entries injected → wasteful
**Target:** Selective injection via hybrid search

**Implementation Strategy:**
- **Keyword pre-filter** → Fast initial screening (existing logic)
- **Semantic ranking** → Cosine similarity with query embedding
- **Top-K selection** → Budget-aware (e.g., top 3-5 entries)
- **Minimum threshold** → 0.5 similarity (align with existing RAG)

**Expected Impact:** 50-70% token reduction vs. full injection

### RAG Integration Pattern (Researcher 01 + Codebase)

**Reuse Existing Infrastructure:**
- MemoryService already implements:
  - `generateEmbedding()` → Embedding model API
  - `cosineSimilarity()` → Vector comparison
  - IndexedDB storage via SignalDB

**New Service:** `WorldbookService` extends MemoryService pattern
```typescript
class WorldbookService {
  static async embedWorldbookEntry(entry: WorldBookEntry): Promise<number[]>
  static async retrieveRelevantEntries(
    characterId: string,
    query: string,
    limit: number
  ): Promise<WorldBookEntry[]>
}
```

**Storage Strategy:**
- Add `worldbookEmbedding?: number[]` to WorldBookEntry
- Generate on save/import (async operation)
- Cache in character data (no separate collection needed initially)

### UI Architecture (Researcher 02 + Codebase)

**New Screen:** `WORLDBOOK_EDITOR`

**Component Hierarchy:**
```
WorldbookEditor.vue
├── DataTable (PrimeVue) → List view with row selection
│   ├── Column: Title (comment)
│   ├── Column: Keys (Chips display)
│   ├── Column: Position
│   └── Column: Actions (Edit/Delete)
└── Sidebar (PrimeVue) → Detail editor (overlay on mobile)
    ├── Form fields (InputText, Textarea, Select)
    ├── Keyword manager (Chips input)
    ├── Toggle switches (enabled, constant, selective)
    └── Save/Cancel buttons
```

**Responsive Breakpoints:**
- Mobile (<640px): Stacked layout, drawer overlay
- Tablet (640-1024px): Single column with expandable rows
- Desktop (>1024px): DataTable + side panel

### Reusability Pattern (Researcher 01 + Requirements)

**Two-tier Hierarchy:**

1. **Character-specific:** `CharacterCard.data.worldBook[]` (existing)
2. **Global shared:** New collection `GlobalWorldbooks`

**Data Model:**
```typescript
export type GlobalWorldbookType = {
  id: string;
  name: string;           // "Fantasy Races", "Modern Tech"
  description?: string;
  entries: WorldBookEntry[];
  tags?: string[];
  createdAt: number;
}

// Add to CharacterCard
export type CharacterCardType = {
  // ... existing fields
  linkedGlobalWorldbooks?: string[]; // IDs of global worldbooks to merge
}
```

**Merge Logic:**
```typescript
function getMergedWorldbook(characterId: string): WorldBookEntry[] {
  const char = db.CharacterCards.findOne({id: characterId});
  const characterEntries = char.data.worldBook || [];

  const globalEntries = (char.linkedGlobalWorldbooks || [])
    .flatMap(id => db.GlobalWorldbooks.findOne({id})?.entries || []);

  return [...globalEntries, ...characterEntries]; // Character overrides global
}
```

## Implementation Priorities

### P0 (Core Functionality)
1. WorldbookService with RAG integration
2. Worldbook editor screen (DataTable + Sidebar)
3. Hybrid retrieval in prompt-utils.ts
4. Migration: Generate embeddings for existing worldbooks

### P1 (Enhanced UX)
5. Global worldbook collection + UI
6. Link management in character editor
7. Bulk operations (import/export, enable/disable)
8. Real-time validation + Toast feedback

### P2 (Polish)
9. Advanced filters (by tag, position, importance)
10. Usage analytics (token count preview)
11. Duplicate detection
12. Regex pattern testing UI

## Technical Constraints

- **Client-side only:** No server for batch embedding (run async on save)
- **IndexedDB limits:** ~50MB typical (monitor with worldbook count)
- **Embedding model:** Must configure via LLM_Models (type: 'embedding')
- **Compatibility:** Must parse/export SillyTavern format unchanged

## Risk Mitigation

**Risk:** Embedding generation slow for large worldbooks
**Mitigation:**
- Lazy generation (on first use)
- Progress indicator
- Skip if embedding model not configured

**Risk:** Breaking existing character cards
**Mitigation:**
- Migration script to add `worldbookEmbedding: []` (non-breaking)
- Fallback to keyword-only if no embeddings

**Risk:** UI complexity overwhelming users
**Mitigation:**
- Progressive disclosure (advanced options collapsed)
- Tooltips with examples
- Default values match SillyTavern behavior

## Success Metrics

1. **Token Reduction:** 50-70% fewer worldbook tokens injected
2. **Relevance:** Retrieved entries match context (manual QA)
3. **Performance:** Embedding generation <2s per entry
4. **Compatibility:** Import/export SillyTavern cards without data loss
5. **UX:** Users can edit worldbooks without reading docs

## Unresolved Questions

1. Optimal embedding model recommendation? (text-embedding-3-small works but costs?)
2. Should global worldbooks support versioning? (deferred to P2)
3. Token budget UI: show preview before sending? (P1 feature)
