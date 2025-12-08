# Phase 04: Global Worldbooks

**Parent:** [plan.md](./plan.md)
**Dependencies:** [Phase 02: Editor UI](./phase-02-editor-ui.md)
**Next:** [Phase 05: Testing + Migration](./phase-05-testing-migration.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-08 |
| Priority | P1 (Enhanced) |
| Status | Pending |
| Estimate | 3-4 hours |

Add global/shared worldbook collections that can be linked to multiple characters.

## Key Insights (from Research)

1. **Two-tier hierarchy** - Global worldbooks + character-specific entries
2. **Link mechanism** - Character references global worldbook by ID
3. **Merge logic** - Global entries injected first, character entries override
4. **Reuse patterns** - Follow existing SignalDB collection pattern

## Requirements

1. New `GlobalWorldbooks` collection in SignalDB
2. New `GlobalWorldbookType` interface
3. Add `linkedGlobalWorldbooks?: string[]` to CharacterCardType
4. Global worldbook manager UI (separate screen or tab)
5. Link selector in character worldbook editor
6. Merge logic in prompt-utils retrieval

## Architecture

### Data Model

```typescript
// New type
export type GlobalWorldbookType = {
  id: string;
  name: string;           // "Fantasy Races", "Modern Tech"
  description?: string;
  entries: WorldBookEntry[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
};

// Update CharacterCardType
export type CharacterCardType = {
  // ... existing fields
  linkedGlobalWorldbooks?: string[]; // IDs of global worldbooks to include
};
```

### Collection Setup

```typescript
const GlobalWorldbooks = new Collection<GlobalWorldbookType>({
  name: 'Global_Worldbooks',
  reactivity: vueReactivityAdapter,
  persistence: createMonkeyAdapter('Global_Worldbooks'),
  primaryKeyGenerator: () => crypto.randomUUID(),
});
```

### Merge Flow

```
Character Chat Request
        │
        ▼
┌───────────────────────────────────────────────┐
│ getMergedWorldbook(characterId)               │
│   1. Get character.linkedGlobalWorldbooks[]   │
│   2. Fetch GlobalWorldbooks by IDs            │
│   3. Flatten global entries                   │
│   4. Get character.data.worldBook[]           │
│   5. Merge: [...globalEntries, ...charEntries]│
└───────────────────────────────────────────────┘
        │
        ▼
getRelevantWorldBookEntries(mergedWorldbook, ...)
```

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/db/index.ts` | MODIFY | Add GlobalWorldbooks collection |
| `src/types/character.d.ts` | MODIFY | Add GlobalWorldbookType, update CharacterCardType |
| `src/utils/prompt-utils.ts` | MODIFY | Use merged worldbook |
| `src/stores/worldbook.ts` | MODIFY | Add global worldbook linking |
| `src/components/worldbook/GlobalWorldbookManager.vue` | CREATE | Management UI |
| `src/components/worldbook/WorldbookLinker.vue` | CREATE | Link selector |

## Implementation Steps

### Step 1: Add Types

File: `src/types/character.d.ts`

```typescript
/**
 * Global/shared worldbook that can be linked to multiple characters
 */
export interface GlobalWorldbookType {
  id: string;
  name: string;
  description?: string;
  entries: WorldBookEntry[];
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}
```

### Step 2: Add Collection

File: `src/db/index.ts`

```typescript
// Add import
import { GlobalWorldbookType } from '@/types/character';

// Add collection
const GlobalWorldbooks = new Collection<GlobalWorldbookType>({
  name: 'Global_Worldbooks',
  reactivity: vueReactivityAdapter,
  persistence: createMonkeyAdapter('Global_Worldbooks'),
  primaryKeyGenerator: () => crypto.randomUUID(),
});

// Update CharacterCardType
export type CharacterCardType = {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  createdAt: number;
  linkedGlobalWorldbooks?: string[];  // NEW
};

// Export in db object
export const db = {
  CharacterCards,
  LLMModels,
  Storage,
  DialogueMessages,
  Dialogues,
  UserProfiles,
  Memories,
  GlobalWorldbooks,  // NEW
};
```

### Step 3: Add Merge Utility

File: `src/utils/worldbook-merge.ts` (NEW)

```typescript
import { db, CharacterCard } from '@/db';
import type { WorldBookEntry, GlobalWorldbookType } from '@/types/character';

/**
 * Get merged worldbook entries from global + character-specific
 * Global entries come first, character entries can override by matching comment/keys
 */
export function getMergedWorldbook(characterId: string): WorldBookEntry[] {
  const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };

  if (!character) return [];

  // Get linked global worldbooks
  const linkedIds = character.linkedGlobalWorldbooks || [];
  const globalEntries: WorldBookEntry[] = [];

  for (const globalId of linkedIds) {
    const globalWb = db.GlobalWorldbooks.findOne({ id: globalId }) as GlobalWorldbookType | undefined;
    if (globalWb?.entries) {
      // Mark entries as from global (for UI display)
      const marked = globalWb.entries.map(e => ({
        ...e,
        _fromGlobal: globalWb.name,  // Internal marker, won't persist
      }));
      globalEntries.push(...marked);
    }
  }

  // Get character-specific entries
  const characterEntries = character.data?.worldBook || [];

  // Merge: global first, then character (character can override)
  return [...globalEntries, ...characterEntries];
}

/**
 * Check if a character has linked global worldbooks
 */
export function hasLinkedGlobalWorldbooks(characterId: string): boolean {
  const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };
  return (character?.linkedGlobalWorldbooks?.length || 0) > 0;
}
```

### Step 4: Update prompt-utils to Use Merged Worldbook

File: `src/utils/prompt-utils.ts`

```typescript
import { getMergedWorldbook } from './worldbook-merge';

export async function buildFinalPrompt(
  characterData: CharacterCard,
  // ... other params
): Promise<{ systemPrompt: string; userPrompt: string }> {

  // Use merged worldbook instead of character-only
  const mergedWorldBook = getMergedWorldbook(characterData.id);

  const relevantWorldBook = await getRelevantWorldBookEntries(
    mergedWorldBook,  // Changed from characterData.data.worldBook
    chatHistoryString,
    currentUserInput,
    {
      characterId: characterData.id,
      ...worldbookOptions,
    }
  );

  // ... rest unchanged
}
```

### Step 5: Create Global Worldbook Store

File: `src/stores/global-worldbook.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db } from '@/db';
import type { GlobalWorldbookType, WorldBookEntry } from '@/types/character';

export const useGlobalWorldbookStore = defineStore('globalWorldbook', () => {
  const worldbooks = ref<GlobalWorldbookType[]>([]);
  const selectedId = ref<string | null>(null);

  const selectedWorldbook = computed(() => {
    if (!selectedId.value) return null;
    return worldbooks.value.find(w => w.id === selectedId.value) || null;
  });

  function loadAll() {
    worldbooks.value = db.GlobalWorldbooks.find().fetch() as GlobalWorldbookType[];
  }

  function create(name: string, description?: string): string {
    const id = crypto.randomUUID();
    const now = Date.now();

    db.GlobalWorldbooks.insert({
      id,
      name,
      description,
      entries: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    });

    loadAll();
    return id;
  }

  function update(id: string, updates: Partial<GlobalWorldbookType>) {
    db.GlobalWorldbooks.updateOne(
      { id },
      { $set: { ...updates, updatedAt: Date.now() } }
    );
    loadAll();
  }

  function remove(id: string) {
    db.GlobalWorldbooks.removeOne({ id });
    loadAll();
  }

  function addEntry(worldbookId: string, entry: WorldBookEntry) {
    const wb = db.GlobalWorldbooks.findOne({ id: worldbookId }) as GlobalWorldbookType;
    if (!wb) return;

    const entries = [...wb.entries, entry];
    update(worldbookId, { entries });
  }

  function updateEntry(worldbookId: string, index: number, entry: WorldBookEntry) {
    const wb = db.GlobalWorldbooks.findOne({ id: worldbookId }) as GlobalWorldbookType;
    if (!wb?.entries[index]) return;

    const entries = [...wb.entries];
    entries[index] = entry;
    update(worldbookId, { entries });
  }

  function removeEntry(worldbookId: string, index: number) {
    const wb = db.GlobalWorldbooks.findOne({ id: worldbookId }) as GlobalWorldbookType;
    if (!wb?.entries[index]) return;

    const entries = wb.entries.filter((_, i) => i !== index);
    update(worldbookId, { entries });
  }

  return {
    worldbooks,
    selectedId,
    selectedWorldbook,
    loadAll,
    create,
    update,
    remove,
    addEntry,
    updateEntry,
    removeEntry,
  };
});
```

### Step 6: Create GlobalWorldbookManager Component

File: `src/components/worldbook/GlobalWorldbookManager.vue`

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useGlobalWorldbookStore } from '@/stores/global-worldbook';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';

const globalStore = useGlobalWorldbookStore();
const showCreateDialog = ref(false);
const newName = ref('');
const newDescription = ref('');

onMounted(() => {
  globalStore.loadAll();
});

function handleCreate() {
  if (!newName.value.trim()) return;

  globalStore.create(newName.value.trim(), newDescription.value.trim());
  newName.value = '';
  newDescription.value = '';
  showCreateDialog.value = false;
}

function handleDelete(id: string) {
  if (confirm('Delete this global worldbook? Characters will lose access to its entries.')) {
    globalStore.remove(id);
  }
}
</script>

<template>
  <div class="global-worldbook-manager p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Global Worldbooks</h2>
      <Button label="Create New" icon="pi pi-plus" @click="showCreateDialog = true" />
    </div>

    <DataTable :value="globalStore.worldbooks" class="text-sm">
      <Column field="name" header="Name" />
      <Column field="description" header="Description" />
      <Column header="Entries">
        <template #body="{ data }">
          {{ data.entries?.length || 0 }} entries
        </template>
      </Column>
      <Column header="Actions" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text size="small" @click="globalStore.selectedId = data.id" />
            <Button icon="pi pi-trash" text severity="danger" size="small" @click="handleDelete(data.id)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create Dialog -->
    <Dialog v-model:visible="showCreateDialog" header="Create Global Worldbook" modal style="width: 400px">
      <div class="flex flex-col gap-4">
        <div class="field">
          <label class="block text-sm font-medium mb-1">Name</label>
          <InputText v-model="newName" class="w-full" placeholder="e.g., Fantasy Races" />
        </div>
        <div class="field">
          <label class="block text-sm font-medium mb-1">Description</label>
          <InputText v-model="newDescription" class="w-full" placeholder="Optional description" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text @click="showCreateDialog = false" />
        <Button label="Create" @click="handleCreate" :disabled="!newName.trim()" />
      </template>
    </Dialog>
  </div>
</template>
```

### Step 7: Create WorldbookLinker Component

File: `src/components/worldbook/WorldbookLinker.vue`

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGlobalWorldbookStore } from '@/stores/global-worldbook';
import { db, CharacterCard } from '@/db';
import MultiSelect from 'primevue/multiselect';

const props = defineProps<{
  characterId: string;
}>();

const emit = defineEmits<{
  change: [linkedIds: string[]];
}>();

const globalStore = useGlobalWorldbookStore();

onMounted(() => {
  globalStore.loadAll();
});

const character = computed(() => {
  return db.CharacterCards.findOne({ id: props.characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };
});

const linkedIds = computed({
  get: () => character.value?.linkedGlobalWorldbooks || [],
  set: (value: string[]) => {
    db.CharacterCards.updateOne(
      { id: props.characterId },
      { $set: { linkedGlobalWorldbooks: value } }
    );
    emit('change', value);
  },
});

const options = computed(() => {
  return globalStore.worldbooks.map(wb => ({
    label: `${wb.name} (${wb.entries?.length || 0} entries)`,
    value: wb.id,
  }));
});
</script>

<template>
  <div class="worldbook-linker">
    <label class="block text-sm font-medium mb-1">Linked Global Worldbooks</label>
    <MultiSelect
      v-model="linkedIds"
      :options="options"
      optionLabel="label"
      optionValue="value"
      placeholder="Select global worldbooks"
      class="w-full"
      display="chip"
    />
    <small class="text-surface-400">Entries from linked worldbooks will be merged with character-specific entries</small>
  </div>
</template>
```

### Step 8: Add Linker to WorldbookEditor

File: `src/components/worldbook/WorldbookEditor.vue`

```vue
<script setup>
import WorldbookLinker from './WorldbookLinker.vue';
// ... existing imports
</script>

<template>
  <div class="worldbook-editor">
    <!-- Header -->
    <!-- ... existing header ... -->

    <!-- Add linker before table -->
    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
      <WorldbookLinker
        v-if="characterId"
        :character-id="characterId"
        @change="worldbookStore.loadCharacter(characterId)"
      />
    </div>

    <!-- Rest of component unchanged -->
  </div>
</template>
```

## Todo List

- [ ] Add `GlobalWorldbookType` interface
- [ ] Add `GlobalWorldbooks` collection to db/index.ts
- [ ] Add `linkedGlobalWorldbooks` to CharacterCardType
- [ ] Create `src/utils/worldbook-merge.ts`
- [ ] Update prompt-utils to use merged worldbook
- [ ] Create `src/stores/global-worldbook.ts`
- [ ] Create `GlobalWorldbookManager.vue`
- [ ] Create `WorldbookLinker.vue`
- [ ] Add linker to WorldbookEditor
- [ ] Add global worldbook screen/tab in navigation

## Success Criteria

1. User can create/edit/delete global worldbooks
2. User can link global worldbooks to characters
3. Linked entries appear in hybrid retrieval
4. Linked entries marked as "from global" in UI
5. Unlinking removes entries from retrieval
6. Character-specific entries can override global entries

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular references | Low | IDs are strings, no object refs |
| Large merged worldbooks | Medium | Hybrid retrieval limits results |
| Orphaned links | Low | Handle missing global gracefully |
| Migration complexity | Low | New field is optional |

## Security Considerations

- Global worldbooks stored client-side only
- No cross-user sharing (single-user app)
- Input sanitization for name/description

## Next Steps

After completing this phase:
1. Proceed to [Phase 05: Testing + Migration](./phase-05-testing-migration.md)
2. Consider import/export for global worldbooks
3. Add batch embedding for global worldbooks
