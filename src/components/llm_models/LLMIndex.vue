<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Menu from 'primevue/menu'
import ToggleSwitch from 'primevue/toggleswitch'
import { useI18n } from 'vue-i18n'
import ModalLLM from './Modal.vue'
import { useModalStore } from '@/stores/modal'
import { MODALS } from '@/constants'
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { db, LLMModel } from '@/db'
import Dexie from 'dexie'

const { t } = useI18n()

const useModal = useModalStore()
const { confirmDelete } = useDeleteConfirm()


const loading = ref(false)
const llm_models = ref<LLMModel[]>([])
const menus = ref<any[]>([])

interface MenuItem {
  label: string
  icon: string
  command: () => void
  disabled?: boolean
  class?: string
}

const menuItems = ref<MenuItem[]>([])

const selectedModel = ref<LLMModel | null>(null)

const toggleMenu = (event: Event, model: LLMModel, index: number) => {
  selectedModel.value = model
  // Update menuItems with current model
  menuItems.value = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => {
        if (selectedModel.value) {
          useModal.openModal(MODALS.LLM_MODEL, selectedModel.value)
        }
      }
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      disabled: model.isDefault,
      class: 'delete-menu-item',
      command: () => {
        if (selectedModel.value && !selectedModel.value.isDefault) {
          confirmDelete(selectedModel.value, {
            message: `Bạn có chắc chắn muốn xóa model "${selectedModel.value.name}"?`,
            header: 'Xóa LLM Model',
            onConfirm: deleteModel
          })
        }
      }
    }
  ]
  if (menus.value[index]) {
    menus.value[index].toggle(event)
  }
}


// Load models on component mount
onMounted(async () => {
  // await loadModels();
})

// async function loadModels() {
//   try {
//     loading.value = true
//     // Simulate API call - replace with actual API call
//     llm_models.value = await db.LLMModels.find().fetch()
//   } catch (error) {
//     console.error('Error loading models:', error)
//   } finally {
//     loading.value = false
//   }
// }

async function saveModel(modelData: Omit<LLMModel, 'id'>) {
  try {
    const newModel = {
      // id: crypto.randomUUID(),
      ...modelData,
      modelType: modelData.modelType || 'chat', // Ensure modelType has default
      createdAt: Date.now(),
    }
    db.LLMModels.insert(newModel)
    // // Save to database
    // await db.llmModels.put(newModel)
    // // If this model is set as default, update all other models to not be default
    // await toggleDefault(newModel)



    return true
  } catch (error) {
    console.error('Error saving model:', error)
    return false
  }
}

async function toggleDefault(_model: LLMModel, isForce: boolean = false) {
  try {
    if (_model.isDefault || isForce) {
      if (isForce) {
        db.LLMModels.updateOne({ id: _model.id }, {
          $set: {
            isDefault: true
          }
        })
      }
      // 🔧 FIX: Chỉ reset default của models CÙNG modelType
      db.LLMModels.updateMany({
        id: { $ne: _model.id },
        modelType: _model.modelType // ← Chỉ reset models cùng type
      }, {
        $set: {
          isDefault: false
        }
      })
    } else {
      // 🔧 FIX: Kiểm tra default theo modelType
      const defaultModelOfType = db.LLMModels.findOne({
        modelType: _model.modelType,
        isDefault: true
      }) as LLMModel | null

      if (!defaultModelOfType) {
        // Nếu không có default model nào cho type này, set model đầu tiên làm default
        const firstModelOfType = db.LLMModels.findOne({
          modelType: _model.modelType
        }, {
          sort: { createdAt: -1 }
        }) as LLMModel | null

        if (firstModelOfType) {
          db.LLMModels.updateOne({ id: firstModelOfType.id }, {
            $set: {
              isDefault: true
            }
          })
        }
      }
    }

    console.log(`✅ Default toggled for ${_model.modelType} model:`, _model.name)
  } catch (error) {
    if (error instanceof Dexie.ModifyError) {
      console.error(error.failures.length + " items failed to modify")
    } else {
      console.error("Generic error: " + error)
    }
    console.error('Error toggling default:', error)
  }
}

async function deleteModel(model: LLMModel) {
  try {
    db.LLMModels.removeOne({ id: model.id })
    // await loadModels()
    console.log('Model deleted successfully:', model.name)
  } catch (error) {
    console.error('Error deleting model:', error)
  }
}

async function updateModel(modelData: LLMModel) {
  try {
    // Update the model
    // await db.llmModels.update(modelData.id, modelData)

    // If this model is set as default, update all other models to not be default
    // await toggleDefault(modelData)
    db.LLMModels.updateOne({ id: modelData.id }, {
      $set: modelData
    })
    console.log('Model updated successfully:', modelData.name)
  } catch (error) {
    console.error('Error updating model:', error)
  }
}

watchEffect((onCleanup) => {
  const cursor = db.LLMModels.find()
  llm_models.value = cursor.fetch()
  onCleanup(() => cursor.cleanup())
})

// Provide functions to child components
defineExpose({
  saveModel,
  updateModel
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t('llm_models.index.title') }}
        </h1>
      </div>
      <div class="flex gap-2">
        <Button @click="useModal.openModal(MODALS.LLM_MODEL)" severity="info" size="small">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          {{ t('llm_models.index.add') }}
        </Button>
        <Button severity="secondary" size="small">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10">
            </path>
          </svg>
          Import
        </Button>
      </div>
    </div>

    <!--LLM Models Content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" />
      </div>

      <!-- Empty State -->
      <div v-else-if="llm_models.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ t('message.empty') }}</h3>
      </div>

      <!-- Card view -->
      <div class="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="(model, index) in llm_models" :key="model.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1">
              <h3 class="font-medium text-gray-900 dark:text-white">{{ model.name }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ model.modelName }}</p>
              <div class="mt-1 flex gap-2">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  :class="model.llmProvider === 'openai' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'">
                  {{ model.llmProvider }}
                </span>
                <span v-if="model.modelType" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-purple-100 text-purple-800': model.modelType === 'chat',
                    'bg-orange-100 text-orange-800': model.modelType === 'extraction',
                    'bg-cyan-100 text-cyan-800': model.modelType === 'embedding'
                  }">
                  <span v-if="model.modelType === 'chat'">💬</span>
                  <span v-else-if="model.modelType === 'extraction'">🧠</span>
                  <span v-else-if="model.modelType === 'embedding'">🔢</span>
                  {{ model.modelType }}
                </span>
              </div>
            </div>
            <Menu :ref="(el: any) => menus[index] = el" :model="menuItems" :popup="true">
              <template #item="{ item, props }">
                <a v-ripple v-bind="props.action" :class="item.class">
                  <span :class="item.icon" />
                  <span class="ml-2">{{ item.label }}</span>
                </a>
              </template>
            </Menu>
            <Button @click="(event: any) => toggleMenu(event, model, index)" severity="secondary" size="small" text>
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </Button>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">Default Model</span>
            <ToggleSwitch :model-value="model.isDefault" @update:model-value="toggleDefault(model, true)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Model Modal -->
    <ModalLLM @saveModel="saveModel" @updateModel="updateModel" />
  </div>
</template>

<style scoped>
/* Custom styles for disabled ToggleSwitch to keep green color when default */
:deep(.p-toggleswitch.p-disabled .p-toggleswitch-slider) {
  background-color: #22c55e !important;
  /* Keep green color */
}

:deep(.p-toggleswitch.p-disabled .p-toggleswitch-slider:before) {
  background-color: white !important;
}

/* Custom styles for Delete menu item */
.delete-menu-item {
  color: #ef4444 !important;
  border-radius: 4px !important;
}

.delete-menu-item:hover:not(.p-disabled) {
  background-color: #fef2f2 !important;
  border-color: #dc2626 !important;
}

.delete-menu-item.p-disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  border: 1px solid #d1d5db !important;
  color: #9ca3af !important;
  background-color: #f9fafb !important;
}
</style>
