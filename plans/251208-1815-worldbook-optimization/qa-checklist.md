# QA Checklist - Worldbook Optimization

**Date:** 2025-12-08
**Tester:** _______________
**Build:** _______________

## Pre-Testing Setup

- [ ] Ensure embedding model configured in LLM Models
- [ ] Have test character with 10+ worldbook entries
- [ ] Clear browser console

---

## Phase 01: WorldbookService

### Embedding Generation
- [ ] `WorldbookService.hasEmbeddingModel()` returns true
- [ ] `WorldbookService.generateEntryEmbedding()` returns vector
- [ ] `WorldbookService.embedAllEntries()` processes all entries
- [ ] Progress callback fires during batch embedding
- [ ] Entries marked with embedding after generation

### Error Handling
- [ ] Returns empty array when no embedding model
- [ ] Handles API timeout gracefully
- [ ] Logs errors to console

---

## Phase 02: Editor UI

### Navigation
- [ ] Worldbook edit button visible on character card
- [ ] Click button navigates to editor screen
- [ ] Back button returns to character list

### DataTable
- [ ] All entries displayed with correct columns
- [ ] Title column shows comment or "Untitled"
- [ ] Keywords column shows chips (max 3 + overflow)
- [ ] Position column shows human-readable label
- [ ] Enabled toggle works inline
- [ ] Delete button removes entry

### Entry Form (Sidebar)
- [ ] Click row opens sidebar
- [ ] Form populated with entry data
- [ ] Title field editable
- [ ] Keywords chips add/remove works
- [ ] Content textarea editable with char count
- [ ] Position dropdown has 4 options
- [ ] Insertion order numeric input works
- [ ] Toggle switches (enabled, constant, selective, useRegex)
- [ ] Changes reflected immediately in table

### Save/Cancel
- [ ] "Unsaved changes" indicator appears
- [ ] Save button enabled when dirty
- [ ] Save persists to database
- [ ] Toast notification on save
- [ ] Back navigation warns if unsaved

### Responsive
- [ ] Desktop: side panel layout
- [ ] Mobile: drawer overlay

---

## Phase 03: Hybrid Retrieval

### Keyword-Only Mode
- [ ] Works when no embedding model configured
- [ ] Matches entries by keyword in context
- [ ] Constant entries always included
- [ ] Disabled entries excluded
- [ ] Respects insertionOrder

### Semantic Mode
- [ ] Activates when embeddings available
- [ ] Generates query embedding
- [ ] Scores entries by similarity
- [ ] Filters by threshold (0.5)
- [ ] Limits to top-K (default 5)

### Fallback
- [ ] Falls back to keyword-only if embedding fails
- [ ] Console logs retrieval mode

### Token Reduction
| Character | Full Entries | Full Tokens | Filtered Entries | Filtered Tokens | Reduction |
|-----------|--------------|-------------|------------------|-----------------|-----------|
| _________ | _____ | _____ | _____ | _____ | _____% |
| _________ | _____ | _____ | _____ | _____ | _____% |

---

## Phase 04: Global Worldbooks (P1)

### Management
- [ ] Create new global worldbook
- [ ] Edit global worldbook name/description
- [ ] Delete global worldbook
- [ ] Add entries to global worldbook
- [ ] Edit entries in global worldbook
- [ ] Remove entries from global worldbook

### Linking
- [ ] Link global worldbook to character
- [ ] Multiple links allowed
- [ ] Unlink removes from character
- [ ] Linked entries appear in retrieval

### Merge Logic
- [ ] Global entries injected before character entries
- [ ] Character entries can override global

---

## Regression Tests

### Existing Functionality
- [ ] App loads without errors
- [ ] Character list displays correctly
- [ ] Chat with character works
- [ ] Memories extracted correctly
- [ ] Translate screen works

### Import/Export
- [ ] Import SillyTavern PNG card
- [ ] Worldbook entries imported correctly
- [ ] Export character (if implemented)
- [ ] No data loss on round-trip

---

## Performance Benchmarks

| Operation | Target | Actual |
|-----------|--------|--------|
| Editor load (50 entries) | < 500ms | ___ms |
| Embedding generation (1 entry) | < 2000ms | ___ms |
| Retrieval (50 entry worldbook) | < 500ms | ___ms |

---

## Issues Found

| Issue | Severity | Steps to Reproduce | Status |
|-------|----------|-------------------|--------|
| | | | |
| | | | |
| | | | |

---

## Sign-Off

- [ ] All P0 tests pass
- [ ] Token reduction target met (>= 50%)
- [ ] No blocking issues

**Tester Signature:** _______________ **Date:** _______________
