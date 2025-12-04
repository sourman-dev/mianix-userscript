<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Profiles
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage your chat profiles
        </p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-plus" severity="info"
          size="small" label="New Profile" />
      </div>
    </div>
    <!--Body-->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card v-for="profile in profiles" :key="profile.id" class="w-full">
        <template #title>
          {{ profile.name || 'Unknown' }}
        </template>
        <template #subtitle>
          <div class="flex items-center gap-1 text-yellow-500">
            <i class="pi pi-user"></i>
            <span>{{ profile.persona }}</span>
          </div>
        </template>
        <template #footer>
          <div class="flex gap-3 mt-1 justify-end">
            <Button icon="pi pi-pencil" severity="secondary" outlined rounded aria-label="Edit" />
            <Button icon="pi pi-trash" severity="danger" rounded aria-label="Delete" />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Card from 'primevue/card';
import { ref } from 'vue';

// Mock data for profiles
const profiles = ref([
  {
    id: '1',
    name: 'Default Profile',
    persona: 'A helpful assistant.'
  },
  {
    id: '2',
    name: 'Creative Writer',
    persona: 'A creative writer for stories and poems.'
  },
  {
    id: '3',
    name: 'Technical Expert',
    persona: 'An expert in technical topics.'
  }
]);
</script>