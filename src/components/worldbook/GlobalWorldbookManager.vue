<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useGlobalWorldbookStore } from '@/stores/global-worldbook';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';

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
          <Textarea v-model="newDescription" class="w-full" placeholder="Optional description" rows="3" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text @click="showCreateDialog = false" />
        <Button label="Create" @click="handleCreate" :disabled="!newName.trim()" />
      </template>
    </Dialog>
  </div>
</template>
