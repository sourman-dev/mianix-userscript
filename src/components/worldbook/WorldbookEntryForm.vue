<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useWorldbookStore } from '@/stores/worldbook';
import Sidebar from 'primevue/sidebar';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Chips from 'primevue/chips';
import Select from 'primevue/select';
import InputSwitch from 'primevue/inputswitch';

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
const hasEmbedding = computed(() => {
  const entry = worldbookStore.selectedEntry as any;
  return !!(entry?.embedding?.length);
});

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
        <small class="text-gray-400">Press Enter to add keywords</small>
      </div>

      <!-- Content -->
      <div class="field">
        <label class="block text-sm font-medium mb-1">
          Content
          <span class="text-gray-400 font-normal">({{ contentLength }}/2000)</span>
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
        <small class="text-gray-400">Lower = higher priority</small>
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
      <div class="text-xs text-gray-400 p-3 bg-gray-100 dark:bg-gray-800 rounded">
        <p><strong>Constant:</strong> Always inject if enabled</p>
        <p><strong>Selective:</strong> Only inject if keywords match context</p>
        <p><strong>Regex:</strong> Treat keywords as regex patterns</p>
      </div>
    </div>
  </Sidebar>
</template>
