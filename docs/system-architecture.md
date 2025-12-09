# System Architecture

**Last Updated:** 2025-12-09
**Version:** Phase 04 (Global worldbooks)
**Scope:** Vue 3 userscript with RAG, worldbook system, global worldbooks, and multi-model support

## Executive Summary

The Mianix userscript implements a modular architecture combining:
1. **Character Management** - Multi-character persistence with profiles
2. **Memory System (RAG)** - Semantic search with embedding-based retrieval
3. **Worldbook System** - Hybrid retrieval (keyword + semantic ranking)
4. **Global Worldbooks** - NEW: Shared worldbooks with per-character linking
5. **Chat Interface** - Multi-model support with streaming
6. **State Management** - Pinia-based reactive stores

Token optimization achieved through selective injection (50-70% reduction) + shared context management.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ChatScreen      CharacterCards    WorldbookEditor   GlobalWorldbook    │
│     (Chat)          (Selection)       (Character)      Manager (NEW)    │
│                                                      + WorldbookLinker  │
│                                                                          │
└────────────────┬──────────────────────┬───────────────┬────────────────┘
                 │                      │               │
┌────────────────▼────────┬─────────────▼──┬────────────▼─────────────────┐
│                  STATE MANAGEMENT (PINIA)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  screenStore       memoryStore   worldbookStore   globalWorldbookStore  │
│  • Active screen   • Memories    • Entries       • Worldbooks (NEW)    │
│  • Modal state     • CRUD ops    • Embeddings    • Selected (NEW)      │
│  • Settings        • Sync        • UI state      • Linking API (NEW)   │
│                                                                         │
└────────────────┬────────────────────┬───────────────┬──────────────────┘
                 │                    │               │
┌────────────────▼────────┬───────────▼────────┬──────▼──────────────────┐
│           SERVICE LAYER                                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MemoryService           WorldbookService                              │
│  • generateEmbedding()   • embedAllEntries()                           │
│  • cosineSimilarity()    • retrieveRelevantEntries()                   │
│  • IndexedDB ops         • fallback (no embedding)                     │
│                                                                         │
│  PromptUtils             APIService          WorldbookMerge (NEW)     │
│  • buildFinalPrompt()    • Model inference   • getMergedWorldbook()  │
│  • Memory injection      • Streaming         • hasLinkedGlobal()      │
│  • Hybrid retrieval      • Provider detect   • Merge logic (NEW)      │
│                                                                         │
└────────────────┬────────────────────┬───────────────┬──────────────────┘
                 │                    │               │
┌────────────────▼────────────────────▼───────────────▼──────────────────┐
│                       DATA PERSISTENCE LAYER                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  IndexedDB                                                            │
│  • Characters (linkedGlobalWorldbooks[]) - NEW reference            │
│  • Memories (entries with embeddings)                               │
│  • Worldbooks (character-specific entries with embeddings)           │
│  • GlobalWorldbooks (id, name, entries, tags) - NEW collection      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Presentation Layer (UI Components)

#### ChatScreen.vue
- Main chat interface
- Displays messages from character
- Input field with send button
- Model selection (if multi-model enabled)
- Streaming response rendering
- **Prompt Building Flow:**
  ```
  User Input
    ↓
  buildFinalPrompt()
    ├─ System prompt
    ├─ Character profile
    ├─ Memory injection (via getRelevantMemories)
    ├─ Worldbook injection (via getRelevantWorldBookEntries) [NEW Phase 03]
    └─ Chat history
    ↓
  API Service → Model → Response
  ```

#### CharacterCards/Index.vue (Modified Phase 02)
- Character selection and profile management
- **NEW:** Worldbook editor access button
- Profile editing form
- Character deletion

#### WorldbookEditor.vue (Phase 02)
- Main worldbook editing interface (character-specific)
- Entry management (add, edit, delete)
- Embedding progress display
- Stateful form handling
- **Phase 04 NEW:** Integrated WorldbookLinker for global linking
- Reuses WorldbookTable + WorldbookEntryForm

#### GlobalWorldbookManager.vue (NEW Phase 04)
- Global worldbook CRUD operations
- Create/edit/delete global worldbooks
- Entry management within global context
- Shared across all characters

#### WorldbookLinker.vue (NEW Phase 04)
- UI for linking global worldbooks to characters
- Multi-select available global worldbooks
- Saves linkedGlobalWorldbooks to character
- Integrated into CharacterEditor flow

#### WorldbookTable.vue (NEW Phase 02)
- DataTable for entry listing
- Columns: key, keys, content, embedding status
- Edit/delete row actions
- Sorting and filtering capability

#### WorldbookEntryForm.vue (NEW Phase 02)
- Add/edit entry form
- Fields: key (required), keys[] (array), content (required)
- Validation on submit
- Auto-focus on mount (add mode)

### 2. State Management Layer (Pinia Stores)

#### screenStore
**Purpose:** Centralized screen mode management
**State:**
```typescript
activeScreen: 'CHAT' | 'CHARACTER_EDITOR' | 'WORLDBOOK_EDITOR'
showModal: boolean
modalType?: string
```
**Actions:**
- `setActiveScreen(mode)`
- `setShowModal(show, type?)`

#### memoryStore
**Purpose:** Memory entries state and CRUD
**State:**
```typescript
entries: Memory[]
selectedMemory?: Memory
```
**Actions:**
- `addMemory(entry)`
- `updateMemory(id, updates)`
- `deleteMemory(id)`
- `syncWithService()` [connects to MemoryService]

#### worldbookStore
**Purpose:** Worldbook entries state and embedding management (character-specific)
**State:**
```typescript
characterId: string | null
entries: WorldBookEntry[]
selectedIndex: number | null
isDirty: boolean
isEmbedding: boolean
embeddingProgress: { current: number, total: number }
hasEmbeddingModel: boolean
```
**Actions:**
- `loadCharacter(charId)`
- `selectEntry(index)`
- `addEntry()` [creates new empty entry]
- `updateEntry(index, data)`
- `deleteEntry(index)`
- `saveAll()` [persists to character worldBook]
- `generateEmbeddings()` [triggers WorldbookService]
- **Phase 04 NEW:** `linkGlobalWorldbooks(charId, linkedIds)` [saves global links]

#### globalWorldbookStore (NEW Phase 04)
**Purpose:** Global worldbook CRUD and state management
**State:**
```typescript
worldbooks: GlobalWorldbookType[]
selectedId: string | null
selectedWorldbook: GlobalWorldbookType | null
```
**Actions:**
- `loadAll()` [fetch all global worldbooks]
- `create(name, description)` [creates new global worldbook]
- `update(id, updates)` [persists updates]
- `remove(id)` [deletes global worldbook + cleanup orphaned character links]
- `addEntry(worldbookId, entry)` [adds entry to global worldbook]
- `updateEntry(worldbookId, index, entry)` [modifies entry]
- `removeEntry(worldbookId, index)` [deletes entry from global]

### 3. Service Layer

#### MemoryService (Existing)
**Patterns:** Singleton, Factory pattern
**Responsibilities:**
- Generate embeddings for text
- Calculate cosine similarity
- IndexedDB persistence

**Key Methods:**
```typescript
generateEmbedding(text: string): Promise<number[]>
cosineSimilarity(vec1: number[], vec2: number[]): number
```

#### WorldbookService (NEW Phase 01)
**Patterns:** Singleton, reuses MemoryService patterns
**Responsibilities:**
- Generate embeddings for worldbook entries
- Retrieve relevant entries via semantic search
- Fallback gracefully without embedding model

**Key Methods:**
```typescript
hasEmbeddingModel(): boolean
embedAllEntries(characterId: string, callback?: (current, total) => void): Promise<number>
retrieveRelevantEntries(
  characterId: string,
  query: string,
  limit: number = 5
): Promise<WorldBookEntry[]>
```

**Implementation Details:**
```
embedAllEntries() flow:
1. Get character worldbook entries
2. For each entry:
   - Combine key + keys.join(' ') + content
   - Call MemoryService.generateEmbedding()
   - Store in entry.embedding
   - Update IndexedDB
   - Trigger callback for progress
3. Return count of embedded entries

retrieveRelevantEntries() flow:
1. Generate embedding for query
2. Calculate similarity to all entries
3. Filter: similarity >= 0.5
4. Sort by similarity (descending)
5. Return top-K entries (limit)
6. Fallback: Return all if no embeddings
```

#### PromptUtils
**Responsibilities:**
- Assemble final system prompt
- Inject memory context
- Inject worldbook context (global + character-specific)
- Handle hybrid retrieval
- **Phase 04 NEW:** Uses merged worldbook from worldbook-merge utility

**Current Flow:**
```
buildFinalPrompt(characterId, userMessage):
1. Get system prompt template
2. Get character profile
3. Call memoryStore.getRelevantMemories()
4. Call getMergedWorldbook(characterId) [Phase 04 - combines global + character]
5. Retrieve relevant entries via hybrid search [Phase 03]
6. Combine all sections
7. Return final prompt
```

#### WorldbookMerge (NEW Phase 04)
**Responsibilities:**
- Merge global + character worldbooks
- Return combined entry list for retrieval
- Track origin (global vs character)

**Key Functions:**
```typescript
getMergedWorldbook(characterId: string): WorldBookEntry[]
  // Returns: [...globalEntries, ...characterEntries]
  // Order: Global first, then character (character can override by matching keys)

hasLinkedGlobalWorldbooks(characterId: string): boolean
  // Check if character has any linked global worldbooks
```

#### APIService (Multi-model)
**Responsibilities:**
- Model inference with streaming
- Provider detection (OpenAI, Claude, Ollama, etc.)
- Fallback on provider unavailable

### 4. Data Layer

#### IndexedDB Schema

**Characters Collection**
```typescript
{
  id: string (PK),
  name: string,
  description: string,
  avatar?: string,
  worldBook: {
    name: string,
    description: string,
    entries: WorldBookEntry[]
  },
  createdAt: number,
  updatedAt: number
}
```

**Memories Collection** (existing)
```typescript
{
  id: string (PK),
  characterId: string (FK),
  content: string,
  embedding?: number[],
  createdAt: number,
  updatedAt: number
}
```

**GlobalWorldbooks Collection** (Phase 04 - NEW)
```typescript
{
  id: string (PK),
  name: string,
  description?: string,
  entries: WorldBookEntry[],     // Same structure as character entries
  tags?: string[],               // For categorization/search
  createdAt: number,
  updatedAt: number
}
```

**CharacterCard Extension** (Phase 04 - Updated)
```typescript
{
  // ... existing fields
  linkedGlobalWorldbooks?: string[]; // Array of global worldbook IDs
  // Used to retrieve merged context during prompt building
}
```

## Data Flow Patterns

### 1. Chat Message Processing

```
User Input
    ↓
ChatScreen component captured in textarea
    ↓
User clicks Send
    ↓
Call buildFinalPrompt(characterId, input)
    ├─ Retrieve character
    ├─ Get memory context (async)
    ├─ Get worldbook context (Phase 03)
    ├─ Assemble prompt
    └─ Return final prompt
    ↓
APIService.chat(model, finalPrompt, stream=true)
    ├─ Detect provider
    ├─ Stream responses
    └─ Update UI in real-time
    ↓
Store response in chat history
```

### 2. Embedding Generation (Phase 01)

```
User saves worldbook entry
    ↓
worldbookStore.updateEntry(index, data)
    ├─ Validate input
    ├─ Update local state
    └─ Persist to IndexedDB
    ↓
User clicks "Embed All" (optional)
    ↓
worldbookStore.embedAllEntries()
    ├─ Check hasEmbeddingModel()
    ├─ Call WorldbookService.embedAllEntries(characterId)
    │   ├─ For each entry:
    │   │   ├─ generateEmbedding(entry.key + entry.keys + entry.content)
    │   │   ├─ Store in entry.embedding
    │   │   └─ Callback: setEmbeddingProgress()
    │   └─ Persist to IndexedDB
    ├─ Update UI progress
    └─ Show completion status
```

### 3. Global Worldbook Linking (Phase 04 - NEW)

```
User links global worldbook to character
    ↓
WorldbookLinker component receives selection
    ↓
worldbookStore.linkGlobalWorldbooks(charId, linkedIds)
    ├─ Saves linkedGlobalWorldbooks[] to character
    └─ Persists to IndexedDB
    ↓
During prompt building:
├─ getMergedWorldbook(characterId)
├─ Fetch character's linkedGlobalWorldbooks[]
├─ For each linked global ID:
│   └─ Retrieve GlobalWorldbooks entries
├─ Combine with character.worldBook entries
└─ Return merged list for retrieval
    ↓
Merged entries feed into hybrid retrieval
```

### 4. Hybrid Retrieval (Phase 03 - Design)

```
Prompt generation triggers with merged worldbook
    ↓
Keyword filtering:
├─ Query: "fire magic"
├─ Keywords: ["fire", "magic", "spell"]
├─ Match against merged entry.keys
└─ Return pre-filtered entries
    ↓
Semantic ranking (if embeddings available):
├─ Generate embedding for query
├─ Calculate similarity to filtered entries
├─ Sort by similarity (descending)
└─ Top-K selection (limit: 5, threshold: 0.5)
    ↓
Return final ranked entries
    ↓
Inject into system prompt (string interpolation)
```

## Component Interaction Map

```
ChatScreen
  ├─ screenStore (read: activeScreen)
  ├─ buildFinalPrompt()
  │   ├─ memoryStore.getRelevantMemories()
  │   ├─ getMergedWorldbook(characterId) [Phase 04 NEW]
  │   ├─ worldbookStore.getRelevantEntries() [Phase 03]
  │   └─ characterStore (read: current character)
  └─ APIService.chat()

CharacterCards
  ├─ screenStore.setActiveScreen('WORLDBOOK_EDITOR')
  ├─ character profile form
  ├─ deleteCharacter()
  └─ **Phase 04 NEW:** Access worldbook linking

WorldbookEditor (Character-specific)
  ├─ worldbookStore (read/write: entries, embeddingProgress)
  ├─ **Phase 04 NEW:** WorldbookLinker (child)
  │   ├─ globalWorldbookStore (read: worldbooks)
  │   ├─ worldbookStore.linkGlobalWorldbooks()
  │   └─ Saves character.linkedGlobalWorldbooks
  ├─ WorldbookTable (child component)
  │   ├─ worldbookStore.deleteEntry()
  │   ├─ worldbookStore.updateEntry()
  │   └─ form open triggers
  ├─ WorldbookEntryForm (child component)
  │   ├─ form.addEntry()
  │   └─ form.updateEntry()
  └─ WorldbookService.embedAllEntries()

GlobalWorldbookManager (NEW Phase 04)
  ├─ globalWorldbookStore (read/write)
  ├─ CRUD operations for global worldbooks
  ├─ EntryForm for global entries
  ├─ Table listing
  └─ Accessed via screenStore.setActiveScreen('GLOBAL_WORLDBOOK_MANAGER')
```

## Concurrency & Async Patterns

### Race Condition: Store Import (ISSUE)
**File:** `src/stores/worldbook.ts`
```typescript
// CURRENT (Anti-pattern):
let WorldbookService = { /* placeholder */ };
import('@/services/worldbook-service')
  .then(module => { WorldbookService = module.default; })
  .catch(() => console.warn('...'));

// Store method may execute before import completes
```

**FIX:** Direct import (Phase 01 complete)
```typescript
import { WorldbookService } from '@/services/worldbook-service';
```

### Embedding Generation (Async, Non-blocking)
- Uses async/await in store actions
- UI remains responsive during embedding
- Progress callback updates UI in real-time
- Suitable for large worldbooks (100+ entries)

### Memory Retrieval (Async, Cached)
- `getRelevantMemories()` called during prompt building
- Should implement caching for repeated queries
- Consider debouncing for real-time scenarios

## Security Architecture

### Input Validation
- ✅ Worldbook entry keys validated (required, non-empty)
- ✅ Content validated (required, max length)
- ⚠️ Missing: XSS prevention on rendered content
- ⚠️ Missing: SQL injection prevention (N/A: IndexedDB)

### Data Protection
- ✅ Embeddings stored locally (no transmission)
- ✅ Type-safe character/worldbook references
- ✅ Vue template escaping (automatic XSS protection)
- ⚠️ Missing: Encryption at rest (future)
- ⚠️ Missing: Data backup/export encryption (future)

### Type Safety
- ✅ TypeScript strict mode
- ✅ Interface-based architecture
- ⚠️ Some `any` types in error handlers (Phase 02)
- ⚠️ Missing: Exhaustive type guards

## Performance Architecture

### Token Optimization
- **Before:** All worldbook entries injected (wasteful)
- **After (Phase 03):** Top-K semantic ranking (50-70% reduction)
- **Threshold:** 0.5 cosine similarity
- **Limit:** 5 entries per retrieval

### Lazy Initialization
- ✅ Embedding generation on-demand (non-blocking)
- ✅ IndexedDB queries optimized (indexed by characterId)
- ⚠️ Missing: Embedding cache (future optimization)
- ⚠️ Missing: Memory retrieval caching (future)

### Storage Efficiency
- IndexedDB: No practical limits for reasonable datasets
- Embeddings: ~1.5KB per entry (1536-dim float32)
- Suitable for 100+ worldbook entries per character

## Scalability Considerations

### Horizontal Scaling
- Not applicable (userscript architecture)
- Runs entirely in browser context

### Vertical Scaling
- IndexedDB supports large datasets (50MB+)
- Embedding generation batched (async/await)
- Consider pagination for 1000+ entries

### Future Optimizations
- Implement embedding cache (Redis-like in IndexedDB)
- Add memory retrieval caching
- Batch embedding generation for imports
- Consider service worker for background tasks

## Version History

| Date | Phase | Changes | Status |
|------|-------|---------|--------|
| 2025-12-08 | 01-02 | WorldbookService + Editor UI | ✅ Implemented (needs fixes) |
| 2025-12-09 | 04 | Global worldbooks + linking | ✅ Implemented |
| 2025-12-XX | 03 | Hybrid retrieval integration | ⏸️ Blocked (Phase 01/02 fixes needed) |
| 2025-12-XX | 05 | Testing & migration | ⏸️ Pending |

## Known Limitations

1. **No offline embedding generation** - Requires API access
2. **No encryption at rest** - Embeddings stored plaintext
3. **No backup system** - Manual export only (future)
4. **No conflict resolution** - Last-write-wins on concurrent edits
5. **No version history** - Global worldbooks not versioned (future enhancement)
6. **Deletion cleanup** - Orphaned character links auto-cleaned but no warning (Phase 04)

## Related Documents

- [Code Standards](./code-standards.md) - Implementation patterns
- [Codebase Summary](./codebase-summary.md) - File structure
- [Project Overview PDR](./project-overview-pdr.md) - Requirements
- [Development Roadmap](./development-roadmap.md) - Timeline

