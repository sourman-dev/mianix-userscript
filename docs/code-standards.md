# Code Standards & Best Practices

**Last Updated:** 2025-12-09
**Version:** Phase 04 (Global worldbooks)
**Scope:** Vue 3 + TypeScript + Vite codebase

## Quick Reference

- **Language:** TypeScript 5+ (strict mode)
- **Framework:** Vue 3 with Composition API (`<script setup>`)
- **State Management:** Pinia
- **Styling:** Tailwind CSS
- **Build:** Vite
- **Database:** IndexedDB (via dexie)

## Project Structure Standards

```
src/
├── components/           # Vue 3 SFC components
│   ├── [feature]/        # Feature-specific components
│   │   ├── Index.vue     # Primary component
│   │   └── *.vue         # Child/supporting components
│   └── ...
├── services/             # Business logic & API calls
│   ├── [service]-service.ts
│   └── index.ts          # Barrel export
├── stores/               # Pinia state stores
│   ├── [store].ts        # One store per file
│   └── ...
├── types/                # TypeScript type definitions
│   └── character.d.ts    # Main type definitions
├── utils/                # Utility functions
│   ├── [utility]-utils.ts
│   └── ...
├── constants.ts          # App-wide constants
└── main.ts               # Entry point
```

## Naming Conventions

### Files & Directories
| Type | Pattern | Example |
|------|---------|---------|
| Vue Components | PascalCase.vue | `ChatScreen.vue`, `WorldbookEditor.vue` |
| Services | camelCase-service.ts | `memory-service.ts`, `worldbook-service.ts` |
| Stores | camelCase.ts | `screen.ts`, `worldbook.ts` |
| Utils | camelCase-utils.ts | `prompt-utils.ts`, `memory-cleanup.ts` |
| Types | camelCase.d.ts | `character.d.ts` |
| Directories | kebab-case | `character_cards`, `chat_screen`, `worldbook` |

### Variables & Functions
| Type | Pattern | Example |
|------|---------|---------|
| Constants | UPPER_SNAKE_CASE | `CHAT_SCREEN = 'CHAT'` |
| Variables | camelCase | `characterId`, `embeddingProgress` |
| Functions | camelCase | `buildFinalPrompt()`, `generateEmbedding()` |
| Classes | PascalCase | `WorldbookService`, `MemoryService` |
| Interfaces | PascalCase | `Character`, `WorldBookEntry` |
| Type Aliases | PascalCase | `EmbeddingModel`, `ScreenMode` |

### Vue Components
| Type | Pattern | Example |
|------|---------|---------|
| Prop | camelCase | `characterId`, `onSave` |
| Emit | kebab-case (template) | `@submit`, `@delete` |
| Ref | camelCase + Ref suffix | `formDataRef`, `tableRef` |
| Computed | camelCase | `isLoading`, `hasEmbeddings` |

## TypeScript Standards

### Type Safety

#### Strict Mode (Required)
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true
  }
}
```

#### Type Annotations
```typescript
// GOOD: Explicit types
function buildFinalPrompt(characterId: string, message: string): string {
  // ...
}

// AVOID: Implicit any
function buildFinalPrompt(characterId, message) {
  // ...
}

// AVOID: Over-broad union
function getEntry(id: string | number): WorldBookEntry | undefined {
  // Consider splitting into separate functions
}
```

#### Interface vs Type Alias
```typescript
// PREFER: Interfaces for object shapes (extensible)
interface Character {
  id: string;
  name: string;
  worldBook?: WorldBook;
}

// ALLOW: Type aliases for unions, primitives
type ScreenMode = 'CHAT' | 'CHARACTER_EDITOR' | 'WORLDBOOK_EDITOR';
type Embedding = number[];
```

#### Optional Fields
```typescript
// GOOD: Use optional chain
const embedding = entry.embedding?.slice(0, 10);

// GOOD: Null check in conditionals
if (entry.embedding) {
  const similarity = cosineSimilarity(query, entry.embedding);
}

// AVOID: Force cast with !
const sim = cosineSimilarity(query, entry.embedding!);
```

### Error Handling

#### Service Layer
```typescript
// GOOD: Explicit error handling
async function embedAllEntries(characterId: string): Promise<number> {
  try {
    const character = await getCharacter(characterId);
    if (!character?.worldBook) {
      console.warn(`No worldbook for character ${characterId}`);
      return 0; // Graceful fallback
    }
    // Process entries...
    return count;
  } catch (error) {
    console.error('Embedding failed:', error instanceof Error ? error.message : 'Unknown error');
    return 0; // Graceful degradation
  }
}

// AVOID: Silent failures
async function embedAllEntries(characterId: string): Promise<number> {
  const character = await getCharacter(characterId);
  // No error handling - may crash silently
}
```

#### UI Components
```typescript
// GOOD: Validation before action
const handleSubmit = async () => {
  if (!formData.key?.trim()) {
    errorMessage.value = 'Key is required';
    return;
  }

  try {
    await worldbookStore.updateEntry(currentIndex.value, formData);
  } catch (error) {
    errorMessage.value = 'Failed to save entry';
    console.error(error);
  }
};

// AVOID: Unhandled rejections
const handleSubmit = async () => {
  await worldbookStore.updateEntry(currentIndex.value, formData);
  // What if it fails? No error handling
};
```

## Vue 3 Standards

### Script Setup Pattern (Preferred)
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWorldbookStore } from '@/stores/worldbook';
import type { WorldBookEntry } from '@/types/character';

// Type props explicitly
interface Props {
  characterId: string;
  onSave?: (entry: WorldBookEntry) => void;
}

const props = withDefaults(defineProps<Props>(), {
  onSave: undefined,
});

// Emit with explicit types
const emit = defineEmits<{
  save: [entry: WorldBookEntry];
  delete: [id: string];
}>();

// Reactive state
const formData = ref<WorldBookEntry>({
  key: '',
  keys: [],
  content: '',
});

// Computed properties
const isValid = computed(() => formData.value.key?.trim().length > 0);

// Methods
const handleSubmit = async () => {
  if (!isValid.value) return;
  emit('save', formData.value);
};
</script>

<template>
  <div class="form-container">
    <!-- Template content -->
  </div>
</template>
```

### Reactive State Management

#### Use Refs for Simple Values
```typescript
// GOOD: Simple reactive state
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const selectedEntryIndex = ref(-1);

// Access and update
isLoading.value = true;
errorMessage.value = 'Failed to load';
```

#### Use Computed for Derived Values
```typescript
// GOOD: Derived reactive values
const hasEmbeddings = computed(() =>
  worldbookStore.entries.some(e => !!e.embedding)
);

const embeddedCount = computed(() =>
  worldbookStore.entries.filter(e => !!e.embedding).length
);

// AVOID: Redundant state
const isLoaded = ref(false); // Redundant with isLoading
const totalEntries = ref(0); // Redundant with entries.length
```

#### Use Stores for Cross-Component State
```typescript
// GOOD: Shared state via Pinia
const worldbookStore = useWorldbookStore();

// Access shared state
const entries = computed(() => worldbookStore.entries);

// Trigger actions
await worldbookStore.embedAllEntries();

// AVOID: Prop drilling
// Props passed through many levels
<WorldbookEditor :entries="entries" :onUpdate="onUpdate" :onDelete="onDelete" ... />
```

### Template Standards

#### Conditional Rendering
```vue
<!-- GOOD: Use v-if/v-else for complex conditions -->
<div v-if="isLoading" class="spinner">Loading...</div>
<div v-else-if="hasError" class="error">{{ errorMessage }}</div>
<div v-else class="content">{{ data }}</div>

<!-- GOOD: Use v-show for simple toggles (performance) -->
<button v-show="!isEmbedding" @click="embedAll">Embed All</button>

<!-- AVOID: Complex ternary in templates -->
<div>{{ isLoading ? 'Loading...' : hasError ? 'Error: ' + error : data }}</div>
```

#### List Rendering
```vue
<!-- GOOD: Unique key for v-for -->
<tr v-for="entry in entries" :key="entry.id" @click="selectEntry(entry)">
  <td>{{ entry.key }}</td>
  <td>{{ entry.content }}</td>
</tr>

<!-- GOOD: Computed filtered list -->
<tr v-for="entry in filteredEntries" :key="entry.id">
  <!-- ... -->
</tr>

<!-- AVOID: No key (can cause bugs with reordering) -->
<tr v-for="entry in entries">
  <!-- ... -->
</tr>

<!-- AVOID: Index as key (breaks with filtering) -->
<tr v-for="(entry, index) in entries" :key="index">
  <!-- ... -->
</tr>
```

#### Event Handling
```vue
<!-- GOOD: Methods for complex logic -->
<button @click="handleDelete(entry.id)">Delete</button>

<!-- GOOD: Prevent default when needed -->
<form @submit.prevent="handleSubmit">
  <!-- ... -->
</form>

<!-- GOOD: Stop propagation for nested handlers -->
<div @click="selectEntry">
  <button @click.stop="deleteEntry">Delete</button>
</div>

<!-- AVOID: Inline complex logic -->
<button @click="entries.splice(index, 1); isSaving = true; saveAsync();">
  Delete
</button>
```

## Pinia Store Standards

### Store Structure
```typescript
// GOOD: Modular, focused store
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WorldBookEntry } from '@/types/character';

export const useWorldbookStore = defineStore('worldbook', () => {
  // State
  const currentCharacterId = ref<string>('');
  const entries = ref<WorldBookEntry[]>([]);
  const embeddingProgress = ref({ current: 0, total: 0 });

  // Computed
  const hasEmbeddings = computed(() =>
    entries.value.some(e => !!e.embedding)
  );

  // Actions
  const loadEntries = async (characterId: string) => {
    currentCharacterId.value = characterId;
    const character = await getCharacter(characterId);
    entries.value = character?.worldBook?.entries ?? [];
  };

  const addEntry = () => {
    entries.value.push({
      key: '',
      keys: [],
      content: '',
    });
  };

  // Return public API
  return {
    currentCharacterId,
    entries,
    embeddingProgress,
    hasEmbeddings,
    loadEntries,
    addEntry,
  };
});
```

### Anti-Patterns (Avoid)

#### Dynamic Import Fallback (Race Condition)
```typescript
// AVOID: Race condition with dynamic import
let Service = { /* placeholder */ };
import('@/services/some-service')
  .then(m => { Service = m.default; })
  .catch(() => console.warn('Not yet available'));

// Later, store methods may call Service before import completes
export const useMyStore = defineStore('my', () => {
  const doSomething = async () => {
    await Service.doWork(); // Might fail if not loaded yet!
  };
});

// FIX: Use direct import (if service is already created)
import { Service } from '@/services/some-service';
```

#### Missing Input Validation
```typescript
// AVOID: No validation in actions
export const useWorldbookStore = defineStore('worldbook', () => {
  const addEntry = () => {
    entries.value.push({
      key: '',              // What if empty?
      keys: [],             // What if undefined?
      content: '',          // What if null?
    });
  };

  const updateEntry = async (index: number, data: WorldBookEntry) => {
    entries.value[index] = data; // No validation, no error check
  };
});

// GOOD: Validate before mutation
export const useWorldbookStore = defineStore('worldbook', () => {
  const addEntry = () => {
    const entry: WorldBookEntry = {
      key: '',
      keys: [],
      content: '',
    };
    entries.value.push(entry);
  };

  const updateEntry = async (index: number, data: WorldBookEntry) => {
    if (index < 0 || index >= entries.value.length) {
      console.error(`Invalid index ${index}`);
      return false;
    }

    if (!data.key?.trim()) {
      console.error('Key is required');
      return false;
    }

    entries.value[index] = data;
    return true;
  };
});
```

## Service Layer Standards

### Service Pattern (Singleton)
```typescript
// GOOD: Singleton service with methods
export class WorldbookService {
  static hasEmbeddingModel(): boolean {
    // Check if embedding model configured
    return !!getEmbeddingConfig();
  }

  static async embedAllEntries(
    characterId: string,
    callback?: (current: number, total: number) => void
  ): Promise<number> {
    try {
      const character = await getCharacter(characterId);
      if (!character?.worldBook) return 0;

      let count = 0;
      for (const entry of character.worldBook.entries) {
        const embedding = await this.generateEmbedding(entry);
        if (embedding) {
          entry.embedding = embedding;
          count++;
        }
        callback?.(count, character.worldBook.entries.length);
      }

      await saveCharacter(character);
      return count;
    } catch (error) {
      console.error('Embedding failed:', error);
      return 0; // Graceful fallback
    }
  }

  private static async generateEmbedding(entry: WorldBookEntry): Promise<number[] | null> {
    try {
      const text = `${entry.key} ${entry.keys.join(' ')} ${entry.content}`;
      return await MemoryService.generateEmbedding(text);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return null;
    }
  }
}

// Export barrel
export { WorldbookService } from './worldbook-service';
```

### Graceful Degradation
```typescript
// GOOD: Fallback when feature unavailable
async function retrieveRelevantEntries(
  characterId: string,
  query: string,
  limit: number = 5
): Promise<WorldBookEntry[]> {
  try {
    if (!this.hasEmbeddingModel()) {
      // Fallback: keyword-only search
      return this.keywordSearch(characterId, query, limit);
    }

    const queryEmbedding = await MemoryService.generateEmbedding(query);
    const character = await getCharacter(characterId);

    if (!character?.worldBook) return [];

    // Semantic ranking
    const ranked = character.worldBook.entries
      .filter(e => !!e.embedding)
      .map(e => ({
        entry: e,
        similarity: MemoryService.cosineSimilarity(
          queryEmbedding,
          e.embedding!
        ),
      }))
      .filter(r => r.similarity >= THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.entry);

    return ranked;
  } catch (error) {
    console.error('Retrieval failed:', error);
    return []; // Empty fallback
  }
}
```

## Constants Standards

### Organization
```typescript
// src/constants.ts

// Screen modes (used in stores/screen.ts)
export const SCREEN_MODES = {
  CHAT: 'CHAT',
  CHARACTER_EDITOR: 'CHARACTER_EDITOR',
  WORLDBOOK_EDITOR: 'WORLDBOOK_EDITOR',
} as const;

export type ScreenMode = typeof SCREEN_MODES[keyof typeof SCREEN_MODES];

// Thresholds for semantic search
export const SEMANTIC_SEARCH = {
  SIMILARITY_THRESHOLD: 0.5,
  DEFAULT_LIMIT: 5,
} as const;

// UI limits
export const LIMITS = {
  WORLDBOOK_KEY_MAX: 50,
  WORLDBOOK_CONTENT_MAX: 2000,
  KEYWORDS_MAX_COUNT: 20,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  EMBED: '/api/embed',
} as const;
```

## Testing Standards

### Unit Tests for Services
```typescript
// GOOD: Test service methods
describe('WorldbookService', () => {
  it('should return 0 embeddings when no embedding model', async () => {
    vi.spyOn(WorldbookService, 'hasEmbeddingModel').mockReturnValue(false);
    const count = await WorldbookService.embedAllEntries('char-1');
    expect(count).toBe(0);
  });

  it('should gracefully handle missing worldbook', async () => {
    vi.spyOn(getCharacter).mockResolvedValue({ id: 'char-1' }); // No worldBook
    const count = await WorldbookService.embedAllEntries('char-1');
    expect(count).toBe(0);
  });

  it('should embed entries and save progress', async () => {
    const callback = vi.fn();
    const count = await WorldbookService.embedAllEntries('char-1', callback);
    expect(callback).toHaveBeenCalled();
    expect(count).toBeGreaterThan(0);
  });
});
```

### Component Testing
```typescript
// GOOD: Test component behavior
describe('WorldbookEntryForm', () => {
  it('should emit save event with valid data', async () => {
    const wrapper = mount(WorldbookEntryForm);
    await wrapper.vm.formData.key = 'test-key';
    await wrapper.vm.formData.content = 'test content';

    await wrapper.vm.handleSubmit();

    expect(wrapper.emitted('save')).toBeTruthy();
  });

  it('should prevent submit if key is empty', async () => {
    const wrapper = mount(WorldbookEntryForm);
    await wrapper.vm.handleSubmit();

    expect(wrapper.vm.errorMessage).toBe('Key is required');
    expect(wrapper.emitted('save')).toBeFalsy();
  });
});
```

## Security Standards

### Input Validation
- ✅ Always validate user input before processing
- ✅ Use type guards for dynamic data
- ✅ Sanitize strings before template interpolation (Vue does this automatically)

### Data Protection
- ✅ Store sensitive data in IndexedDB only (local)
- ✅ Never log embeddings or API keys
- ✅ Use optional chaining to prevent null reference errors

### Type Safety
- ✅ Use strict TypeScript mode
- ✅ Avoid `any` types
- ✅ Use exhaustive type guards for unions

## Performance Standards

### Reactive State
- ✅ Use `computed` for derived values (cached)
- ✅ Use `ref` for simple mutable state
- ✅ Use stores for cross-component state (avoid prop drilling)

### Async Operations
- ✅ Use async/await (more readable than promises)
- ✅ Use try/catch for error handling
- ✅ Non-blocking operations (embedding generation)

### Bundle Size
- ✅ Lazy load heavy components (future optimization)
- ✅ Tree-shake unused exports (via barrel exports)
- ✅ Minimize inline styles (use Tailwind classes)

## Documentation Standards

### Code Comments
```typescript
// GOOD: Explain WHY, not WHAT
// Threshold of 0.5 aligns with existing memory retrieval to maintain consistency
const SIMILARITY_THRESHOLD = 0.5;

// AVOID: State the obvious
// Create a number variable
const count = 0;

// GOOD: Document complex logic
/**
 * Hybrid retrieval: keyword filtering + semantic ranking
 * @param characterId - Character with worldbook
 * @param query - User's input query
 * @param limit - Max results to return (default: 5)
 * @returns Top-K relevant entries sorted by similarity
 * @throws Will return empty array if retrieval fails
 */
async function retrieveRelevantEntries(
  characterId: string,
  query: string,
  limit: number = 5
): Promise<WorldBookEntry[]>
```

### JSDoc for Services
```typescript
/**
 * WorldbookService: RAG for semantic retrieval of worldbook entries
 *
 * Features:
 * - Lazy embedding generation (non-blocking)
 * - Graceful fallback without embedding model
 * - Threshold: 0.5 cosine similarity
 *
 * Usage:
 * ```
 * if (WorldbookService.hasEmbeddingModel()) {
 *   const entries = await WorldbookService.retrieveRelevantEntries(charId, query);
 * }
 * ```
 */
export class WorldbookService { ... }
```

## Code Review Checklist

Before submitting code:
- [ ] Type annotations on all functions
- [ ] Error handling with try/catch or graceful fallback
- [ ] No `any` types (unless unavoidable with third-party libs)
- [ ] Props explicitly typed with `withDefaults` in Vue
- [ ] Store actions validate inputs
- [ ] Comments explain WHY, not WHAT
- [ ] Tests for critical paths
- [ ] No console.error for expected failures (use console.warn)
- [ ] No hardcoded values (use constants)
- [ ] Consistent naming (camelCase, PascalCase, UPPER_SNAKE_CASE)
- [ ] No commented-out code (delete or document intent)

## Phase 04 Additions (Global Worldbooks)

### New Store Pattern (globalWorldbookStore)
```typescript
// Pattern: CRUD operations with automatic persistence
export const useGlobalWorldbookStore = defineStore('globalWorldbook', () => {
  // State: array of objects, selected ID, computed selected item
  const worldbooks = ref<GlobalWorldbookType[]>([]);
  const selectedId = ref<string | null>(null);

  // Computed: derived selected item
  const selectedWorldbook = computed(() =>
    worldbooks.value.find(w => w.id === selectedId.value) || null
  );

  // Actions: all persist to DB + reload all
  function create(name: string, description?: string): string {
    const id = crypto.randomUUID();
    db.GlobalWorldbooks.insert({ id, name, description, ... });
    loadAll();  // Important: reload after mutation
    return id;
  }
});
```

### Cleanup on Deletion Pattern (Phase 04)
```typescript
// When deleting global worldbook, cleanup orphaned character links
function remove(id: string) {
  const characters = db.CharacterCards.find().fetch();
  characters.forEach((char: any) => {
    if (char.linkedGlobalWorldbooks?.includes(id)) {
      const updated = char.linkedGlobalWorldbooks.filter((wbId: string) => wbId !== id);
      db.CharacterCards.updateOne(
        { id: char.id },
        { $set: { linkedGlobalWorldbooks: updated } }
      );
    }
  });
  db.GlobalWorldbooks.removeOne({ id });
  loadAll();
}
```

## Known Issues & TODOs

### Phase 01-02 Issues (Needs Fixes)
See: [Code Review Report](../plans/251208-1815-worldbook-optimization/reports/code-reviewer-251208-worldbook-phase01-phase02.md)

1. **Store import anti-pattern** - Replace with direct import
2. **Missing input validation** - Add checks in addEntry/updateEntry
3. **Error handling gaps** - Improve UI error messages
4. **Type safety** - Add exhaustive type guards

### Phase 04 Notes
- Global worldbooks share WorldBookEntry interface with character worldbooks
- Cleanup on deletion works but silent (consider warning user)
- No import/export for global worldbooks yet (future Phase)

### Future Improvements
- [ ] Implement embedding cache (performance)
- [ ] Add memory retrieval caching (performance)
- [ ] Batch embedding generation for imports (UX)
- [ ] Service worker for background tasks (future)
- [ ] Encryption at rest (security, future)
- [ ] Global worldbook import/export (Phase 04+)
- [ ] Versioning for global worldbooks

## Related Documents

- [System Architecture](./system-architecture.md)
- [Codebase Summary](./codebase-summary.md)
- [Project Overview PDR](./project-overview-pdr.md)

