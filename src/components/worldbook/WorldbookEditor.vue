<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useScreenStore } from '@/stores/screen';
import { useWorldbookStore } from '@/stores/worldbook';
import { SCREENS } from '@/constants';
import WorldbookTable from './WorldbookTable.vue';
import WorldbookEntryForm from './WorldbookEntryForm.vue';
import WorldbookLinker from './WorldbookLinker.vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

const screenStore = useScreenStore();
const worldbookStore = useWorldbookStore();
const toast = useToast();

const characterId = computed(() => screenStore.screenPayload?.characterId as string);

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
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
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
    <div v-if="worldbookStore.isEmbedding" class="px-4 py-2 bg-gray-100 dark:bg-gray-800">
      <div class="text-sm mb-1">
        Generating embeddings: {{ worldbookStore.embeddingProgress.current }}/{{ worldbookStore.embeddingProgress.total }}
      </div>
      <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded">
        <div
          class="h-full bg-blue-500 rounded transition-all"
          :style="{ width: `${(worldbookStore.embeddingProgress.current / worldbookStore.embeddingProgress.total) * 100}%` }"
        />
      </div>
    </div>

    <!-- Global Worldbook Linker -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <WorldbookLinker
        v-if="characterId"
        :character-id="characterId"
        @change="worldbookStore.loadCharacter(characterId)"
      />
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
