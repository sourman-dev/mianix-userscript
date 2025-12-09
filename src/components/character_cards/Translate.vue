<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Translate Character</h1>
      <Button
        label="Character List"
        icon="pi pi-arrow-left"
        @click="screenStore.setScreen(SCREENS.CHARACTER_LIST)"
      />
    </div>

    <Accordion :active-index="1">
      <AccordionTab header="General Info">
        <div class="card">
          <div class="flex flex-wrap items-center gap-6 p-4">
            <CharacterAvatar v-if="character.getImageFile()" :src="character.getImageFile()" :is-circle="false" :is-nsfw="character.isNSFW" class="w-32" />
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <label for="use-translated">Use Translated Data:</label>
                <ToggleSwitch id="use-translated" v-model="character.isUseTranslated" />
              </div>
              <div class="flex items-center gap-2">
                <label for="is-nsfw">Is NSFW:</label>
                <ToggleSwitch id="is-nsfw" v-model="character.isNSFW" />
              </div>
            </div>
            <SaveButton ref="saveButton1" @click="handleGeneralInfoSave" class="ml-auto" />
          </div>
        </div>
      </AccordionTab>
      <AccordionTab header="Translate">
        <div class="card">
          <div class="mb-4">
              <label for="field-select" class="block text-sm font-medium text-gray-700 mb-2">Select Property to Edit</label>
              <Select id="field-select" v-model="selectedField" :options="keyItems" placeholder="Select a property" class="w-full md:w-1/4" />
          </div>

          <div v-if="selectedField" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Original Data -->
              <div class="space-y-4">
                  <h2 class="text-xl font-semibold">Original</h2>
                  <Textarea v-model="originalValue" rows="10" class="w-full font-mono" />
                  <div class="flex gap-2">
                      <SaveButton ref="saveButton2" @click="handleSave('original')" />
                      <Button severity="help" label="Translate" icon="pi pi-language" @click="handleTranslate" :loading="isTranslating" :disabled="!isReadyTranslate" />
                      <LLMProviderSelect severity="warn" :button-props="{icon: 'pi pi-android'}" />
                  </div>
              </div>

              <!-- Translated Data -->
              <div class="space-y-4">
                  <h2 class="text-xl font-semibold">Translated</h2>
                  <Textarea v-model="translatedValue" rows="10" class="w-full font-mono" />
                  <div class="flex gap-2">
                      <SaveButton ref="saveButton3" @click="handleSave('translated')" />
                      <Button label="Clear" icon="pi pi-trash" severity="danger" @click="handleClear" />
                  </div>
              </div>
          </div>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Accordion from 'primevue/accordion';
import AccordionTab from 'primevue/accordiontab';
import ToggleSwitch from 'primevue/toggleswitch';
import CharacterAvatar from './CharacterAvatar.vue';
import { useScreenStore } from '@/stores/screen';
import { useResourcesStore } from '@/stores/resources';
import { SCREENS } from '@/constants';
import { db, CharacterCard, LLMModel } from '@/db';
import type { CharacterCardData } from '@/types/character';
import SaveButton from '@/components/common/SaveButton.vue';
import LLMProviderSelect from '@/components/common/LLMProviderSelect.vue';
import { storeToRefs } from 'pinia';
import { sendOpenAiRequestStream, OpenAIOptions } from '@/utils/llm';

const screenStore = useScreenStore();
const resourcesStore = useResourcesStore()

const character = ref<CharacterCard>(new CharacterCard({}));
const selectedField = ref<keyof CharacterCardData | null>(null);
const isTranslating = ref(false);

const originalValue = ref('');
const translatedValue = ref('');
const {translatePrompt} = storeToRefs(resourcesStore);
const defaultLLMModel = ref<LLMModel>();
const saveButton1 = ref<InstanceType<typeof SaveButton> | null>(null);
const saveButton2 = ref<InstanceType<typeof SaveButton> | null>(null);
const saveButton3 = ref<InstanceType<typeof SaveButton> | null>(null);
const isReadyTranslate = computed(() => {
  return translatePrompt.value !== '' && (defaultLLMModel.value && defaultLLMModel.value.id !== '');
})

const keyItems = computed(() => {
  if (!character.value.data) return [];
  const keysSkip = ['tags'];
  const flattenedKeys: string[] = [];

  Object.keys(character.value.data).forEach(key => {
    if (keysSkip.includes(key)) return;

    const value = character.value.data[key as keyof CharacterCardData];

    if (Array.isArray(value)) {
      value.forEach((_, index) => {
        flattenedKeys.push(`${key}|${index}`);
      });
    } else if (value !== null && value !== undefined && value !== '') {
      flattenedKeys.push(key);
    }
  });

  return flattenedKeys;
});

watch(selectedField, (newField) => {
    if (!newField) return;

    let original: any;
    let translated: any;

    if (newField.includes('|')) {
        const [key, indexStr] = newField.split('|');
        const index = parseInt(indexStr, 10);
        original = character.value.data[key as keyof CharacterCardData]?.[index];
        translated = character.value.dataTranslated?.[key as keyof CharacterCardData]?.[index];
    } else {
        original = character.value.data[newField as keyof CharacterCardData];
        translated = character.value.dataTranslated?.[newField as keyof CharacterCardData];
    }

    originalValue.value = typeof original === 'object' ? JSON.stringify(original, null, 2) : String(original || '');
    translatedValue.value = typeof translated === 'object' ? JSON.stringify(translated, null, 2) : String(translated || '');
});

onMounted(async () => {
  const characterId = screenStore.screenPayload?.id as string;
  if (characterId) {
    const card = db.CharacterCards.findOne({id: characterId}) as CharacterCard;
    if (card) {
      character.value = card;
      if (!character.value.dataTranslated) {
        character.value.dataTranslated = {};
      }
    }
  }

  const defaultModel = db.LLMModels.findOne({isDefault: true}) as LLMModel;
  if (defaultModel) {
    defaultLLMModel.value = defaultModel;
  }
});

const handleTranslate = async () => {
  try {
    if (!selectedField.value || !defaultLLMModel.value) return;
    isTranslating.value = true;
    // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    const options: OpenAIOptions = {
      baseURL: defaultLLMModel.value?.baseUrl as string,
      apiKey: defaultLLMModel.value?.apiKey || '',
      data: {
        model: defaultLLMModel.value?.modelName || '',
        messages: [
          {
            role: 'system',
            content: translatePrompt.value
          },
          {
            role: 'user',
            content: originalValue.value
          }
        ],
        stream: true
      }
    };
    // Replace with actual translation logic
    // translatedValue.value = `${originalValue.value} (Translated)`;
    await sendOpenAiRequestStream(options, (chunk: string) => {
      // console.log(chunk);
      translatedValue.value += chunk;
    });
    isTranslating.value = false;
  } catch (error) {
    console.error('Translation error:', error);
  } finally {
    isTranslating.value = false;
  }
};

const handleSave = async (type: 'original' | 'translated') => {
    if (!selectedField.value) return;

    const field = selectedField.value;
    const characterId = character.value.id;
    let valueToSave: any = type === 'original' ? originalValue.value : translatedValue.value;

    try {
        // Remove markdown code block if present
        let cleanValue = valueToSave.trim();
        if (cleanValue.startsWith('```json\n')) {
            cleanValue = cleanValue.substring('```json\n'.length);
            if (cleanValue.endsWith('```')) {
                cleanValue = cleanValue.substring(0, cleanValue.length - 3);
            }
        }
        // Try to parse if it's a JSON string
        valueToSave = JSON.parse(cleanValue);
    } catch (e) {
        // Not a valid JSON, save as string
        console.warn('Failed to parse JSON:', e);
    }

    const updateNestedValue = (obj: any, path: string, value: any) => {
        if (path.includes('|')) {
            const [key, indexStr] = path.split('|');
            const index = parseInt(indexStr, 10);
            if (!obj[key]) obj[key] = [];
            obj[key][index] = value;
        } else {
            obj[path] = value;
        }
    };

    if (type === 'original') {
        const updatedData = JSON.parse(JSON.stringify(character.value.data));
        updateNestedValue(updatedData, field, valueToSave);

        await db.CharacterCards.updateOne(
            { id: characterId },
            { $set: { data: updatedData } }
        );
        
        updateNestedValue(character.value.data, field, valueToSave);
        saveButton2.value?.showSuccess();
    } else {
        const updatedTranslated = JSON.parse(JSON.stringify(character.value.dataTranslated || {}));
        updateNestedValue(updatedTranslated, field, valueToSave);

        db.CharacterCards.updateOne(
        { id: characterId },
        { $set: { dataTranslated: updatedTranslated } }
      );
        
        if (!character.value.dataTranslated) character.value.dataTranslated = {};
        updateNestedValue(character.value.dataTranslated, field, valueToSave);
        saveButton3.value?.showSuccess();
    }
};

const handleGeneralInfoSave = async () => {
    // Extract primitive values to avoid DataCloneError
    const characterId = character.value.id;
    const isUseTranslated = Boolean(character.value.isUseTranslated);
    const isNSFW = Boolean(character.value.isNSFW);

    await db.CharacterCards.updateOne(
      { id: characterId },
      { $set: { isUseTranslated, isNSFW } }
    );

    saveButton1.value?.showSuccess();
};

const handleClear = () => {
    translatedValue.value = '';
};
</script>

<style scoped>
@reference "@/style.css";
.card {
    @apply p-6 bg-white rounded-lg shadow;
}
</style>