<template>
  <Dialog
    :visible="useModal.isModalOpen"
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
      <Button label="Extractor" icon="pi pi-cog" class="w-full" @click="onExtract" />
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
import { useModalStore } from '@/stores/modal';

const useModal = useModalStore();
const { modalData } = storeToRefs(useModal);

const extractorName = ref('');
const selectedField = ref(null);
const selectOptions = ref([]); // [{ label: 'Property 1', value: 'property1' }, ...]
const resultText = ref('');

const emit = defineEmits(['save-character']);

function onExtract() {
  // Logic để thực hiện extract
}
function handleSave() {
  emit('save-character', {
    extractorName: extractorName.value,
    selectedField: selectedField.value,
    resultText: resultText.value
  });
  closeModal();
}
function closeModal() {
  extractorName.value = '';
  selectedField.value = null;
  resultText.value = '';
  useModal.closeModal();
}
</script>