<template>
  <Dialog
    :visible="useModal.isModalOpen(MODALS.EXTRACTOR_CHARACTER)"
    @update:visible="(value) => { if (!value) closeModal() }"
    @hide="closeModal"
    modal
    header="Extractor Character"
    :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '95vw' }"
  >
    <div class="flex flex-col gap-4">
      <div>
        <label for="extractor-name" class="block text-sm font-medium text-gray-700 mb-1">Extractor Name</label>
        <InputText id="extractor-name" v-model="extractorName" class="w-full" />
      </div>
      <Button label="Extractor" :loading="isExtracting" :disabled="!extractorName || !characterId" icon="pi pi-question-circle" class="w-full" @click="onExtract" />
      <Fieldset legend="Result">
        <div class="flex flex-col gap-3">
          <div>
            <label for="result-select" class="block text-sm font-medium text-gray-700 mb-1">Select Property</label>
            <Select id="result-select" v-model="selectedField" :options="selectOptions" placeholder="Select a property" class="w-full md:w-1/3" />
          </div>
          <Textarea v-model="resultText" rows="8" class="w-full font-mono" />
        </div>
      </Fieldset>
    </div>
    <template #footer>
      <div class="flex justify-between w-full gap-2">
        <Button label="Cancel" severity="secondary" @click="closeModal" />
        <SaveButton @click="handleSave" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Fieldset from 'primevue/fieldset';
import SaveButton from '@/components/common/SaveButton.vue';
import { MODALS } from '@/constants';
import { useModalStore } from '@/stores/modal';
import { CharacterCard, db, LLMModel } from '@/db';
import { useResourcesStore } from '@/stores/resources';
import { OpenAIOptions, sendOpenAiRequestStream } from '@/utils/llm';
import { useDialogueStore } from '@/stores/dialogue';

const useModal = useModalStore();
const { modalData } = storeToRefs(useModal);
const dialogueStore = useDialogueStore();
const { chatHistoryForPrompt } = storeToRefs(dialogueStore);
const extractorName = ref('');
const selectedField = ref(null);
const selectOptions = ref([]); // [{ label: 'Property 1', value: 'property1' }, ...]
const resultText = ref('');
const isExtracting = ref(false);
const resourcesStore = useResourcesStore();

const emit = defineEmits<{
  'save-character': (character: CharacterCard) => void;
}>();


const props = defineProps({
  characterId: { type: String, required: true },
});

async function onExtract() {
  try {
    if(!props.characterId) return;
    if(extractorName.value.length == 0) return;
    const llmModel = db.LLMModels.findOne({ isDefault: true }) as LLMModel;
    if(!llmModel) return;
    if(chatHistoryForPrompt.value.length == 0) return;
    isExtracting.value = true;
    
    let extractorPrompt = resourcesStore.extractorCharacterPrompt.replace(/{{character_name_to_extract}}/g, extractorName.value);
    extractorPrompt = extractorPrompt.replace(/{{history_chat}}/g, chatHistoryForPrompt.value);
    console.log(extractorPrompt);
    const options: OpenAIOptions = {
            baseURL: llmModel.baseUrl,
            apiKey: llmModel.apiKey,
            data: {
                model: llmModel.modelName,
                messages: [
                    { role: 'user', content: extractorPrompt },
                ],
                stream: true,
                temperature: 0.2,
                top_p: 0.1,
            }
        };
        resultText.value = '';
        await sendOpenAiRequestStream(options, (chunk: string) => {
            resultText.value += chunk;
        });
        isExtracting.value = false;
  } catch (error) {
    console.error(error);
  } finally{
    isExtracting.value = false;
  }
}
function handleSave() {
  closeModal();
}
function closeModal() {
  extractorName.value = '';
  selectedField.value = null;
  resultText.value = '';
  useModal.closeModal();
}
</script>