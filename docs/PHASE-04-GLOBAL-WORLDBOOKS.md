# Phase 04: Global Worldbooks Implementation

**Date:** 2025-12-09
**Status:** ✅ Complete
**Version:** 1.0.0-alpha.2

## Executive Summary

Phase 04 implements shared/global worldbooks that can be linked to multiple characters. Enables content creators to maintain single-source-of-truth worldbooks (e.g., campaign settings, shared lore) that multiple characters reference.

## Features Delivered

### 1. GlobalWorldbookType Interface
**File:** `src/types/character.d.ts`

New type definition for globally-shared worldbooks:
```typescript
interface GlobalWorldbookType {
  id: string;
  name: string;
  description?: string;
  entries: WorldBookEntry[];  // Same structure as character worldbooks
  tags?: string[];             // For categorization
  createdAt: number;
  updatedAt: number;
}
```

### 2. IndexedDB Storage
**File:** `src/db/index.ts`

- **GlobalWorldbooks collection** - Persists global worldbook objects
- **Character extension** - Added `linkedGlobalWorldbooks?: string[]` field to CharacterCard
  - Stores array of global worldbook IDs linked to character
  - Supports many-to-many relationships

### 3. Global Worldbook Store
**File:** `src/stores/global-worldbook.ts`

Pinia store for CRUD operations on global worldbooks:

**State:**
- `worldbooks: GlobalWorldbookType[]` - All global worldbooks
- `selectedId: string | null` - Currently selected worldbook
- `selectedWorldbook: computed` - Derived selected item

**Actions:**
- `loadAll()` - Fetch all global worldbooks
- `create(name, description?)` - Create new global worldbook
- `update(id, updates)` - Update properties + timestamp
- `remove(id)` - Delete + cleanup orphaned character links
- `addEntry(worldbookId, entry)` - Add entry to global worldbook
- `updateEntry(worldbookId, index, entry)` - Modify entry
- `removeEntry(worldbookId, index)` - Delete entry

**Key Pattern:** All mutations auto-reload from DB to keep state in sync.

### 4. Worldbook Merge Utility
**File:** `src/utils/worldbook-merge.ts`

Functions for combining global + character worldbooks during prompt building:

```typescript
getMergedWorldbook(characterId: string): WorldBookEntry[]
  // Returns global entries first, then character entries
  // Used by PromptUtils during prompt building

hasLinkedGlobalWorldbooks(characterId: string): boolean
  // Check if character has any linked global worldbooks
```

**Logic:**
1. Fetch character's `linkedGlobalWorldbooks[]`
2. For each ID: retrieve GlobalWorldbooks entries
3. Combine: `[...globalEntries, ...characterEntries]`
4. Return merged list for semantic retrieval

### 5. Character Worldbook Store Extension
**File:** `src/stores/worldbook.ts`

New action in existing worldbookStore:
```typescript
linkGlobalWorldbooks(charId: string, linkedIds: string[]): boolean
  // Saves linkedGlobalWorldbooks to character
  // Persists to IndexedDB
```

### 6. UI Components

#### GlobalWorldbookManager.vue (NEW)
**File:** `src/components/worldbook/GlobalWorldbookManager.vue`

Global worldbook management interface:
- Create new global worldbooks
- Edit existing (name, description, entries)
- Delete with orphaned link cleanup
- Entry form reuse pattern
- Table/list view

#### WorldbookLinker.vue (NEW)
**File:** `src/components/worldbook/WorldbookLinker.vue`

Character-specific linking component:
- Multi-select available global worldbooks
- Integrated into WorldbookEditor
- Saves selection to character.linkedGlobalWorldbooks
- Visual feedback on current links

#### WorldbookEditor.vue (Modified)
**File:** `src/components/worldbook/WorldbookEditor.vue`

Integrated WorldbookLinker component:
- Existing: Character-specific worldbook management
- **NEW:** Section showing/managing linked global worldbooks

### 7. Navigation Integration
**Files:** `src/constants.ts`, `src/components/NavConfig.vue`, `src/stores/screen.ts`

- New screen mode: `GLOBAL_WORLDBOOK_MANAGER`
- Menu item to access global worldbook manager
- Screen state integrated with existing navigation

### 8. Internationalization
**File:** `src/i18n.ts`

Added translations for:
- GlobalWorldbookManager menu/UI
- WorldbookLinker labels
- CRUD action messages

## Technical Architecture

### Data Model
```
Characters (N) ←→ GlobalWorldbooks (M)
                (many-to-many via linkedGlobalWorldbooks[])

Character {
  ...
  linkedGlobalWorldbooks?: ["global-wb-id-1", "global-wb-id-2"]
}

GlobalWorldbook {
  id: string
  name: string
  entries: WorldBookEntry[]
}
```

### Retrieval Flow
```
buildFinalPrompt(characterId, userMessage)
  → getMergedWorldbook(characterId)
    → Fetch character
    → For each linkedGlobalWorldbookId:
        → Fetch GlobalWorldbook
        → Collect entries
    → Combine with character.worldBook
  → Return merged entries
  → Pass to hybrid retrieval (Phase 03) [Future]
```

### Cleanup on Deletion
When global worldbook deleted:
```
remove(globalWbId)
  → Find all characters
  → For each character with linkedGlobalWorldbooks including globalWbId:
      → Remove globalWbId from array
      → Save character
  → Delete global worldbook
```

**Note:** Auto-cleanup but no user warning (potential future improvement).

## Integration Points

### Existing Systems

1. **PromptUtils** (Phase 03 placeholder)
   - Should integrate `getMergedWorldbook()` when building final prompt
   - Currently: unused in actual prompt building
   - Future: Hybrid retrieval will work on merged entries

2. **WorldbookService** (Phase 01)
   - Can embed global worldbook entries independently
   - Embeddings propagate to character references

3. **memoryStore** (Existing)
   - No changes; parallel system

### New Dependencies
- GlobalWorldbookType (character.d.ts)
- globalWorldbookStore (stores)
- worldbook-merge utility
- WorldbookLinker component

## Files Changed

| File | Change | Type |
|------|--------|------|
| src/types/character.d.ts | GlobalWorldbookType interface | Type |
| src/db/index.ts | GlobalWorldbooks collection, linkedGlobalWorldbooks field | Schema |
| src/utils/worldbook-merge.ts | Merge functions | Utility |
| src/stores/global-worldbook.ts | New store | Store |
| src/stores/worldbook.ts | linkGlobalWorldbooks action | Store |
| src/components/worldbook/GlobalWorldbookManager.vue | New component | UI |
| src/components/worldbook/WorldbookLinker.vue | New component | UI |
| src/components/worldbook/WorldbookEditor.vue | Integrated linker | UI |
| src/constants.ts | GLOBAL_WORLDBOOK_MANAGER screen | Config |
| src/components/NavConfig.vue | Menu item | UI |
| src/stores/screen.ts | Component registration | Config |
| src/i18n.ts | Translations | Config |

## Success Criteria Met

- [x] Global worldbooks can be created/edited/deleted
- [x] Per-character linking via UI
- [x] Merged retrieval available (getMergedWorldbook)
- [x] Orphaned link cleanup on deletion
- [x] Navigation menu integrated
- [x] Type-safe throughout

## Known Limitations & Future Work

### Current Limitations
1. **No user warning on deletion** - Orphaned character links auto-cleaned silently
2. **No import/export** - Global worldbooks only available in this session
3. **No versioning** - No history tracking for global worldbooks
4. **No embedding support yet** - Global entries not embedded (Phase 03)

### Integration with Phase 03 (Blocked)
- Phase 03 (Hybrid Retrieval) should use merged worldbooks
- Currently blocked by Phase 01/02 code review fixes
- Will need to update prompt-utils.ts to call getMergedWorldbook()

### Future Enhancements
- Global worldbook import/export (JSON/XML)
- Versioning + history tracking
- User confirmation on deletion
- Batch embedding for global entries
- Search across global worldbooks

## Testing Recommendations

### Unit Tests
- GlobalWorldbookStore: CRUD operations
- WorldbookMerge: Merge logic, edge cases
- Cleanup: Orphaned link removal

### Integration Tests
- Link global worldbook to character
- Verify merged retrieval includes both
- Delete global worldbook → verify character cleanup
- Navigation to GlobalWorldbookManager

### E2E Tests
- Complete flow: Create global WB → Link to character → Verify in chat context

## Deployment Notes

- No breaking changes to existing characters
- Existing characters work without global links
- Old installations: linkedGlobalWorldbooks undefined (safe default)
- No migration needed

## References

- **Types:** src/types/character.d.ts
- **Store:** src/stores/global-worldbook.ts
- **Utils:** src/utils/worldbook-merge.ts
- **Components:** src/components/worldbook/
- **Related Phase:** Phase 03 (blocked), Phase 01-02 (blocker)

## Next Steps

1. **Phase 03 Implementation** - Integrate getMergedWorldbook() into prompt building
   - Currently blocked by Phase 01/02 code review issues
   - Once unblocked: update PromptUtils to use merged worldbooks

2. **Phase 05 - Testing**
   - Unit tests for Phase 04 components
   - Integration tests with Phase 01-02 fixes

3. **Phase 04+ Enhancements** (Later)
   - Import/export for global worldbooks
   - Batch embedding operations
   - Deletion warning confirmation
