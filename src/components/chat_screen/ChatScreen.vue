<template>
    <div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans w-full">
        <!-- Header -->
        <header
            class="flex-shrink-0 p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="flex items-center self-start sm:self-center space-x-3 w-full">
                    <CharacterAvatar v-if="imageFile" :src="imageFile" :is-circle="true" :is-nsfw="currentCharacter?.isNSFW" class="w-12 h-12" />
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ currentCharacter?.data?.name }}
                        </h1>
                        <div class="flex items-center justify-between">
                            <div class="flex justify-between w-full">
                                <div class="flex items-center space-x-1">
                                    <LLMOptionsModal v-if="dialogueStore.currentDialogue?.llmOptions"
                                        :init="dialogueStore.currentLLMOptions[dialogueStore.currentDialogue?.id]"
                                        @save="handleChangeLLMOptions" />
                                </div>

                                <div class="flex items-center space-x-1">
                                    <Button v-tooltip.bottom="'Xóa cuộc trò chuyện'" icon="pi pi-trash"
                                        severity="danger" text rounded size="small" @click="handleRemoveDialogue" />
                                </div>
                                <div class="flex items-center space-x-1">
                                    <Button v-tooltip.bottom="'Trích xuất nhân vật'" icon="pi pi-users" severity="help"
                                        text rounded size="small"
                                        @click="modalStore.openModal(MODALS.EXTRACTOR_CHARACTER)" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </header>

        <!-- Chat/Story Area -->
        <main ref="chatContainer" class="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div class="prose prose-invert max-w-none">
                <!-- Vấn đề 1: Luôn hiển thị lời chào đầu tiên
                <div v-if="firstGreeting" class="flex justify-start mb-4">
                    <div
                        class="p-3 sm:p-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 max-w-lg shadow-md">
                        <p v-html="firstGreeting" class="whitespace-pre-wrap"></p>
                    </div>
                </div> -->

                <!-- Lặp qua các node trong nhánh hiện tại -->
                <div v-for="node in currentMessagesForDisplay" :key="node.id" class="space-y-4 mb-4">
                    <!-- User message bubble -->
                    <div v-if="node.userInput" class="flex justify-end">
                        <div
                            class="p-3 sm:p-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 max-w-lg shadow-md message-bubble">
                            <p class="whitespace-pre-wrap" v-html="formatMessage(node.userInput)"></p>
                            <MessageButtons :role="'user'" :messageId="node.id"
                                :latestMessageId="dialogueStore.currentDialogue?.currentNodeId" :status="node.status"
                                @button-click="handleMessageButtonClick" />
                        </div>
                    </div>

                    <!-- Assistant message bubble -->
                    <div v-if="node.assistantResponse" class="flex justify-start">
                        <div
                            class="p-3 sm:p-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 max-w-lg shadow-md message-bubble">
                            <p v-html="formatMessage(node.assistantResponse)" class="whitespace-pre-wrap"></p>

                            <!-- Token statistics display -->
                            <TokenStatsDisplay :token-stats="node.tokenStats" />

                            <MessageButtons :role="'assistant'" :messageId="node.id"
                                :latestMessageId="dialogueStore.currentDialogue?.currentNodeId" :status="node.status"
                                @button-click="handleMessageButtonClick" />
                        </div>
                    </div>
                </div>



                <div v-if="isSending">
                    <!-- Vấn đề 2: Hiển thị lại userInput khi đang regenerate -->
                    <!-- <div v-if="regeneratingInput" class="flex justify-end group relative mb-4">
                        <div class="p-3 sm:p-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 max-w-lg shadow-md message-bubble">
                            <p class="whitespace-pre-wrap">{{ regeneratingInput }}</p>
                        </div>
                    </div> -->
                    <!-- Hiển thị phản hồi đang stream của LLM -->
                    <div class="flex justify-start">
                        <div
                            class="p-3 sm:p-4 rounded-lg mb-4 max-w-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 shadow-md">
                            <!-- Hiệu ứng loading -->

                            <div v-if="!llmResponse" class="flex items-center space-x-2">
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                                    style="animation-delay: 0.2s;">
                                </div>
                                <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                                    style="animation-delay: 0.4s;">
                                </div>
                            </div>
                            <p v-else v-html="formatMessage(llmResponse)" class="whitespace-pre-wrap"></p>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer
            class="flex-shrink-0 p-2 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
            <div class="flex items-center space-x-2 sm:space-x-4">
                <Textarea v-model="userInput" placeholder="Type a message..." autoResize rows="1"
                    class="flex-1 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-purple-500 focus:border-purple-500"
                    @keydown.enter.exact.prevent="handleSendMessage" />
                <SplitButton :disabled="isSending || suggestedPromptItems.length <= 0 && !userInput.trim()"
                    @click="handleSendMessage" v-tooltip.top="'Send'" icon="pi pi-send" :loading="isSending"
                    :model="suggestedPromptItems" />
            </div>
            <div class="flex items-center justify-center space-x-2 mt-4">
                <SelectButton v-model="selectedMoreMode" :options="moreModeItems" optionLabel="value" dataKey="value"
                    aria-labelledby="Hướng dẫn phản hồi" size="small">
                    <template #option="slotProps">
                        <i :class="slotProps.option.icon"></i>
                    </template>
                </SelectButton>
            </div>
        </footer>
        <EditMessageModal @save-message="handleEditMessageModal" />
        <ExtractorCharacterModal :characterId="currentCharacter?.id || ''" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import CharacterAvatar from '@/components/character_cards/CharacterAvatar.vue';
import MessageButtons from './MessageButtons.vue';
import TokenStatsDisplay from '@/components/token_stats/TokenStatsDisplay.vue';
import EditMessageModal from './EditMessageModal.vue';
import ExtractorCharacterModal from './ExtractorCharacterModal.vue';
import { useScreenStore } from '@/stores/screen';
import { useResourcesStore } from '@/stores/resources';
import { useDialogueStore } from '@/stores/dialogue';
import { useModalStore } from '@/stores/modal';
import { CharacterCard, db, LLMModel, UserProfile } from '@/db';
import { formatMessageContent } from '@/utils/msg-process';
import { buildFinalPrompt } from '@/utils/prompt-utils';
import { OpenAIOptions } from '@/utils/llm';
import { sendOpenAiRequestFetchStream } from '@/utils/llm-fetch'; // 🔧 Use native fetch for streaming
import { SCREENS, MODALS } from '@/constants';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm';
import LLMOptionsModal from '@/components/llm_models/LLMOptionsModal.vue';
import { parseLLMResponse } from '@/utils/response-parser';
import { deleteMemoriesForCharacter } from '@/utils/memory-cleanup'; // 🗑️ Memory cleanup

const screenStore = useScreenStore();
const resourcesStore = useResourcesStore();
const dialogueStore = useDialogueStore();
const modalStore = useModalStore();

const { screenPayload } = storeToRefs(screenStore);
const { currentMessagesForDisplay, chatHistoryForPrompt } = storeToRefs(dialogueStore);

const currentCharacter = ref<CharacterCard | null>(null);
const currentUser = ref<UserProfile | null>(null);
const currentLLMModel = ref<LLMModel | null>(null);
const selectedMoreMode = ref<{ icon: string, value: string }>();
const moreModeItems = ref([
    { icon: 'pi pi-arrow-right', value: 'Hãy phát triển cốt truyện tiếp theo, làm cho câu chuyện thú vị và hấp dẫn hơn' },
    { icon: 'pi pi-book', value: 'Góc nhìn Tiểu thuyết' },
    { icon: 'pi pi-user-plus', value: 'Góc nhìn Nhân vật chính' },
    { icon: 'pi pi-video', value: 'Vui lòng thêm mô tả cảnh vật và chi tiết môi trường để tăng cường không khí câu chuyện.' },
]);
// const suggestedPrompts = ref<string[]>([]); // Thêm ref để lưu gợi ý

const suggestedPromptItems = computed(() => {
    const suggestedPrompts = dialogueStore.suggestedPrompts[currentCharacter.value?.id || ''];
    return suggestedPrompts ? suggestedPrompts.map((prompt) => ({
        label: prompt,
        command: () => {
            userInput.value = prompt;
            handleSendMessage();
        }
    })) : [];
});

const userInput = ref('');
const llmResponse = ref('');
const isSending = ref(false);
const imageFile = ref<File | null>(null);
const chatContainer = ref<HTMLElement | null>(null);
const firstGreeting = ref<string | null>(null);
const { confirmDelete } = useDeleteConfirm();
const regeneratingInput = ref<string | null>(null);

const formatMessage = (content: string): string => formatMessageContent(content);

const scrollToBottom = () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    });
};


const handleChangeLLMOptions = (llmOptions: any) => {
    if (!currentCharacter.value) return;
    dialogueStore.updateLLMOptions(currentCharacter.value.id, llmOptions);
}

const handleRemoveDialogue = () => {
    if (!currentCharacter.value) return;
    const info = {
        id: currentCharacter.value.id,
        name: currentCharacter.value.data?.name || 'Unknown',
    };
    confirmDelete(info, {
        message: `Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện với "${info.name}" không? Hành động này không thể hoàn tác.`,
        header: 'Xóa cuộc trò chuyện',
        onConfirm: (info) => {
            // 🗑️ Xóa memories trước (giải phóng bộ nhớ)
            const deletedMemories = deleteMemoriesForCharacter(info.id);
            console.log(`🗑️ Deleted ${deletedMemories} memories`);

            // Xóa messages và dialogue
            db.DialogueMessages.removeMany({ dialogueId: info.id });
            db.Dialogues.removeOne({ id: info.id });
            dialogueStore.suggestedPrompts[info.id] = [];

            // Navigate back
            screenStore.setScreen(SCREENS.CHARACTER_LIST);
        }
    });
};

const sendRequestToLLM = async (promptMessage: string) => {
    try {
        currentLLMModel.value = db.LLMModels.findOne({ isDefault: true }) as LLMModel | null;
        if (!currentLLMModel.value || !currentCharacter.value) return '';
        const llmOptions = dialogueStore.currentLLMOptions[currentCharacter.value.id];

        // 🆕 Lấy ký ức liên quan từ store (đã được chuẩn bị trước)
        const relevantMemories = dialogueStore.relevantMemories;

        const { systemPrompt, userPrompt } = await buildFinalPrompt(
            currentCharacter.value,
            chatHistoryForPrompt.value as string,
            promptMessage,
            currentUser.value || { name: 'Anonymous' },
            {
                multiModePrompt: resourcesStore.multiModePrompt,
                multiModeChainOfThoughtPrompt: resourcesStore.multiModeChainOfThoughtPrompt,
                outputStructureSoftGuidePrompt: resourcesStore.outputStructureSoftGuidePrompt,
                outputFormatPrompt: resourcesStore.outputFormatPrompt,
            },
            selectedMoreMode.value?.value,
            llmOptions?.responseLength,
            relevantMemories, // 🆕 Truyền ký ức vào prompt
            {
                limit: 5,                // Max worldbook entries
                semanticThreshold: 0.5,  // Min similarity
                useSemanticSearch: true, // Enable hybrid retrieval
                characterId: currentCharacter.value.id,
            }
        );

        isSending.value = true;
        llmResponse.value = '';
        regeneratingInput.value = promptMessage;
        // console.info('Sending request to LLM with System Prompt \n:', systemPrompt);
        console.info('Sending request to LLM with User Prompt \n:', userPrompt);

        const options: OpenAIOptions = {
            baseURL: currentLLMModel.value.baseUrl,
            apiKey: currentLLMModel.value.apiKey,
            data: {
                model: currentLLMModel.value.modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                stream: true,
                temperature: llmOptions?.temperature || 0.8,
                top_p: llmOptions?.top_p || 0.9,
            }
        };

        await sendOpenAiRequestFetchStream(options, (chunk: string) => {
            llmResponse.value += chunk;
            scrollToBottom();
        });

        const finalResponse = llmResponse.value;

        return finalResponse;
    } catch (error) {

    } finally {
        regeneratingInput.value = null;
        llmResponse.value = '';
        isSending.value = false;
    }
}

// Thêm helper function này vào script setup
const handleAIResponse = (aiResponseRaw: string, nodeId: string) => {
    if (!aiResponseRaw) {
        dialogueStore.markAsFailed(nodeId);
        return;
    }

    const parsed = parseLLMResponse(aiResponseRaw);
    console.info('AI response:', parsed);

    // // Cập nhật UI với các gợi ý mới
    // suggestedPrompts.value = parsed.nextPrompts;
    // Cập nhật gợi ý cho character hiện tại
    dialogueStore.suggestedPrompts[currentCharacter.value?.id || ''] = parsed.nextPrompts;

    // Chỉ lưu nội dung chính vào cây hội thoại
    if (parsed.mainContent) {
        dialogueStore.updateAIResponse(nodeId, parsed.mainContent);
    } else {
        dialogueStore.markAsFailed(nodeId);
    }
};

// Cập nhật handleSendMessage
const handleSendMessage = async () => {
    if (isSending.value || !userInput.value.trim()) return;

    const newUserInput = userInput.value;
    userInput.value = ''; // Clear input field immediately

    // 🆕 BƯỚC 0: Chuẩn bị context - Tìm ký ức liên quan
    await dialogueStore.prepareContext(newUserInput);

    // 🆕 BƯỚC 1: Thêm user input với status pending ngay lập tức
    const pendingNodeId = dialogueStore.addInput(newUserInput);

    if (!pendingNodeId) {
        console.error('❌ Failed to add user input');
        return;
    }

    try {
        // 🆕 BƯỚC 2: Gửi request đến AI
        const aiResponseRaw = await sendRequestToLLM(newUserInput);
        if (aiResponseRaw) {
            handleAIResponse(aiResponseRaw, pendingNodeId);

            // 🆕 BƯỚC 3: Trích xuất ký ức từ cuộc hội thoại (chạy ngầm)
            dialogueStore.handlePostResponseProcess(newUserInput, aiResponseRaw, pendingNodeId);
        }
    } catch (error) {
        console.error('❌ AI request failed:', error);
        dialogueStore.markAsFailed(pendingNodeId);
    }
};

//Cập nhật handleEditMessageModal
function handleEditMessageModal(messageId: string, content: string, isAssistant: boolean) {
    dialogueStore.updateMessage(messageId, content, isAssistant);
}

// Cập nhật handleMessageButtonClick
async function handleMessageButtonClick({ buttonName, role, messageId }: { buttonName: string, role: string, messageId: string }) {
    if (dialogueStore.currentDialogue?.currentNodeId !== messageId) {
        return;
    }

    if (buttonName === 'edit') {
        const currentMessage = db.DialogueMessages.findOne({ id: messageId });
        if (currentMessage) {
            modalStore.openModal(MODALS.EDIT_MESSAGE, {
                id: currentMessage.id,
                content: role === 'assistant' ? currentMessage.assistantResponse : currentMessage.userInput,
                isAssistant: role === 'assistant',
            })
        }
    }

    if (buttonName === 'delete') {
        if (role === 'assistant') {
            dialogueStore.retryMessage(messageId);
        } else {
            dialogueStore.regenerate();
        }
    }

    if (buttonName === 'replay') {
        const userInput = dialogueStore.retryMessage(messageId);
        if (userInput) {
            try {
                // 🆕 Chuẩn bị context trước khi retry
                await dialogueStore.prepareContext(userInput);

                const aiResponseRaw = await sendRequestToLLM(userInput);
                if (aiResponseRaw) {
                    handleAIResponse(aiResponseRaw, messageId);

                    // 🆕 Trích xuất ký ức sau khi retry thành công
                    dialogueStore.handlePostResponseProcess(userInput, aiResponseRaw, messageId);
                }
            } catch (error) {
                console.error('❌ Retry failed:', error);
                dialogueStore.markAsFailed(messageId);
            }
        }
    }
}

watch(currentMessagesForDisplay, () => {
    scrollToBottom();
}, { deep: true });

onMounted(async () => {
    setTimeout(() => {
        const characterId = screenPayload.value?.id as string;
        if (characterId) {
            dialogueStore.loadDialogue(characterId);

            currentCharacter.value = db.CharacterCards.findOne({ id: characterId }) as CharacterCard | null;
            if (currentCharacter.value) {
                imageFile.value = currentCharacter.value.getImageFile() || null;
                currentCharacter.value.getData();
                const greeting = currentCharacter.value.getGreeting();
                if (greeting) {
                    firstGreeting.value = formatMessageContent(greeting);
                }
            }

            // Load profile từ dialogue (nếu có)
            const dialogue = dialogueStore.currentDialogue as any; // Type assertion for profileId
            if (dialogue?.profileId) {
                currentUser.value = db.UserProfiles.findOne({ id: dialogue.profileId }) as UserProfile | null;
                console.log('✅ Loaded profile for dialogue:', currentUser.value?.name);
            } else {
                // Fallback: Lấy profile đầu tiên (backward compatibility)
                currentUser.value = db.UserProfiles.findOne({}) as UserProfile | null;
                console.warn('⚠️ No profileId in dialogue, using first available profile');
            }
        }
    }, 100);
});
</script>

<style scoped>
.prose {
    line-height: 1.75;
}

.prose p {
    margin-bottom: 0;
}

/* 🆕 CSS MỚI CHO BUBBLE VÀ BUTTONS */

/* Container của bubble cần có position relative */
.message-bubble {
    position: relative;
    /* Thêm padding-bottom để chữ không bị các nút che mất */
    padding-bottom: 10px !important;
    /* Khoảng 2.25rem */
}
</style>