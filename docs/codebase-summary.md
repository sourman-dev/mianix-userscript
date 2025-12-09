# Codebase Summary

**Last Updated:** 2025-12-08
**Project:** Mianix Userscript (Vue 3 + TypeScript + Vite)
**Total Lines:** ~2,300 source files
**Components:** 20+ Vue components, 15+ services/utils, 5+ stores

## Quick Navigation

- **Architecture:** See [system-architecture.md](./system-architecture.md)
- **Code Standards:** See [code-standards.md](./code-standards.md)
- **Project Overview & PDR:** See [project-overview-pdr.md](./project-overview-pdr.md)

## Project Structure

```
src/
├── components/
│   ├── character_cards/          # Character selection & management
│   │   └── Index.vue              (Character card display)
│   ├── chat_screen/               # Chat interface
│   │   └── ChatScreen.vue         (Main chat UI)
│   ├── worldbook/                 # NEW: Worldbook management [Phase 01-02]
│   │   ├── WorldbookEditor.vue    (Main editor component)
│   │   ├── WorldbookTable.vue     (Entry data table)
│   │   └── WorldbookEntryForm.vue (Add/edit form)
│   └── ...others
├── services/
│   ├── memory-service.ts          # Memory/embedding management
│   ├── worldbook-service.ts       # NEW: Worldbook RAG [Phase 01]
│   ├── api-service.ts             # API client
│   ├── prompt-utils.ts            # Prompt building utilities
│   └── ...others
├── stores/
│   ├── screen.ts                  # Screen/mode management (updated Phase 02)
│   ├── worldbook.ts               # NEW: Worldbook state [Phase 02]
│   ├── memory.ts                  # Memory state
│   └── ...others
├── types/
│   └── character.d.ts             # Type definitions (updated Phase 01)
├── constants.ts                   # App constants (updated Phase 02)
└── utils/
    ├── prompt-utils.ts            # Prompt generation
    └── ...others
```

## Core Features

### 1. Character Management
- Multi-character support with persistent storage
- Profile management (name, avatar, worldbooks)
- Auto-save on modifications

### 2. Memory System (RAG)
- Embedding-based semantic search
- Configurable memory threshold (0.5)
- Graceful fallback without embedding model
- IndexedDB persistent storage

### 3. Chat Interface
- Multi-model support (auto-detect provider)
- Streaming response support
- Prompt building with memory injection

### 4. Worldbook System (NEW - Phase 01-02)
- Keyword-based worldbook entry filtering
- Semantic ranking via embeddings (optional)
- UI editor for managing worldbook entries
- Hybrid retrieval (keyword + semantic)
- RAG integration with prompt builder

## Phase 01-02 Implementation Summary

### Phase 01: WorldbookService + Embeddings
**Status:** ✅ Completed (Needs Fixes)
**Files Created:**
- `src/services/worldbook-service.ts` (220 lines)
- `src/services/index.ts` (barrel export)

**Files Modified:**
- `src/types/character.d.ts` - Added `embedding?: number[]` field
- `src/constants.ts` - Added WORLDBOOK_EDITOR screen type

**Key Achievements:**
- Reused MemoryService pattern for consistency
- Lazy embedding generation (non-blocking)
- Graceful fallback without embedding model
- Coerce similarity threshold (0.5)

**Issues Found:** See code review report
- Store import anti-pattern (race condition)
- Missing input validation
- Error handling gaps

### Phase 02: Worldbook Editor UI
**Status:** ✅ Completed (Needs Fixes)
**Files Created:**
- `src/components/worldbook/WorldbookEditor.vue` (111 lines)
- `src/components/worldbook/WorldbookTable.vue` (107 lines)
- `src/components/worldbook/WorldbookEntryForm.vue` (182 lines)
- `src/stores/worldbook.ts` (163 lines)

**Files Modified:**
- `src/components/character_cards/Index.vue` - Added worldbook editor access
- `src/stores/screen.ts` - Added WORLDBOOK_EDITOR mode

**Key Achievements:**
- DataTable component for entry management
- Add/edit entry form with validation
- Embedding progress tracking
- Progress status badge

**Issues Found:** See code review report
- High-priority fixes needed before production
- Input validation gaps
- Error handling improvements

## Type System

### Key Types (character.d.ts)
```typescript
interface Character {
  id: string;
  name: string;
  description: string;
  worldBook?: WorldBook;
  // ... other fields
}

interface WorldBookEntry {
  key: string;
  keys: string[];
  content: string;
  embedding?: number[];  // NEW [Phase 01]
}

interface WorldBook {
  name: string;
  description: string;
  entries: WorldBookEntry[];
}
```

## Technology Stack

- **Framework:** Vue 3 with Composition API
- **Language:** TypeScript 5+
- **Build Tool:** Vite
- **Storage:** IndexedDB (via dexie)
- **State Management:** Pinia
- **Styling:** Tailwind CSS
- **Components:** Custom Vue 3 components

## Service Layer

### MemoryService
- `generateEmbedding(text)` - Creates embeddings via API
- `cosineSimilarity(vec1, vec2)` - Similarity calculation
- Stores/retrieves memories from IndexedDB

### WorldbookService (NEW)
- `hasEmbeddingModel()` - Check embedding availability
- `embedAllEntries(characterId, cb)` - Generate embeddings for all entries
- `retrieveRelevantEntries(characterId, query, limit)` - Semantic search
- Fallback to keyword-only if no embeddings

### PromptUtils
- `buildFinalPrompt()` - Assembles system prompt + context
- Integration hooks for memory and worldbook injection
- Supports hybrid retrieval (Phase 03)

## State Management (Pinia)

### screenStore
- Active screen mode (CHAT, CHARACTER_EDITOR, **WORLDBOOK_EDITOR** new)
- Modal state management
- Screen-specific settings

### memoryStore
- Memory entries state
- CRUD operations
- Synchronization with MemoryService

### worldbookStore (NEW)
- Current character's worldbook state
- Entry management (add, edit, delete)
- Embedding progress tracking
- Trigger service methods

## Recent Changes (Dec 8, 2025)

### Commits
1. ✅ Phase 01 + 02 parallel implementation (worldbook service + UI)
2. Character profile extraction feature
3. Multi-model support enhancements

### Build Status
- ✅ Vite build passes
- ✅ Type checking clean
- ⚠️ Minor code review issues (see plan reports)

## Dependencies & Integration Points

### Upstream (Depends On)
- Character data from IndexedDB
- Embedding model configuration
- API endpoints for model inference

### Downstream (Used By)
- Prompt generation system
- Chat context building
- Memory injection pipeline

## Known Issues

See: [Code Review Report](../plans/251208-1815-worldbook-optimization/reports/code-reviewer-251208-worldbook-phase01-phase02.md)

**High Priority:**
1. Store import anti-pattern (race condition risk)
2. Missing input validation in addEntry()
3. Error handling gaps in UI components

**Medium Priority:**
1. Type safety improvements in worldbook store
2. Missing null checks in form submission
3. Partial tests coverage

## Next Phases

- **Phase 03:** Hybrid retrieval integration in prompt generation
- **Phase 04:** Global worldbooks support
- **Phase 05:** Testing & migration to production

## Performance Metrics

- Embedding generation: Async (non-blocking UI)
- Hybrid retrieval: Top-K filtering (limit: 5, threshold: 0.5)
- Storage: IndexedDB (no size limits for reasonable datasets)
- Token reduction goal: 50-70% fewer worldbook tokens

## Security Considerations

- Embeddings stored locally (no transmission)
- Worldbook entries validated on import
- Type-safe character/worldbook references
- XSS protection via Vue template escaping

## Development Notes

- Follows existing MemoryService patterns for consistency
- Reuses embedding infrastructure (cosineSimilarity, generateEmbedding)
- Non-blocking async operations for UI responsiveness
- Graceful degradation without embedding model

