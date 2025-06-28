<script setup lang="ts">
import MainLayout from '@/components/MainLayout.vue'
import ConfirmDialog from 'primevue/confirmdialog';
import LoadingScreen from '@/components/common/LoadingScreen.vue'; // Import LoadingScreen
import { onMounted } from 'vue';
import { useResourcesStore } from '@/stores/resources';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';

const resourcesStore = useResourcesStore();
const appStore = useAppStore();
const { isReady } = storeToRefs(appStore); // Make isReady reactive

onMounted(async () => {
  await resourcesStore.fetchResources();
});
</script>

<template>
  <div v-if="!isReady">
    <LoadingScreen />
  </div>
  <div v-else>
    <MainLayout />
    <ConfirmDialog />
  </div>
</template>
