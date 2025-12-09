<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { db, UserProfile, CharacterCard } from '@/db';
import { useModalStore } from '@/stores/modal';
import { MODALS } from '@/constants';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

const props = defineProps<{
    characterId?: string;
}>();

const modalStore = useModalStore();

// Get all profiles
const profiles = computed(() => {
    return db.UserProfiles.find().fetch() as UserProfile[];
});

// Get character and alternate greetings
const character = computed(() => {
    if (!props.characterId) return null;
    return db.CharacterCards.findOne({ id: props.characterId }) as CharacterCard | null;
});

const alternateGreetings = computed(() => {
    if (!character.value?.data?.alternateGreetings) return [];
    return character.value.data.alternateGreetings;
});

const hasAlternateGreetings = computed(() => alternateGreetings.value.length > 0);

// Greeting selector state
const selectedGreetingIndex = ref<number>(-1); // -1 = Random

const greetingOptions = computed(() => {
    const options = [{ label: '🎲 Random', value: -1 }];

    alternateGreetings.value.forEach((greeting, index) => {
        const truncated = greeting.length > 50
            ? greeting.substring(0, 50) + '...'
            : greeting;
        options.push({ label: truncated, value: index });
    });

    return options;
});

const selectedGreetingPreview = computed(() => {
    if (selectedGreetingIndex.value === -1) {
        // Random - show firstMessage if available
        return character.value?.data?.firstMessage || 'Random greeting will be selected';
    }
    return alternateGreetings.value[selectedGreetingIndex.value] || '';
});

// Profile selector state
const selectedProfileId = ref<string | null>(null);

const profileOptions = computed(() => {
    return profiles.value.map(profile => ({
        label: profile.name,
        value: profile.id
    }));
});

const selectedProfilePreview = computed(() => {
    if (!selectedProfileId.value) return '';

    const profile = profiles.value.find(p => p.id === selectedProfileId.value);
    if (!profile) return '';

    const parts: string[] = [];
    if (profile.appearance) parts.push(profile.appearance);
    if (profile.personality) parts.push(profile.personality);

    return parts.join('\n\n');
});

// Reset selections when character changes
watch(() => props.characterId, () => {
    selectedGreetingIndex.value = -1;
});

// Emit selected profile and greeting index
const emit = defineEmits<{
    selectProfile: [profile: UserProfile, greetingIndex: number]
}>();

function confirmSelection() {
    if (!selectedProfileId.value) return;

    const profile = profiles.value.find(p => p.id === selectedProfileId.value);
    if (!profile) return;

    emit('selectProfile', profile, selectedGreetingIndex.value);
    modalStore.closeModal();
}

function closeModal() {
    modalStore.closeModal();
    selectedGreetingIndex.value = -1; // Reset on close
    selectedProfileId.value = null; // Reset profile selection
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

            <!-- Greeting Selector (only show if character has alternate greetings) -->
            <div v-if="hasAlternateGreetings" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label for="greeting-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chọn lời chào đầu tiên:
                </label>
                <Select
                    id="greeting-select"
                    v-model="selectedGreetingIndex"
                    :options="greetingOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Chọn greeting"
                    class="w-full mb-3"
                />
                <Textarea
                    v-model="selectedGreetingPreview"
                    readonly
                    :autoResize="false"
                    rows="4"
                    class="w-full max-h-24 overflow-y-auto"
                    placeholder="Preview greeting..."
                />
            </div>

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

            <!-- Profile Selector -->
            <div v-else class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label for="profile-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Chọn Profile:
                </label>
                <Select
                    id="profile-select"
                    v-model="selectedProfileId"
                    :options="profileOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Chọn profile"
                    class="w-full mb-3"
                />
                <Textarea
                    v-model="selectedProfilePreview"
                    readonly
                    :autoResize="false"
                    rows="4"
                    class="w-full max-h-24 overflow-y-auto"
                    placeholder="Preview profile..."
                />
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end gap-2">
                <Button @click="closeModal" label="Hủy" severity="secondary" outlined />
                <Button
                    v-if="profiles.length > 0"
                    @click="confirmSelection"
                    label="Xác nhận"
                    :disabled="!selectedProfileId"
                />
            </div>
        </template>
    </Dialog>
</template>

