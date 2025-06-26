<script setup lang="ts">
import MainLayout from '@/components/MainLayout.vue'
import ConfirmDialog from 'primevue/confirmdialog';
import { onMounted } from 'vue';
import { useResourcesStore } from '@/stores/resources';

const resourcesStore = useResourcesStore();


onMounted(async () => {
  await resourcesStore.fetchResources();
});
</script>

<template>
  <MainLayout />
  <ConfirmDialog />
</template>
