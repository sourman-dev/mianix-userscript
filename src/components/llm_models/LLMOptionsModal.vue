<template>
  <div>
    <Button icon="pi pi-android" :class="['p-button-rounded p-button-text', props.classExt]" @click="visible = true" @hide="resetOptions" />

    <Dialog v-model:visible="visible" modal header="LLM Options" :style="{ width: '50vw' }"
      :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
      <form class="space-y-4">
        <div class="space-y-4">
          <div class="field">
            <label for="model" class="block">Model</label>
            <LLMProviderSelect severity="help" class="w-full" :noDisplaySelected="false" />
          </div>

          <div class="field">
            <label for="top_p" class="block">Top P: {{ options.top_p }}</label>
            <Slider id="top_p" v-model="options.top_p" :min="0" :max="1" :step="0.01" class="w-full" />
          </div>

          <div class="field">
            <label for="temperature" class="block">Temperature: {{ options.temperature }}</label>
            <Slider id="temperature" v-model="options.temperature" :min="0" :max="2" :step="0.01" class="w-full" />
          </div>

          <div class="field">
            <label for="maxTokens" class="block">Max Tokens: {{ options.maxTokens }}</label>
            <Slider id="maxTokens" v-model="options.maxTokens" :min="1000" :max="4096" :step="100" class="w-full" />
          </div>

          <div class="field">
            <label for="contextWindow" class="block">Context Window: {{ options.contextWindow }}</label>
            <Slider id="contextWindow" v-model="options.contextWindow" :min="1000" :max="8192" :step="100" class="w-full" />
          </div>

          <div class="field">
            <label for="responseLength" class="block">Response Length: {{ options.responseLength }}</label>
            <Slider id="responseLength" v-model="options.responseLength" :min="300" :max="3000" :step="100" class="w-full" />
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <Button label="Reset" severity="secondary" size="small" @click="resetOptions" />
          <SaveButton size="small" @click="handleSave" />
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Slider from 'primevue/slider';
import SaveButton from '@/components/common/SaveButton.vue';
import LLMProviderSelect from '@/components/common/LLMProviderSelect.vue';
import { LLMOptions } from '@/db';

const props = defineProps<{
  init: LLMOptions;
  classExt?: string;
}>();

const emit = defineEmits<{
  (e: 'save', options: LLMOptions): void;
}>();

const visible = ref(false);
const options = ref<LLMOptions>({ ...props.init });

watch(
  () => props.init,
  (newInit) => {
    options.value = { ...newInit };
  },
  { deep: true }
);

const resetOptions = () => {
  options.value = { ...props.init };
};

const handleSave = () => {
  emit('save', options.value);
  visible.value = false;
};
</script>