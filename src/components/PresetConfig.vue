<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Preset Configuration
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage your prompt presets and configurations
        </p>
      </div>
      <div class="flex gap-2">
        <Button @click="openAddModal" severity="info" size="small">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Preset
        </Button>
        <Button @click="importCharacter" severity="secondary" size="small">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
          </svg>
          Import
        </Button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';

const openAddModal = () => {
  // TODO: Implement add modal functionality
  alert('Add preset functionality will be implemented soon!');
};

const importCharacter = () => {
  // TODO: Implement character import functionality
  alert('Import functionality will be implemented soon!');
};
</script>