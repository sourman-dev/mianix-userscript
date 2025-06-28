<template>
    <div class="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans max-w-screen-2xl mx-auto w-full">
        <!-- Header -->
        <header class="p-2 sm:p-4 border-b border-gray-700">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="flex items-center self-start sm:self-center space-x-3">
                    <CharacterAvatar :src="imageFile" v-if="imageFile" :is-circle="true" class="w-12" />
                    <div>
                        <h1 class="text-xl font-bold">{{ currentCharacter?.data?.name }}</h1>
                        <div class="flex items-center space-x-1 mt-1">
                            <Button v-tooltip.bottom="'Delete'" icon="pi pi-trash" severity="danger" text rounded
                                size="small" @click="handleRemoveDialogue" />
                            <LLMProviderSelect severity="help"/>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 self-end sm:self-center">
                    <Button v-tooltip.bottom="'World Book'" icon="pi pi-book" severity="secondary" />
                    <Button v-tooltip.bottom="'Regex Script'" icon="pi pi-code" severity="secondary" />
                    <Button v-tooltip.bottom="'Preset'" icon="pi pi-sliders-h" severity="secondary" />
                </div>
            </div>
        </header>

        <!-- Chat/Story Area -->
        <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div class="prose prose-invert max-w-none">
                <div v-for="(message, index) in currentDialogueMessages" :key="index" class="flex"
                    :class="{ 'justify-end': message.role === 'user', 'justify-start': message.role === 'assistant' }">
                    <div class="p-4 rounded-lg mb-4 max-w-lg"
                        :class="{ 'bg-blue-500 text-white': message.role === 'user', 'bg-gray-700': message.role === 'assistant' }">
                        <p v-html="formatMessage(message.content || '')"></p>
                        <MessageButtons :role="message.role as string" :messageId="message.id as string"
                            :latestMessageId="latestMessageId as string" @button-click="handleMessageButtonClick"
                            class="flex justify-end" />
                    </div>
                </div>
                <!--llmResponse -->
                <div v-if="llmResponse && isSending" class="flex justify-start">
                    <div class="p-4 rounded-lg mb-4 max-w-lg bg-blue-500 text-white">
                        <p v-html="formatMessage(llmResponse)"></p>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="p-2 sm:p-4 border-t border-gray-700">
            <div class="flex items-center space-x-2 sm:space-x-4">
                <Textarea v-model="message" placeholder="Type a message..." autoResize rows="1"
                    class="flex-1 bg-gray-800 border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500" />
                <Button :disabled="isSending" @click="handleSendMessage" v-tooltip.top="'Send'" icon="pi pi-send"
                    :loading="isSending" />
            </div>
            <div class="flex items-center justify-center space-x-2 mt-4">
                <Button v-tooltip.bottom="'Story Progress'" icon="pi pi-forward" severity="secondary" size="small" />
                <Button v-tooltip.bottom="'Perspective'" icon="pi pi-eye" severity="secondary" size="small" />
                <Button v-tooltip.bottom="'Scene Setting'" icon="pi pi-cog" severity="secondary" size="small" />
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { ref, watchEffect, onMounted, computed } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import MessageButtons from './MessageButtons.vue';
import LLMProviderSelect from '@/components/common/LLMProviderSelect.vue';
import { useScreenStore } from '@/stores/screen';
import { useResourcesStore } from '@/stores/resources';
import { CharacterCard, db, Dialogue, DialogueMessage, LLMModel, UserProfile } from '@/db';
import { formatMessageContent } from '@/utils/msg-process';
import { buildFinalPrompt } from '@/utils/prompt-utils';
import { OpenAIOptions, sendOpenAiRequestStream } from '@/utils/llm';
import { SCREENS } from '@/constants';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import { storeToRefs } from 'pinia';

const screenStore = useScreenStore();
const { screenPayload } = storeToRefs(screenStore);
const resourcesStore = useResourcesStore();
// const { llmProviders } = storeToRefs(resourcesStore);
const currentCharacter = ref<Partial<CharacterCard>>({});
const currentUser = ref<Partial<UserProfile>>({});
const currentDialogue = ref<Partial<Dialogue>>({});
const currentDialogueMessages = ref<Partial<DialogueMessage>[]>([]);
const currentLLMModel = ref<Partial<LLMModel>>({});

const message = ref('');
const llmResponse = ref('');
const isSending = ref(false);
const imageFile = ref<File | null>(null);

const latestMessageId = computed(() => {
    return currentDialogueMessages.value[currentDialogueMessages.value.length - 1]?.id;
})

function formatMessage(content: string): string {
    return formatMessageContent(content);
}
const { confirmDelete } = useDeleteConfirm();

function handleRemoveDialogue() {
    const info = {
        id: currentCharacter.value?.id,
        name: (currentCharacter.value as CharacterCard)?.data?.name || 'Unknown',
    }
    confirmDelete(info, {
        message: `Bạn có chắc chắn muốn xóa cuộc trò chuyện với "${info.name}"?`,
        header: 'Xóa cuộc trò chuyện',
        onConfirm: async (info) => {
            db.DialogueMessages.removeMany({ dialogueId: info.id });
            db.Dialogues.removeOne({ id: info.id });
            screenStore.setScreen(SCREENS.CHARACTER_LIST, null);
        }
    })

}

async function sendMessage(message: string) {
    try {
        const diaglougeId = currentDialogue.value.id || currentCharacter.value.id;
        if (!diaglougeId) {
            return;
        }
        const contextWindowSize = 10;
        const recentHistory = currentDialogueMessages.value.slice(-contextWindowSize);
        const prompts = {
            multiModePrompt: resourcesStore.multiModePrompt,
            multiModeChainOfThoughtPrompt: resourcesStore.multiModeChainOfThoughtPrompt,
            // compressorPrompt: resourcesStore.compressorPrompt,
            // statusPrompt: resourcesStore.statusPrompt,
            outputStructureSoftGuidePrompt: resourcesStore.outputStructureSoftGuidePrompt,
        }

        const { systemPrompt, userPrompt } = buildFinalPrompt(
            currentCharacter.value as CharacterCard,
            recentHistory as DialogueMessage[],
            message,
            { name: currentUser.value?.name || 'Anonymous' },
            prompts
        );
        // console.log('--- FINAL SYSTEM PROMPT ---');
        // console.log(systemPrompt);
        // console.log('--- FINAL USER PROMPT ---');
        // console.log(userPrompt);
        isSending.value = true;
        llmResponse.value = '';
        const options: OpenAIOptions = {
            baseURL: currentLLMModel.value?.baseUrl as string,
            apiKey: currentLLMModel.value?.apiKey || '',
            data: {
                model: currentLLMModel.value?.modelName || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                stream: true,
                temperature: 0.9,
            }
        };
        await sendOpenAiRequestStream(options, (chunk: string) => {
            // console.log(chunk);
            llmResponse.value += chunk;
        });

        db.DialogueMessages.insert({
            dialogueId: diaglougeId,
            role: 'assistant',
            content: llmResponse.value,
            createdAt: Date.now(),
        });
        llmResponse.value = '';
    } catch (error: any) {
        console.error('Error sending message:', error);
    } finally {
        isSending.value = false;
    }
}

async function handleSendMessage() {
    try {
        const diaglougeId = currentDialogue.value.id || currentCharacter.value.id;
        if (message.value.trim() === '' || !diaglougeId) {
            return;
        }
        const newMessage = message.value;
        db.DialogueMessages.insert({
            dialogueId: diaglougeId,
            role: 'user',
            content: newMessage,
            createdAt: Date.now(),
        })
        message.value = '';
        await sendMessage(newMessage);
    } catch (error: any) {
        console.error('Error sending message:', error);
    }
}

async function handleMessageButtonClick({ buttonName, role, messageId }: { buttonName: string, role: string, messageId: string }) {
    // kiểm tra return ngay nếu currentDialogueMessages chỉ có 1 bản ghi và role lại là assitant
    if (currentDialogueMessages.value.length === 1 && role === 'assistant') {
        return;
    }

    if (latestMessageId.value !== messageId) {
        return;
    }

    switch (buttonName) {
        case 'pencil':
            console.log('pencil');
            break;
        case 'replay':
            db.DialogueMessages.removeOne({ id: messageId });
            const messageLatestOfUser = db.DialogueMessages.findOne({
                role: 'user'
            }, {
                sort: {
                    createdAt: -1
                }
            })?.content
            // const messageLatestOfUser2 = db.DialogueMessages.findOne({
            //     id: latestMessageId.value
            // })?.content
            // console.log(messageLatestOfUser, messageLatestOfUser2);
            await sendMessage(messageLatestOfUser as string);
            break;
        case 'delete':
            db.DialogueMessages.removeOne({ id: messageId });
            break;
    }
}

watchEffect((onCleanup) => {
    if (currentDialogue.value?.id) {
        const cursor = db.DialogueMessages.find({
            dialogueId: currentDialogue.value.id,
            role: { $in: ['user', 'assistant'] }
        }, {
            sort: {
                createdAt: 1
            }
        })
        currentDialogueMessages.value = cursor.fetch() as DialogueMessage[];
        // console.log(currentDialogueMessages.value);
        onCleanup(() => cursor.cleanup())
    }
})


onMounted(() => {
    setTimeout(() => {
        if (screenPayload.value?.id) {
            currentCharacter.value = db.CharacterCards.findOne({
                id: screenPayload.value.id,
            }) as CharacterCard;
            if (currentCharacter.value?.id) {
                imageFile.value = currentCharacter.value?.getImageFile?.() as File;
            }
            currentUser.value = db.UserProfiles.findOne({}) as UserProfile;
            const dialogue = db.Dialogues.findOne({ id: screenStore.screenPayload?.id });
            if (dialogue) {
                currentDialogue.value = dialogue;
            }
            currentLLMModel.value = db.LLMModels.findOne({ isDefault: true }) as LLMModel;
        }
    }, 100);
})
</script>

<style scoped>
.prose {
    line-height: 1.75;
}

.prose p {
    margin-bottom: 1.25em;
}
</style>
