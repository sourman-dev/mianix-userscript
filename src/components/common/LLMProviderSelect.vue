<template>
    <div class="card flex justify-center">
        <Select v-model="selectedProviderId" :options="llm_providers" optionLabel="name" optionValue="id" placeholder="Chọn nhà cung cấp" class="w-full md:w-56" />
    </div>
</template>

<script setup lang="ts">
import { db, LLMModel } from "@/db";
import { ref, onMounted, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue']);

const selectedProviderId = ref(props.modelValue);
const llm_providers = ref<Partial<LLMModel>[]>([]);

watch(selectedProviderId, (newValue) => {
  emit('update:modelValue', newValue);
});

watch(() => props.modelValue, (newValue) => {
  selectedProviderId.value = newValue;
});

onMounted(async () => {
    llm_providers.value = db.LLMModels.find({}, {
      fields: {id: 1, name: 1, isDefault: 1}
    }).fetch() as Partial<LLMModel>[];
    // llm_providers.value = providers.map((provider) => ({
    //     name: provider.name,
    //     id: provider.id,
    // }));
    if (!selectedProviderId.value) {
      selectedProviderId.value = llm_providers.value.find(p => p.isDefault)?.id || llm_providers.value[0]?.id || '';
    }
})
</script>