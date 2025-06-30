<template>
  <SplitButton v-if="!noDisplaySelected" :label="selectedName" :buttonProps="buttonProps" :model="llm_providers" size="small"></SplitButton>
  <SplitButton v-else :buttonProps="buttonProps" :model="llm_providers" size="small"></SplitButton>
</template>

<script setup lang="ts">
import { db, LLMModel } from "@/db";  
import { ref, onMounted, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  noDisplaySelected: {
    type: Boolean,
    default: true,
  },
  buttonProps: {
    type: Object,
    default: () => ({}),
  }
});

const emit = defineEmits(['update:modelValue']);
const selectedName = ref('');

const selectedProviderId = ref(props.modelValue);
const llm_providers = ref(<{ label: string | undefined; icon: string; command: () => void; }[]>[]);

watch(selectedProviderId, (newValue) => {
  emit('update:modelValue', newValue);
});

watch(() => props.modelValue, (newValue) => {
  selectedProviderId.value = newValue;
});

function loadData() {
  llm_providers.value = (db.LLMModels.find({}, {

    fields: { id: 1, name: 1, isDefault: 1 }
  }).fetch() as Partial<LLMModel>[]).map((provider) => ({
    label: provider.name,
    icon: provider.isDefault ? 'pi pi-check' : '',
    command: () => {
      sessionStorage.setItem('selectedLLMModelId', provider.id || '');
      emit('update:modelValue', provider.id);
      db.LLMModels.updateOne({ id: provider.id }, {
        $set: {
          isDefault: true,
        }
      });
      db.LLMModels.updateMany({ id: { $ne: provider.id } }, {
        $set: {
          isDefault: false,
        }
      });
      loadData()
    }
  }));
  if(!props.noDisplaySelected){
    selectedName.value = llm_providers.value.find((provider) => provider.icon === 'pi pi-check')?.label || '';
  }
}

onMounted(async () => {
  setTimeout(() => {
    loadData();
  }, 100);
})
</script>