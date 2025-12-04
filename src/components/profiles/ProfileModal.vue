<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { db, UserProfile } from '@/db';
import { useModalStore } from '@/stores/modal';
import { MODALS } from '@/constants';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import IftaLabel from 'primevue/iftalabel';

const modalStore = useModalStore();
const { modalData } = storeToRefs(modalStore);

// Form fields
const id = ref<string | null>(null);
const name = ref('');
const appearance = ref('');
const personality = ref('');
const background = ref('');
const currentStatus = ref('');
const inventory = ref<string[]>([]);
const inventoryText = ref(''); // For textarea input

// Watch modalData to populate form when editing
watch(() => modalData.value, (data) => {
    if (data) {
        // Edit mode
        id.value = data.id;
        name.value = data.name || '';
        appearance.value = data.appearance || '';
        personality.value = data.personality || '';
        background.value = data.background || '';
        currentStatus.value = data.currentStatus || '';
        inventory.value = data.inventory || [];
        inventoryText.value = inventory.value.join('\n');
    } else {
        // Create mode - reset form
        resetForm();
    }
}, { immediate: true });

function resetForm() {
    id.value = null;
    name.value = '';
    appearance.value = '';
    personality.value = '';
    background.value = '';
    currentStatus.value = '';
    inventory.value = [];
    inventoryText.value = '';
}

function closeModal() {
    resetForm();
    modalStore.closeModal();
}

function saveProfile() {
    // Parse inventory from textarea
    const parsedInventory = inventoryText.value
        .split('\n')
        .map(item => item.trim())
        .filter(item => item.length > 0);

    const profileData: Omit<UserProfile, 'id' | 'createdAt'> = {
        name: name.value,
        appearance: appearance.value,
        personality: personality.value,
        background: background.value,
        currentStatus: currentStatus.value,
        inventory: parsedInventory,
    };

    if (id.value) {
        // Update existing profile
        db.UserProfiles.updateOne({ id: id.value }, {
            $set: {
                ...profileData,
                createdAt: Date.now(), // Update timestamp
            }
        });
    } else {
        // Create new profile
        db.UserProfiles.insert({
            id: crypto.randomUUID(),
            ...profileData,
            createdAt: Date.now(),
        });
    }

    closeModal();
}

const isEditMode = () => id.value !== null;
</script>

<template>
    <Dialog :visible="modalStore.isModalOpen(MODALS.USER_PROFILE)"
        @update:visible="(value) => { if (!value) closeModal() }" @hide="closeModal" modal
        :header="isEditMode() ? 'Edit Profile' : 'Create New Profile'" :style="{ width: '50vw' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
        <div class="flex flex-col gap-4 p-4">
            <!-- Name -->
            <IftaLabel>
                <InputText v-model="name" inputId="profileName" class="w-full" required />
                <label for="profileName">Name *</label>
            </IftaLabel>

            <!-- Appearance -->
            <IftaLabel>
                <Textarea v-model="appearance" inputId="profileAppearance" class="w-full" rows="3"
                    placeholder="Mô tả ngoại hình của bạn..." />
                <label for="profileAppearance">Appearance</label>
            </IftaLabel>

            <!-- Personality -->
            <IftaLabel>
                <Textarea v-model="personality" inputId="profilePersonality" class="w-full" rows="3"
                    placeholder="Mô tả tính cách của bạn..." />
                <label for="profilePersonality">Personality</label>
            </IftaLabel>

            <!-- Background -->
            <IftaLabel>
                <Textarea v-model="background" inputId="profileBackground" class="w-full" rows="3"
                    placeholder="Câu chuyện quá khứ của bạn..." />
                <label for="profileBackground">Background</label>
            </IftaLabel>

            <!-- Current Status -->
            <IftaLabel>
                <Textarea v-model="currentStatus" inputId="profileStatus" class="w-full" rows="2"
                    placeholder="Trạng thái hiện tại của bạn..." />
                <label for="profileStatus">Current Status</label>
            </IftaLabel>

            <!-- Inventory -->
            <IftaLabel>
                <Textarea v-model="inventoryText" inputId="profileInventory" class="w-full" rows="3"
                    placeholder="Mỗi dòng là một vật phẩm..." />
                <label for="profileInventory">Inventory (mỗi dòng 1 item)</label>
            </IftaLabel>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button @click="closeModal" label="Cancel" severity="secondary" outlined />
                <Button @click="saveProfile" :label="isEditMode() ? 'Update' : 'Create'" severity="primary"
                    :disabled="!name" />
            </div>
        </template>
    </Dialog>
</template>
