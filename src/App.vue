<script setup lang="ts">
import MainLayout from '@/components/MainLayout.vue'
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import LoadingScreen from '@/components/common/LoadingScreen.vue';
import ProfileModal from '@/components/profiles/ProfileModal.vue';
import { onMounted } from 'vue';
import { useResourcesStore } from '@/stores/resources';
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { useModalStore } from '@/stores/modal';

const resourcesStore = useResourcesStore();
const appStore = useAppStore();
const modalStore = useModalStore(); // Thêm modal store
const { isReady } = storeToRefs(appStore); // Make isReady reactive

onMounted(async () => {
  modalStore.closeModal(); // Reset tất cả modal khi app được mount
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
    <Toast />
    <ProfileModal />
  </div>
</template>
