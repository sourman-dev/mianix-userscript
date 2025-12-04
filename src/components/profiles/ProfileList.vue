<script setup lang="ts">
import { computed } from 'vue';
import { db, UserProfile } from '@/db';
import { useModalStore } from '@/stores/modal';
import { MODALS } from '@/constants';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useConfirm } from 'primevue/useconfirm';

const modalStore = useModalStore();
const confirm = useConfirm();

// Reactive profiles list
const profiles = computed(() => {
    return db.UserProfiles.find().fetch() as UserProfile[];
});

function openCreateModal() {
    modalStore.openModal(MODALS.USER_PROFILE, null);
}

function openEditModal(profile: UserProfile) {
    modalStore.openModal(MODALS.USER_PROFILE, profile);
}

async function deleteProfile(profile: UserProfile) {
    confirm.require({
        message: `Bạn có chắc muốn xóa profile "${profile.name}"?`,
        header: 'Xóa Profile',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
            db.UserProfiles.removeOne({ id: profile.id });
        }
    });
}

function deleteAllProfiles() {
    confirm.require({
        message: `Bạn có chắc muốn xóa TẤT CẢ ${profiles.value.length} profiles? Hành động này không thể hoàn tác!`,
        header: 'Xóa Tất Cả Profiles',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => {
            // Remove all profiles
            profiles.value.forEach(profile => {
                db.UserProfiles.removeOne({ id: profile.id });
            });
        }
    });
}
</script>

<template>
    <div class="p-6">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Profiles</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Quản lý các profile người dùng cho roleplay
                </p>
            </div>
            <div class="flex gap-2">
                <Button v-if="profiles.length > 0" @click="deleteAllProfiles" icon="pi pi-trash" label="Xóa Tất Cả"
                    severity="danger" outlined />
                <Button @click="openCreateModal" icon="pi pi-plus" label="Tạo Profile" severity="primary" />
            </div>
        </div>

        <!-- Empty State -->
        <div v-if="profiles.length === 0" class="text-center py-12">
            <div class="text-gray-400 mb-4">
                <i class="pi pi-user" style="font-size: 3rem"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Chưa có profile nào
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Tạo profile đầu tiên để bắt đầu roleplay
            </p>
            <Button @click="openCreateModal" icon="pi pi-plus" label="Tạo Profile Đầu Tiên" severity="primary" />
        </div>

        <!-- Profiles Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card v-for="profile in profiles" :key="profile.id" class="hover:shadow-lg transition-shadow">
                <template #header>
                    <div class="p-4 bg-gradient-to-r from-purple-500 to-pink-500">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <i class="pi pi-user text-white text-xl"></i>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-bold text-white">{{ profile.name }}</h3>
                                <p class="text-xs text-white/80">User Profile</p>
                            </div>
                        </div>
                    </div>
                </template>

                <template #content>
                    <div class="space-y-3">
                        <div v-if="profile.appearance">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Appearance</p>
                            <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {{ profile.appearance }}
                            </p>
                        </div>

                        <div v-if="profile.personality">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Personality</p>
                            <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {{ profile.personality }}
                            </p>
                        </div>

                        <div v-if="profile.background">
                            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Background</p>
                            <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {{ profile.background }}
                            </p>
                        </div>
                    </div>
                </template>

                <template #footer>
                    <div class="flex gap-2">
                        <Button @click="openEditModal(profile)" icon="pi pi-pencil" label="Edit" severity="secondary"
                            outlined class="flex-1" />
                        <Button @click="deleteProfile(profile)" icon="pi pi-trash" severity="danger" outlined />
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
