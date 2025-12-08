# Phase 02: Worldbook Editor UI

**Parent:** [plan.md](./plan.md)
**Dependencies:** None (can run parallel with Phase 01)
**Next:** [Phase 04: Global Worldbooks](./phase-04-global-worldbooks.md)

## Overview

| Field | Value |
|-------|-------|
| Date | 2025-12-08 |
| Priority | P0 (Core) |
| Status | ✅ Completed (Needs High Priority Fixes) |
| Estimate | 4-5 hours |
| Review | [Code Review Report](./reports/code-reviewer-251208-worldbook-phase01-phase02.md) |

Create dedicated worldbook editor screen with DataTable list view + Sidebar detail editor.

## Key Insights (from Research)

1. **List + Side-panel pattern** - Better than modal for long forms (Researcher 02)
2. **Chips for keywords** - Superior UX vs. comma-separated text input
3. **Responsive design** - Mobile drawer overlay, desktop side-panel
4. **Character count** - Critical UX for content fields (2000 char limit noted)
5. **Existing patterns** - Reuse screen navigation from `useScreenStore()`

## Requirements

### Core

1. New screen: `WORLDBOOK_EDITOR` accessible from character list
2. DataTable with columns: Title, Keywords (chips), Position, Enabled, Actions
3. Sidebar editor form with all WorldBookEntry fields
4. Keyword management via Chips component
5. Save/Cancel with validation feedback

### Responsive

1. Desktop (>1024px): DataTable + fixed side-panel
2. Tablet (640-1024px): DataTable with expandable rows
3. Mobile (<640px): Stacked layout, drawer overlay

## Architecture

### Component Hierarchy

```
src/components/worldbook/
├── WorldbookEditor.vue       # Main screen container
├── WorldbookTable.vue        # DataTable list view
├── WorldbookEntryForm.vue    # Sidebar detail editor
└── WorldbookKeywords.vue     # Chips keyword manager
```

### State Management

```
useWorldbookStore (Pinia)
├── entries: WorldBookEntry[]        # Current character's worldbook
├── selectedEntry: WorldBookEntry    # Currently editing
├── selectedIndex: number            # Index in array
├── isDirty: boolean                 # Unsaved changes
└── characterId: string              # Current character
```

### Screen Navigation

```typescript
// constants.ts
export const SCREENS = {
  // ... existing
  WORLDBOOK_EDITOR: 'worldbook-editor',
};

// Usage
useScreenStore().setScreen(SCREENS.WORLDBOOK_EDITOR, { characterId });
```

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/worldbook/WorldbookEditor.vue` | CREATE | Main screen |
| `src/components/worldbook/WorldbookTable.vue` | CREATE | DataTable |
| `src/components/worldbook/WorldbookEntryForm.vue` | CREATE | Form editor |
| `src/stores/worldbook.ts` | CREATE | Pinia store |
| `src/constants.ts` | MODIFY | Add screen constant |
| `src/components/MainLayout.vue` | MODIFY | Add route |
| `src/components/character_cards/Index.vue` | MODIFY | Add edit button |

## Implementation Steps

### Step 1: Add Screen Constant

File: `src/constants.ts`

```typescript
export const SCREENS = {
  PROFILE_LIST: "profile-list",
  CHARACTER_LIST: "character-list",
  CHARACTER_TRANSLATE: "character-translate",
  CHAT: "chat",
  MODELS_LIST: "models-list",
  PRESETS_CONFIG: "preset-config",
  WORLDBOOK_EDITOR: "worldbook-editor",  // NEW
};
```

### Step 2: Create Worldbook Store

File: `src/stores/worldbook.ts`

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, CharacterCard } from '@/db';
import type { WorldBookEntry } from '@/types/character';
import { WorldbookService } from '@/services/worldbook-service';

export const useWorldbookStore = defineStore('worldbook', () => {
  // State
  const characterId = ref<string | null>(null);
  const entries = ref<WorldBookEntry[]>([]);
  const selectedIndex = ref<number | null>(null);
  const isDirty = ref(false);
  const isEmbedding = ref(false);
  const embeddingProgress = ref({ current: 0, total: 0 });

  // Computed
  const selectedEntry = computed(() => {
    if (selectedIndex.value === null) return null;
    return entries.value[selectedIndex.value] || null;
  });

  const hasEmbeddingModel = computed(() => WorldbookService.hasEmbeddingModel());

  // Actions
  function loadCharacter(charId: string) {
    const char = db.CharacterCards.findOne({ id: charId }) as CharacterCard;
    if (!char) return;

    characterId.value = charId;
    entries.value = [...(char.data?.worldBook || [])];
    selectedIndex.value = null;
    isDirty.value = false;
  }

  function selectEntry(index: number | null) {
    selectedIndex.value = index;
  }

  function updateEntry(index: number, updates: Partial<WorldBookEntry>) {
    if (!entries.value[index]) return;
    entries.value[index] = { ...entries.value[index], ...updates };
    isDirty.value = true;
  }

  function addEntry() {
    const newEntry: WorldBookEntry = {
      keys: [],
      content: '',
      comment: 'New Entry',
      enabled: true,
      position: 'after_char',
      insertionOrder: entries.value.length,
      selective: true,
      constant: false,
    };
    entries.value.push(newEntry);
    selectedIndex.value = entries.value.length - 1;
    isDirty.value = true;
  }

  function deleteEntry(index: number) {
    if (index < 0 || index >= entries.value.length) return;
    entries.value.splice(index, 1);

    if (selectedIndex.value === index) {
      selectedIndex.value = null;
    } else if (selectedIndex.value !== null && selectedIndex.value > index) {
      selectedIndex.value--;
    }
    isDirty.value = true;
  }

  async function saveAll(): Promise<boolean> {
    if (!characterId.value) return false;

    try {
      db.CharacterCards.updateOne(
        { id: characterId.value },
        { $set: { 'data.worldBook': entries.value } }
      );
      isDirty.value = false;
      return true;
    } catch (e) {
      console.error('Failed to save worldbook:', e);
      return false;
    }
  }

  async function generateEmbeddings(): Promise<number> {
    if (!characterId.value) return 0;

    isEmbedding.value = true;
    embeddingProgress.value = { current: 0, total: entries.value.length };

    try {
      // Save first to persist any changes
      await saveAll();

      const count = await WorldbookService.embedAllEntries(
        characterId.value,
        (current, total) => {
          embeddingProgress.value = { current, total };
        }
      );

      // Reload to get updated embeddings
      loadCharacter(characterId.value);
      return count;
    } finally {
      isEmbedding.value = false;
    }
  }

  function reset() {
    characterId.value = null;
    entries.value = [];
    selectedIndex.value = null;
    isDirty.value = false;
  }

  return {
    // State
    characterId,
    entries,
    selectedIndex,
    isDirty,
    isEmbedding,
    embeddingProgress,
    // Computed
    selectedEntry,
    hasEmbeddingModel,
    // Actions
    loadCharacter,
    selectEntry,
    updateEntry,
    addEntry,
    deleteEntry,
    saveAll,
    generateEmbeddings,
    reset,
  };
});
```

### Step 3: Create WorldbookEditor.vue

File: `src/components/worldbook/WorldbookEditor.vue`

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useScreenStore } from '@/stores/screen';
import { useWorldbookStore } from '@/stores/worldbook';
import { SCREENS } from '@/constants';
import WorldbookTable from './WorldbookTable.vue';
import WorldbookEntryForm from './WorldbookEntryForm.vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

const screenStore = useScreenStore();
const worldbookStore = useWorldbookStore();
const toast = useToast();

const characterId = computed(() => screenStore.payload?.characterId as string);

onMounted(() => {
  if (characterId.value) {
    worldbookStore.loadCharacter(characterId.value);
  }
});

onUnmounted(() => {
  worldbookStore.reset();
});

function handleBack() {
  if (worldbookStore.isDirty) {
    if (!confirm('You have unsaved changes. Discard?')) return;
  }
  screenStore.setScreen(SCREENS.CHARACTER_LIST);
}

async function handleSave() {
  const success = await worldbookStore.saveAll();
  if (success) {
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Worldbook saved', life: 2000 });
  } else {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save', life: 3000 });
  }
}

async function handleGenerateEmbeddings() {
  if (!worldbookStore.hasEmbeddingModel) {
    toast.add({
      severity: 'warn',
      summary: 'No Embedding Model',
      detail: 'Configure an embedding model in LLM Models',
      life: 4000,
    });
    return;
  }

  const count = await worldbookStore.generateEmbeddings();
  toast.add({
    severity: 'success',
    summary: 'Embeddings Generated',
    detail: `${count} entries embedded`,
    life: 3000,
  });
}
</script>

<template>
  <div class="worldbook-editor h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
      <div class="flex items-center gap-2">
        <Button icon="pi pi-arrow-left" text @click="handleBack" />
        <h1 class="text-xl font-semibold">Worldbook Editor</h1>
        <span v-if="worldbookStore.isDirty" class="text-amber-500 text-sm">(unsaved)</span>
      </div>

      <div class="flex items-center gap-2">
        <Button
          label="Generate Embeddings"
          icon="pi pi-bolt"
          severity="secondary"
          :loading="worldbookStore.isEmbedding"
          :disabled="!worldbookStore.hasEmbeddingModel"
          @click="handleGenerateEmbeddings"
        />
        <Button label="Save" icon="pi pi-save" @click="handleSave" :disabled="!worldbookStore.isDirty" />
      </div>
    </div>

    <!-- Progress bar for embedding -->
    <div v-if="worldbookStore.isEmbedding" class="px-4 py-2 bg-surface-100 dark:bg-surface-800">
      <div class="text-sm mb-1">
        Generating embeddings: {{ worldbookStore.embeddingProgress.current }}/{{ worldbookStore.embeddingProgress.total }}
      </div>
      <div class="h-2 bg-surface-200 dark:bg-surface-700 rounded">
        <div
          class="h-full bg-primary-500 rounded transition-all"
          :style="{ width: `${(worldbookStore.embeddingProgress.current / worldbookStore.embeddingProgress.total) * 100}%` }"
        />
      </div>
    </div>

    <!-- Main content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Table (left side on desktop) -->
      <div class="flex-1 overflow-auto p-4" :class="{ 'lg:w-1/2': worldbookStore.selectedEntry }">
        <WorldbookTable />
      </div>

      <!-- Detail form (right side on desktop, drawer on mobile) -->
      <WorldbookEntryForm v-if="worldbookStore.selectedEntry" />
    </div>
  </div>
</template>
```

### Step 4: Create WorldbookTable.vue

File: `src/components/worldbook/WorldbookTable.vue`

```vue
<script setup lang="ts">
import { useWorldbookStore } from '@/stores/worldbook';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputSwitch from 'primevue/inputswitch';

const worldbookStore = useWorldbookStore();

function getPositionLabel(position?: string) {
  const labels: Record<string, string> = {
    before_char: 'Before Char',
    after_char: 'After Char',
    before_input: 'Before Input',
    after_input: 'After Input',
  };
  return labels[position || ''] || 'After Char';
}

function handleRowClick(event: { index: number }) {
  worldbookStore.selectEntry(event.index);
}

function handleToggleEnabled(index: number, value: boolean) {
  worldbookStore.updateEntry(index, { enabled: value });
}
</script>

<template>
  <div class="worldbook-table">
    <div class="flex justify-between items-center mb-4">
      <span class="text-sm text-surface-500">{{ worldbookStore.entries.length }} entries</span>
      <Button label="Add Entry" icon="pi pi-plus" size="small" @click="worldbookStore.addEntry" />
    </div>

    <DataTable
      :value="worldbookStore.entries"
      :selection="worldbookStore.selectedEntry"
      selectionMode="single"
      dataKey="comment"
      @row-click="handleRowClick"
      class="text-sm"
      scrollable
      scrollHeight="flex"
      :rowClass="(data, index) => ({ 'bg-primary-50 dark:bg-primary-900/20': index === worldbookStore.selectedIndex })"
    >
      <Column header="Title" field="comment" style="min-width: 150px">
        <template #body="{ data }">
          <span class="font-medium">{{ data.comment || 'Untitled' }}</span>
          <span v-if="data.embedding?.length" class="ml-2 text-xs text-green-500" title="Has embedding">
            <i class="pi pi-check-circle" />
          </span>
        </template>
      </Column>

      <Column header="Keywords" style="min-width: 200px">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="key in (data.keys || []).slice(0, 3)"
              :key="key"
              :value="key"
              severity="secondary"
              class="text-xs"
            />
            <Tag v-if="(data.keys?.length || 0) > 3" :value="`+${data.keys.length - 3}`" severity="info" class="text-xs" />
          </div>
        </template>
      </Column>

      <Column header="Position" field="position" style="width: 120px">
        <template #body="{ data }">
          <span class="text-xs">{{ getPositionLabel(data.position) }}</span>
        </template>
      </Column>

      <Column header="Enabled" style="width: 80px">
        <template #body="{ data, index }">
          <InputSwitch
            :modelValue="data.enabled !== false"
            @update:modelValue="handleToggleEnabled(index, $event)"
            @click.stop
          />
        </template>
      </Column>

      <Column header="" style="width: 60px">
        <template #body="{ index }">
          <Button
            icon="pi pi-trash"
            text
            severity="danger"
            size="small"
            @click.stop="worldbookStore.deleteEntry(index)"
          />
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-surface-400">
          No worldbook entries. Click "Add Entry" to create one.
        </div>
      </template>
    </DataTable>
  </div>
</template>
```

### Step 5: Create WorldbookEntryForm.vue

File: `src/components/worldbook/WorldbookEntryForm.vue`

```vue
<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useWorldbookStore } from '@/stores/worldbook';
import Sidebar from 'primevue/sidebar';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Chips from 'primevue/chips';
import Select from 'primevue/select';
import InputSwitch from 'primevue/inputswitch';
import Button from 'primevue/button';

const worldbookStore = useWorldbookStore();

// Local form state for two-way binding
const form = ref({
  comment: '',
  keys: [] as string[],
  content: '',
  position: 'after_char',
  insertionOrder: 0,
  enabled: true,
  constant: false,
  selective: true,
  useRegex: false,
});

const positionOptions = [
  { label: 'Before Character', value: 'before_char' },
  { label: 'After Character', value: 'after_char' },
  { label: 'Before Input', value: 'before_input' },
  { label: 'After Input', value: 'after_input' },
];

const contentLength = computed(() => form.value.content?.length || 0);
const hasEmbedding = computed(() => !!worldbookStore.selectedEntry?.embedding?.length);

// Sync form with selected entry
watch(
  () => worldbookStore.selectedEntry,
  (entry) => {
    if (entry) {
      form.value = {
        comment: entry.comment || '',
        keys: [...(entry.keys || [])],
        content: entry.content || '',
        position: entry.position || 'after_char',
        insertionOrder: entry.insertionOrder || 0,
        enabled: entry.enabled !== false,
        constant: entry.constant || false,
        selective: entry.selective !== false,
        useRegex: entry.useRegex || false,
      };
    }
  },
  { immediate: true }
);

function handleUpdate() {
  if (worldbookStore.selectedIndex === null) return;
  worldbookStore.updateEntry(worldbookStore.selectedIndex, { ...form.value });
}

function handleClose() {
  worldbookStore.selectEntry(null);
}
</script>

<template>
  <Sidebar
    :visible="!!worldbookStore.selectedEntry"
    position="right"
    class="w-full lg:w-[400px]"
    @update:visible="!$event && handleClose()"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <span class="font-semibold">Edit Entry</span>
        <span v-if="hasEmbedding" class="text-xs text-green-500">
          <i class="pi pi-check-circle mr-1" />Embedded
        </span>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <!-- Title -->
      <div class="field">
        <label class="block text-sm font-medium mb-1">Title</label>
        <InputText
          v-model="form.comment"
          class="w-full"
          placeholder="Entry title/comment"
          @input="handleUpdate"
        />
      </div>

      <!-- Keywords -->
      <div class="field">
        <label class="block text-sm font-medium mb-1">Keywords</label>
        <Chips
          v-model="form.keys"
          class="w-full"
          placeholder="Type and press Enter"
          @update:modelValue="handleUpdate"
        />
        <small class="text-surface-400">Press Enter to add keywords</small>
      </div>

      <!-- Content -->
      <div class="field">
        <label class="block text-sm font-medium mb-1">
          Content
          <span class="text-surface-400 font-normal">({{ contentLength }}/2000)</span>
        </label>
        <Textarea
          v-model="form.content"
          rows="8"
          class="w-full"
          :maxlength="2000"
          placeholder="Lore content..."
          @input="handleUpdate"
        />
      </div>

      <!-- Position -->
      <div class="field">
        <label class="block text-sm font-medium mb-1">Position</label>
        <Select
          v-model="form.position"
          :options="positionOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          @update:modelValue="handleUpdate"
        />
      </div>

      <!-- Insertion Order -->
      <div class="field">
        <label class="block text-sm font-medium mb-1">Insertion Order</label>
        <InputText
          v-model.number="form.insertionOrder"
          type="number"
          class="w-full"
          @input="handleUpdate"
        />
        <small class="text-surface-400">Lower = higher priority</small>
      </div>

      <!-- Toggles -->
      <div class="grid grid-cols-2 gap-4">
        <div class="flex items-center justify-between">
          <label class="text-sm">Enabled</label>
          <InputSwitch v-model="form.enabled" @update:modelValue="handleUpdate" />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm">Constant</label>
          <InputSwitch v-model="form.constant" @update:modelValue="handleUpdate" />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm">Selective</label>
          <InputSwitch v-model="form.selective" @update:modelValue="handleUpdate" />
        </div>

        <div class="flex items-center justify-between">
          <label class="text-sm">Use Regex</label>
          <InputSwitch v-model="form.useRegex" @update:modelValue="handleUpdate" />
        </div>
      </div>

      <!-- Info -->
      <div class="text-xs text-surface-400 p-3 bg-surface-100 dark:bg-surface-800 rounded">
        <p><strong>Constant:</strong> Always inject if enabled</p>
        <p><strong>Selective:</strong> Only inject if keywords match context</p>
        <p><strong>Regex:</strong> Treat keywords as regex patterns</p>
      </div>
    </div>
  </Sidebar>
</template>
```

### Step 6: Add Navigation from Character List

File: `src/components/character_cards/Index.vue` - Add worldbook edit button

```vue
<!-- Add to character card actions -->
<Button
  icon="pi pi-book"
  text
  severity="secondary"
  title="Edit Worldbook"
  @click="editWorldbook(character.id)"
/>

<script setup>
function editWorldbook(characterId: string) {
  screenStore.setScreen(SCREENS.WORLDBOOK_EDITOR, { characterId });
}
</script>
```

### Step 7: Register Screen in MainLayout

File: `src/components/MainLayout.vue`

```vue
<script setup>
import WorldbookEditor from './worldbook/WorldbookEditor.vue';
// ... other imports
</script>

<template>
  <!-- Add to screen router -->
  <WorldbookEditor v-if="screenStore.currentScreen === SCREENS.WORLDBOOK_EDITOR" />
</template>
```

## Todo List

- [x] Add `WORLDBOOK_EDITOR` to constants.ts
- [x] Create `src/stores/worldbook.ts` Pinia store
- [x] Create `src/components/worldbook/WorldbookEditor.vue`
- [x] Create `src/components/worldbook/WorldbookTable.vue`
- [x] Create `src/components/worldbook/WorldbookEntryForm.vue`
- [x] Add worldbook edit button to character list
- [x] Register screen in MainLayout.vue (via screen store)
- [ ] Test responsive behavior (mobile drawer) - Manual testing required
- [ ] Test keyboard navigation in DataTable - Manual testing required

## Success Criteria

1. User can navigate to worldbook editor from character list
2. DataTable displays all entries with columns (title, keywords, position, enabled)
3. Clicking row opens sidebar form with all fields
4. Chips component allows adding/removing keywords
5. Changes persist after save
6. Unsaved changes warning on back navigation
7. "Generate Embeddings" button triggers embedding generation

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| PrimeVue Sidebar mobile behavior | Medium | Test on iOS Safari, add touch events |
| DataTable performance with 100+ entries | Low | Virtual scrolling if needed |
| Form validation edge cases | Low | Add Toast for validation errors |
| Keyboard accessibility | Low | Test tab navigation |

## Security Considerations

- No direct HTML rendering (use Vue template escaping)
- Input validation for numeric fields (insertionOrder)
- XSS prevention: content field stored as-is but rendered safely

## Next Steps

After completing this phase:
1. Proceed to [Phase 04: Global Worldbooks](./phase-04-global-worldbooks.md) to add shared worldbook management
2. Integrate WorldbookService.updateEntryEmbedding() on entry save (optional optimization)
