<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useGlobalWorldbookStore } from '@/stores/global-worldbook';
import { useWorldbookStore } from '@/stores/worldbook';
import { db, CharacterCard } from '@/db';
import MultiSelect from 'primevue/multiselect';

const props = defineProps<{
  characterId: string;
}>();

const emit = defineEmits<{
  change: [linkedIds: string[]];
}>();

const globalStore = useGlobalWorldbookStore();
const worldbookStore = useWorldbookStore();

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
    const success = worldbookStore.linkGlobalWorldbooks(props.characterId, value);
    if (success) {
      emit('change', value);
    }
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
