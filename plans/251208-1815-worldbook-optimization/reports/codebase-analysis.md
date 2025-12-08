# Codebase Analysis Report

**Date:** 2025-12-08
**Project:** Mianix Userscript - Roleplay AI Character System
**Analysis Focus:** Worldbook/Lorebook System Architecture

## Tech Stack

- **Frontend:** Vue 3 (Composition API, `<script setup>`), TypeScript
- **UI Framework:** PrimeVue 4.3.5, Tailwind CSS 4.1
- **State Management:** Pinia, SignalDB (reactive collections)
- **Storage:** IndexedDB (via SignalDB adapter), GM storage (for persistence)
- **Build:** Vite 6, vite-plugin-monkey (userscript bundler)

## Current Architecture

### Data Models

**CharacterCard** (`src/db/index.ts:90-130`)
```typescript
export class CharacterCard {
  id: string;
  data: Partial<CharacterCardData>;        // Original data
  dataTranslated?: Partial<CharacterCardData>; // Translated version
  isUseTranslated: boolean;

  getData() {
    if (this.isUseTranslated) {
      this.data = mergeObjects(this.data, this.dataTranslated || {});
    }
  }
}
```

**WorldBookEntry** (`src/types/character.d.ts:7-26`)
```typescript
export interface WorldBookEntry {
  keys: string[];        // Activation keywords
  content: string;       // Lore content
  comment?: string;      // Title/description
  enabled?: boolean;

  // Position control
  position?: 'before_char' | 'after_char' | 'before_input' | 'after_input';
  insertionOrder?: number;

  // Advanced logic
  selective?: boolean;   // Activate only if keys match context
  constant?: boolean;    // Always inject if enabled
  useRegex?: boolean;    // Treat keys as regex patterns

  // SillyTavern compatibility
  depth?: number;
  secondaryKeys?: string[];
}
```

**CharacterCardData** (`src/types/character.d.ts:32-54`)
```typescript
export interface CharacterCardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  messageExamples: string;
  alternateGreetings: string[];

  creatorNotes?: string;
  tags?: string[];
  creator?: string;

  worldBook: WorldBookEntry[]; // ← Array of lore entries
}
```

### Current Worldbook Handling

**Prompt Injection Logic** (`src/utils/prompt-utils.ts:42-137`)

1. **Filtering:** `getRelevantWorldBookEntries()` filters entries based on:
   - `constant && enabled` → Always include
   - `selective === false` → Skip
   - Keyword matching: `entry.keys.some(key => contextText.includes(key.toLowerCase()))`

2. **Position-based Grouping:**
   - `before_char`, `after_char`, `before_input`, `after_input`
   - Sorted by `insertionOrder`

3. **Injection:** All matched entries injected into prompt as XML tags:
   ```xml
   <world_information tag="entry_comment">
   entry_content
   </world_information>
   ```

**Problem:** ALL matching entries injected → high token usage.

### Existing RAG System

**Memory Service** (`src/services/memory-service.ts`)

- **Storage:** `Memories` collection (IndexedDB via SignalDB)
- **Data Model:**
  ```typescript
  MemoryEntryType {
    id, characterId, content, type, tags,
    importance: number,      // 0-1
    embedding: number[],     // Vector
    relatedMessageId?: string,
    createdAt, lastAccessed
  }
  ```

- **Workflow:**
  1. Extract memories from chat → LLM extraction model
  2. Generate embeddings → Embedding model
  3. Store in IndexedDB
  4. Retrieve via cosine similarity (threshold > 0.5)

- **Integration:** Already injected into prompts (`buildFinalPrompt()` line 153-158)

### UI Patterns

**Current Edit Flow** (`src/components/character_cards/Translate.vue`)

- **Use Case:** Edit character data + worldbook entries
- **Structure:**
  - Accordion with tabs: "General Info" | "Translate"
  - Select dropdown to choose property
  - Side-by-side textarea: Original | Translated
  - Flattened keys for array items: `alternateGreetings|0`, `alternateGreetings|1`

**Screens System** (`src/constants.ts`)
```typescript
SCREENS = {
  PROFILE_LIST, CHARACTER_LIST,
  CHARACTER_TRANSLATE, CHAT,
  MODELS_LIST, PRESETS_CONFIG
}
```

**Navigation:** `useScreenStore().setScreen(SCREEN_NAME, payload)`

## Key Findings

### Strengths
1. ✅ Clean separation: Original vs. Translated data
2. ✅ Flexible positioning system for worldbook entries
3. ✅ RAG already implemented with embedding + cosine similarity
4. ✅ Reactive data layer (SignalDB)
5. ✅ PrimeVue provides DataTable, Sidebar, Chips out-of-box

### Current Limitations
1. ❌ **No selective injection:** All matching entries injected (token waste)
2. ❌ **No worldbook RAG:** Worldbook not vectorized for semantic search
3. ❌ **No dedicated UI:** Worldbook editing buried in Translate.vue
4. ❌ **No reusability:** Each character has isolated worldbook (no global entries)
5. ❌ **No bulk operations:** Edit one entry at a time

### Opportunities
1. 🎯 Extend RAG system to worldbook entries
2. 🎯 Add hybrid search: keyword + semantic similarity
3. 🎯 Create dedicated worldbook manager screen
4. 🎯 Global worldbook collection for reuse
5. 🎯 Token budget system with priority scoring

## Architecture Constraints

- **No backend:** Pure client-side (userscript)
- **Storage limits:** IndexedDB capacity (~50MB typical, browser-dependent)
- **Performance:** Must run in browser environment
- **Compatibility:** Must support SillyTavern character card format

## Recommendations

1. **Extend MemoryService** → WorldbookService (reuse embedding logic)
2. **Add WorldbookEntry to RAG pipeline**
3. **New screen:** `WORLDBOOK_EDITOR` with DataTable + Sidebar
4. **Global + Character-specific collections** (hierarchy model)
5. **Hybrid retrieval:** Keyword filter → Semantic ranking → Top-K selection
