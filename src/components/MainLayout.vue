<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Navigation -->
    <nav class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <!-- Logo and text on the left -->
      <div class="flex items-center gap-2">
        <img :src="APP_LOGO" alt="Mianix logo" class="h-8 w-8" />
        <span class="font-semibold text-lg text-gray-900 dark:text-white">Mianix</span>
      </div>
      
      <!-- NavConfig on the right -->
      <div class="flex items-center">
        <NavConfig />
      </div>
    </nav>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-6">
      <component :is="screenStore.currentComponent" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useScreenStore } from '@/stores/screen';
import { APP_LOGO } from '@/constants';
import NavConfig from './NavConfig.vue';
const screenStore = useScreenStore();
</script>