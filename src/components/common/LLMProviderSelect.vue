<template>
  <SplitButton icon="pi pi-prime" :model="llm_providers" size="small"></SplitButton>
</template>

<script setup lang="ts">
import { db, LLMModel } from "@/db";
import { MenuItem } from "primevue/menuitem";
import { ref, onMounted, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);

const selectedProviderId = ref(props.modelValue);
const llm_providers = ref<MenuItem[]>([]);

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
}

onMounted(async () => {
  setTimeout(() => {
    loadData();
  }, 100);
})
</script>