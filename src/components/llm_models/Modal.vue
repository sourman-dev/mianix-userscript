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
import { LLMModel } from '@/db' // 🔧 FIX: Import from @/db instead of @/newDb
import { useModalStore } from '@/stores/modal'
import { useResourcesStore } from '@/stores/resources'
import { sendOpenAiRequestSync } from '@/utils/llm'
import { MODALS } from '@/constants'
import { PROVIDER_OPTIONS, PROVIDER_BASE_URLS } from '@/constants/providers'

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
const modelType = ref<'chat' | 'embedding' | 'extraction'>('chat') // 🆕 Model Type
const selectedProvider = ref({
  name: '',
  baseUrl: '',
  models: [] as string[]
})
const filteredModels = ref<string[]>([])
const isVerified = ref(false)
const isDefault = ref(false)
const isSettingFromModal = ref(false)

// 🆕 Model Type Options
const modelTypeOptions = [
  { label: '💬 Chat (Response)', value: 'chat' },
  { label: '🧠 Extraction (Phân tích)', value: 'extraction' },
  { label: '🔢 Embedding (Vector)', value: 'embedding' }
]


// 🆕 Function to detect provider from base URL
const detectProviderFromUrl = (url: string): string => {
  if (!url) return 'UNKNOWN'

  const lowerUrl = url.toLowerCase()

  // OpenAI
  if (lowerUrl.includes('api.openai.com')) return 'OPENAI'

  // Anthropic (Claude)
  if (lowerUrl.includes('api.anthropic.com')) return 'ANTHROPIC'

  // Google (Gemini)
  if (lowerUrl.includes('generativelanguage.googleapis.com')) return 'GOOGLE'

  // Groq
  if (lowerUrl.includes('api.groq.com')) return 'GROQ'

  // Together AI
  if (lowerUrl.includes('api.together.xyz')) return 'TOGETHER'

  // Ollama (local) - mark as UNKNOWN
  if (lowerUrl.includes('localhost:11434') || lowerUrl.includes('127.0.0.1:11434')) {
    return 'UNKNOWN'
  }

  // LM Studio (local) - mark as UNKNOWN
  if (lowerUrl.includes('localhost:1234') || lowerUrl.includes('127.0.0.1:1234')) {
    return 'UNKNOWN'
  }

  // Perplexity
  if (lowerUrl.includes('api.perplexity.ai')) return 'PERPLEXITY'

  // Mistral
  if (lowerUrl.includes('api.mistral.ai')) return 'MISTRAL'

  // Cohere
  if (lowerUrl.includes('api.cohere.ai')) return 'COHERE'

  return 'UNKNOWN'
}

// 🆕 Watch llmProvider to auto-fill baseURL
watch(llmProvider, (newProvider) => {
  if (newProvider && !isSettingFromModal.value && PROVIDER_BASE_URLS[newProvider]) {
    baseUrl.value = PROVIDER_BASE_URLS[newProvider];
  }
});

// 🆕 Watch baseUrl to auto-detect provider (keep for reverse direction)
watch(baseUrl, (newBaseUrl) => {
  if (newBaseUrl && !isSettingFromModal.value) {
    const detectedProvider = detectProviderFromUrl(newBaseUrl);
    if (detectedProvider !== llmProvider.value) {
      llmProvider.value = detectedProvider;
    }
  }
});

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
    if (selectedProvider.value && selectedProvider.value.baseUrl) {
      baseUrl.value = selectedProvider.value.baseUrl
    }
    // Only reset when user manually changes provider
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
    modelType.value = newEditData.modelType || 'chat' // 🆕 Load modelType
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

// 🆕 Function to fetch available models from API
const loadingModels = ref(false)
const fetchAvailableModels = async () => {
  if (!baseUrl.value || !apiKey.value) return

  try {
    loadingModels.value = true

    // Chuẩn hóa URL
    let modelsUrl = baseUrl.value
    if (modelsUrl.endsWith('/')) {
      modelsUrl = modelsUrl.slice(0, -1)
    }
    if (!modelsUrl.includes('/models')) {
      modelsUrl = `${modelsUrl}/models`
    }

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch models:', response.status)
      return
    }

    const data = await response.json()

    // OpenAI format: { data: [{id: "model-name"}, ...] }
    if (data.data && Array.isArray(data.data)) {
      const models = data.data.map((m: any) => m.id || m.name)
      selectedProvider.value = {
        name: llmProvider.value || 'Custom',
        baseUrl: baseUrl.value,
        models: models
      }
      filteredModels.value = models
      isVerified.value = filteredModels.value.length > 0
      console.log(`✅ Fetched ${models.length} models from API`)
    }
  } catch (error) {
    console.error('Error fetching models:', error)
  } finally {
    loadingModels.value = false
  }
}

// 🆕 Watch for baseUrl and apiKey changes to auto-fetch models
let fetchModelsTimeout: ReturnType<typeof setTimeout> | null = null
watch([baseUrl, apiKey], ([newBaseUrl, newApiKey]) => {
  // Clear previous timeout
  if (fetchModelsTimeout) {
    clearTimeout(fetchModelsTimeout)
  }

  if (newBaseUrl && newApiKey && !isSettingFromModal.value) {
    // Debounce để tránh gọi API quá nhiều
    fetchModelsTimeout = setTimeout(() => {
      fetchAvailableModels()
      fetchModelsTimeout = null
    }, 500)
  }
})

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
    console.log(response)
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
  modelType.value = 'chat' // 🆕 Reset to default
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
        modelType: modelType.value, // 🆕 Include modelType
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
        modelType: modelType.value, // 🆕 Include modelType
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
  <Dialog :visible="useModal.isModalOpen(MODALS.LLM_MODEL)" @update:visible="(value) => { if (!value) closeModal() }"
    @hide="closeModal" modal :header="isEditMode ? 'Edit LLM Model' : 'Add New LLM Model'" :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
    <div class="flex flex-col gap-4 p-4">
      <IftaLabel>
        <Select v-model="llmProvider" :options="PROVIDER_OPTIONS" optionLabel="label" optionValue="value"
          inputId="llmProvider" class="w-full" />
        <label for="llmProvider">LLM Provider</label>
      </IftaLabel>
      <small v-if="llmProvider && llmProvider !== 'UNKNOWN'" class="text-blue-500 -mt-3">
        <i class="pi pi-info-circle mr-1"></i>
        Selected provider: {{ llmProvider }}
      </small>
      <small v-else-if="llmProvider === 'UNKNOWN'" class="text-orange-500 -mt-3">
        <i class="pi pi-exclamation-triangle mr-1"></i>
        Unknown provider: Token count only, no cost estimation
      </small>

      <IftaLabel>
        <Select v-model="modelType" :options="modelTypeOptions" optionLabel="label" optionValue="value"
          inputId="modelType" class="w-full" />
        <label for="modelType">Model Type</label>
      </IftaLabel>

      <IftaLabel>
        <InputText v-model="baseUrl" inputId="baseUrl" class="w-full" />
        <label for="baseUrl">Base URL</label>
      </IftaLabel>
      <small v-if="llmProvider && llmProvider !== 'UNKNOWN' && PROVIDER_BASE_URLS[llmProvider]"
        class="text-green-600 -mt-3">
        <i class="pi pi-check-circle mr-1"></i>
        Auto-filled from {{ llmProvider }} provider
      </small>
      <small v-else-if="llmProvider === 'UNKNOWN'" class="text-gray-500 -mt-3">
        <i class="pi pi-pencil mr-1"></i>
        Please enter Base URL manually for custom provider
      </small>

      <div class="flex gap-2 items-start">
        <IftaLabel class="flex-1">
          <AutoComplete v-model="modelName" :suggestions="filteredModels" @complete="searchModels" inputId="modelName"
            :loading="loadingModels" :disabled="loadingModels" class="w-full" dropdown />
          <label for="modelName">Model Name</label>
        </IftaLabel>

        <Button icon="pi pi-refresh" @click="fetchAvailableModels" :loading="loadingModels"
          :disabled="!baseUrl || !apiKey" severity="secondary" outlined v-tooltip.top="'Tải lại danh sách models'"
          class="mt-1" />
      </div>
      <small v-if="loadingModels" class="text-blue-500 -mt-3">
        <i class="pi pi-spin pi-spinner mr-1"></i>
        Đang tải danh sách models từ API...
      </small>
      <small v-else-if="filteredModels.length > 0" class="text-green-600 -mt-3">
        <i class="pi pi-check-circle mr-1"></i>
        Đã tải {{ filteredModels.length }} models
      </small>

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