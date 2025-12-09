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
    // Cleanup orphaned links in characters
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
