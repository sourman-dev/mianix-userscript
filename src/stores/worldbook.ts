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
    const char = db.CharacterCards.findOne({ id: charId }) as CharacterCard | null;
    if (!char) {
      console.warn(`Character ${charId} not found`);
      return;
    }

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
    if (!characterId.value) {
      console.error('Cannot add entry: no character loaded');
      return;
    }

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
