<template>
    <Menu ref="menu" :model="menuItems" :popup="true" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg" v-if="menuItems.length > 0">
        <template #item="{ item }">
            <a v-ripple class="flex items-center px-4 py-3 text-sm cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 rounded-md mx-1 my-0.5">
                {{ item.label }}
            </a>
        </template>
    </Menu>
    <Button @click="toggle" severity="secondary" text>
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clip-rule="evenodd" />
        </svg>
    </Button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useScreenStore } from '@/stores/screen';
import { useI18n } from 'vue-i18n';
import Menu from 'primevue/menu';
import Button from 'primevue/button';
import { SCREENS } from '@/constants';

const { t } = useI18n();
const screenStore = useScreenStore();
const menu = ref();

const toggle = (event: Event) => {
    menu.value.toggle(event);
};

const menuItems = [
    {
        label: t('nav.profiles'),
        command: () => screenStore.setScreen(SCREENS.PROFILE_LIST),
    },
    {
        label: t('nav.characters'),
        command: () => screenStore.setScreen(SCREENS.CHARACTER_LIST),
    },
    {
        label: t('nav.global_worldbooks'),
        command: () => screenStore.setScreen(SCREENS.GLOBAL_WORLDBOOK_MANAGER),
    },
    {
        label: t('nav.llm_models'),
        command: () => screenStore.setScreen(SCREENS.MODELS_LIST),
    },
    {
        label: t('nav.presets'),
        command: () => screenStore.setScreen(SCREENS.PRESETS_CONFIG),
    },
];
</script>