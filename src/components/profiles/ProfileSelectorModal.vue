<script setup lang="ts">
import { computed } from 'vue';
import { db, UserProfile } from '@/db';
import { useModalStore } from '@/stores/modal';
import { MODALS } from '@/constants';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Card from 'primevue/card';

const modalStore = useModalStore();

// Get all profiles
const profiles = computed(() => {
    return db.UserProfiles.find().fetch() as UserProfile[];
});

// Emit selected profile
const emit = defineEmits<{
    selectProfile: [profile: UserProfile]
}>();

function selectProfile(profile: UserProfile) {
    emit('selectProfile', profile);
    modalStore.closeModal();
}

function closeModal() {
    modalStore.closeModal();
}
</script>

<template>
    <Dialog :visible="modalStore.isModalOpen(MODALS.PROFILE_SELECTOR)"
        @update:visible="(value) => { if (!value) closeModal() }" @hide="closeModal" modal header="Chọn Profile"
        :style="{ width: '60vw' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }" :closable="false">
        <div class="p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Chọn profile để thay thế {<!-- -->{ user }} trong character card
            </p>

            <!-- Empty State -->
            <div v-if="profiles.length === 0" class="text-center py-8">
                <div class="text-gray-400 mb-4">
                    <i class="pi pi-user" style="font-size: 2rem"></i>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Bạn chưa có profile nào. Hãy tạo profile trước!
                </p>
                <Button @click="closeModal" label="Đóng" severity="secondary" />
            </div>

            <!-- Profiles Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                <Card v-for="profile in profiles" :key="profile.id"
                    class="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-500"
                    @click="selectProfile(profile)">
                    <template #header>
                        <div class="p-4 bg-gradient-to-r from-purple-500 to-pink-500">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <i class="pi pi-user text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <h3 class="font-bold text-white">{{ profile.name }}</h3>
                                </div>
                                <i class="pi pi-chevron-right text-white"></i>
                            </div>
                        </div>
                    </template>

                    <template #content>
                        <div class="space-y-2 text-sm">
                            <p v-if="profile.appearance" class="text-gray-700 dark:text-gray-300 line-clamp-2">
                                {{ profile.appearance }}
                            </p>
                            <p v-if="profile.personality" class="text-gray-600 dark:text-gray-400 text-xs line-clamp-1">
                                {{ profile.personality }}
                            </p>
                        </div>
                    </template>
                </Card>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <Button @click="closeModal" label="Hủy" severity="secondary" outlined />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
