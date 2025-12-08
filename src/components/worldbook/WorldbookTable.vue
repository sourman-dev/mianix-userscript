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
      <span class="text-sm text-gray-500">{{ worldbookStore.entries.length }} entries</span>
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
      :rowClass="(data: any, index: number) => ({ 'bg-blue-50 dark:bg-blue-900/20': index === worldbookStore.selectedIndex })"
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
        <div class="text-center py-8 text-gray-400">
          No worldbook entries. Click "Add Entry" to create one.
        </div>
      </template>
    </DataTable>
  </div>
</template>
