<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Password from 'primevue/password'
import AutoComplete from 'primevue/autocomplete'
import IftaLabel from 'primevue/iftalabel'
import ToggleSwitch from 'primevue/toggleswitch'
import { LLMModel } from '@/newDb'
import { useModalStore } from '@/stores/modal'
import { useResourcesStore } from '@/stores/resources'
import { sendOpenAiRequestSync } from '@/utils/llm'
// import { MODALS } from '@/constants'

// const MODAL_NAME = MODALS.LLM_MODEL

// No props needed - using modalData from store

const useModal = useModalStore()
const resourcesStore = useResourcesStore()
const { llmProviders_NameAndBaseUrl } = storeToRefs(resourcesStore)
const { modalData } = storeToRefs(useModal)
const loadingVerify = ref(false)
const loadingSave = ref(false)
const id = ref<string | null>(null)
const name = ref('')
const llmProvider = ref('')
const baseUrl = ref('')
const modelName = ref('')
const apiKey = ref('')
const selectedProvider = ref({
  name: '',
  baseUrl: '',
  models: [] as string[]
})
const filteredModels = ref<string[]>([])
const isVerified = ref(false)
const isDefault = ref(false)
const isSettingFromModal = ref(false)



// Set default provider and baseUrl on mount
onMounted(() => {
  setInitialProvider()
})
// Watch for llmProvider changes to auto-fill baseUrl and update selectedProvider
watch(llmProvider, (newProvider) => {
  if (isSettingFromModal.value) return // Skip if setting from modal data

  if (newProvider && llmProviders_NameAndBaseUrl.value) {
    const foundProvider = llmProviders_NameAndBaseUrl.value.find(provider => provider.name === newProvider)
    selectedProvider.value = foundProvider ?? { name: '', baseUrl: '', models: [] }
    if (selectedProvider.value) {
      baseUrl.value = selectedProvider.value.baseUrl
    }
    // Always reset modelName and apiKey when provider changes for new records
    modelName.value = ''
    apiKey.value = ''
  }
  updateName()
})
// Computed property to determine if this is edit mode
const isEditMode = computed(() => id.value !== null)

// Function to set initial provider and base URL
const setInitialProvider = () => {
  if (llmProviders_NameAndBaseUrl.value && llmProviders_NameAndBaseUrl.value.length > 0) {
    const firstProvider = llmProviders_NameAndBaseUrl.value[0]
    llmProvider.value = firstProvider.name
    baseUrl.value = firstProvider.baseUrl
    selectedProvider.value = firstProvider
    updateName()
  }
}

// Watch for modalData changes to populate form
watch(() => modalData.value, (newEditData) => {
  if (newEditData) {
    // Edit mode - populate form with existing data
    isSettingFromModal.value = true // Set flag to prevent other watchers from interfering

    id.value = newEditData.id
    name.value = newEditData.name
    llmProvider.value = newEditData.llmProvider
        // Set selectedProvider
    if (llmProviders_NameAndBaseUrl.value) {
      const foundProvider = llmProviders_NameAndBaseUrl.value.find(provider => provider.name === newEditData.llmProvider)
      selectedProvider.value = foundProvider ?? { name: '', baseUrl: '', models: [] }
    }
    baseUrl.value = newEditData.baseUrl
    modelName.value = newEditData.modelName
    apiKey.value = newEditData.apiKey
    isDefault.value = newEditData.isDefault
    nextTick(() => {
      isSettingFromModal.value = false // Reset flag after all fields are set
    })
  } else {
    // Add mode - reset form and set defaults
    resetForm()
  }
}, { immediate: true })

// Function to update name based on provider and modelName
const updateName = () => {
  if (llmProvider.value && modelName.value) {
    name.value = `${llmProvider.value}/${modelName.value}`
  } else if (llmProvider.value) {
    name.value = llmProvider.value
  } else {
    name.value = ''
  }
}



// Watch for modelName changes to update name
watch(modelName, () => {
  updateName()
})

// Search function for AutoComplete
const searchModels = (event: any) => {
  if (!event.query.trim().length) {
    filteredModels.value = [...selectedProvider.value.models]
  } else {
    filteredModels.value = selectedProvider.value.models.filter((model: string) => {
      return model.toLowerCase().includes(event.query.toLowerCase())
    })
  }
}

async function verifyConnection() {
  if (!apiKey.value || !modelName.value || !baseUrl.value) {
    return false
  }
  loadingVerify.value = true
  isVerified.value = false
  const options = {
    baseURL: baseUrl.value,
    apiKey: apiKey.value,
    data: {
      model: modelName.value,
      messages: [
        { role: 'system', content: "You are a helpful assistant. Reply with 'Connection successful' to confirm the connection works." },
        { role: 'user', content: `Test connection - ${Date.now()}` }
      ],
      stream: false,
    }
  }
  try {
    const response = await sendOpenAiRequestSync(options)
    if (response) {
      isVerified.value = true
    }
  } catch (error) {

    return false
  } finally {
    loadingVerify.value = false
  }
}

function resetForm() {
  id.value = null
  name.value = ''
  llmProvider.value = ''
  baseUrl.value = ''
  modelName.value = ''
  apiKey.value = ''
  isDefault.value = false
  isVerified.value = false
  selectedProvider.value = { name: '', baseUrl: '', models: [] }
  filteredModels.value = []
}

function closeModal() {
  resetForm()
  useModal.closeModal()
}

// Define emits to communicate with parent
const emit = defineEmits<{
  saveModel: [modelData: Omit<LLMModel, 'id'>]
  updateModel: [modelData: LLMModel]
}>()

async function saveModel() {
  try {
    loadingSave.value = true

    if (isEditMode.value && id.value !== null) {
      // Edit mode - emit updateModel with id
      const modelData = {
        id: id.value as string,
        name: name.value,
        llmProvider: llmProvider.value,
        modelName: modelName.value,
        baseUrl: baseUrl.value,
        apiKey: apiKey.value,
        isDefault: isDefault.value,
        createdAt: Date.now()
      }
      emit('updateModel', modelData)
    } else {
      // Add mode - emit saveModel without id
      const modelData = {
        name: name.value,
        llmProvider: llmProvider.value,
        modelName: modelName.value,
        baseUrl: baseUrl.value,
        apiKey: apiKey.value,
        isDefault: isDefault.value,
        createdAt: Date.now()
      }
      emit('saveModel', modelData)
    }

    useModal.closeModal()
  } catch (error) {

  } finally {
    loadingSave.value = false
  }
}
</script>

<template>
  <Dialog :visible="useModal.isModalOpen" @update:visible="(value) => { if (!value) closeModal() }" @hide="closeModal"
    modal :header="isEditMode ? 'Edit LLM Model' : 'Add New LLM Model'" :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
    <div class="flex flex-col gap-4 p-4">
      <IftaLabel>
        <Select v-model="llmProvider" :options="llmProviders_NameAndBaseUrl" optionLabel="name" optionValue="name"
          inputId="llmProvider" class="w-full" />
        <label for="llmProvider">LLM Provider</label>
      </IftaLabel>

      <IftaLabel>
        <InputText v-model="baseUrl" inputId="baseUrl" class="w-full" />
        <label for="baseUrl">Base URL</label>
      </IftaLabel>

      <IftaLabel>
        <AutoComplete v-model="modelName" :suggestions="filteredModels" @complete="searchModels" inputId="modelName"
          class="w-full" dropdown />
        <label for="modelName">Model Name</label>
      </IftaLabel>

      <IftaLabel>
        <Password toggleMask v-model="apiKey" :feedback="false" inputId="apiKey" class="w-full" inputClass="w-full" />
        <label for="apiKey">API Key</label>
      </IftaLabel>

      <IftaLabel>
        <InputText v-model="name" inputId="name" class="w-full" />
        <label for="name">Name</label>
      </IftaLabel>

      <div class="flex items-center gap-2">
        <ToggleSwitch v-model="isDefault" inputId="isDefault" />
        <label for="isDefault" class="text-sm font-medium">As Default</label>
      </div>
    </div>
    <template #footer>
      <div class="flex gap-2 justify-end">
        <Button @click="verifyConnection" severity="secondary" class="min-w-32">
          <i v-if="loadingVerify" class="pi pi-spin pi-spinner mr-2"></i>
          Verify Connection
        </Button>
        <Button @click="saveModel" severity="info" :disabled="!isVerified" class="min-w-24">
          <i v-if="loadingSave" class="pi pi-spin pi-spinner mr-2"></i>
          {{ isEditMode ? 'Update' : 'Save' }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>