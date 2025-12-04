<template>
  <Dialog 
    :visible="useModal.isModalOpen(MODALS.EDIT_MESSAGE)" 
    @update:visible="(value) => { if (!value) closeModal() }" 
    @hide="closeModal"
    modal 
    header="Edit Message" 
    :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
  >
    <div class="flex flex-col gap-4 p-4">
      <textarea 
        v-model="messageContent"
        class="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter your message here..."
      ></textarea>
    </div>
    
    <template #footer>
      <div class="flex gap-2 justify-between w-full">
        <Button 
          label="Clear" 
          severity="secondary" 
          @click="clearMessage"
        />
        <SaveButton @click="handleSave" ref="saveButtonRef" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import SaveButton from '@/components/common/SaveButton.vue'
import { useModalStore } from '@/stores/modal';
import { MODALS } from '@/constants';

const useModal = useModalStore()
const { modalData } = storeToRefs(useModal)
const saveButtonRef = ref()

const messageContent = ref('')
const isAssistant = ref(false)

// Watch for modalData changes to populate textarea
watch(() => modalData.value, (newData) => {
  isAssistant.value = newData?.isAssistant || false
  if (newData && newData.content) {
    messageContent.value = newData.content
  } else {
    messageContent.value = ''
  }
}, { immediate: true })

// Define emits to communicate with parent
const emit = defineEmits<{
  saveMessage: [messageId: string, content: string, isAssistant: boolean]
}>()

function clearMessage() {
  messageContent.value = ''
}

function closeModal() {
  messageContent.value = ''
  useModal.closeModal()
}

function handleSave() {
  const messageId = modalData.value?.id
  emit('saveMessage', messageId, messageContent.value, isAssistant.value)
  
  // Show success state on save button
  if (saveButtonRef.value) {
    saveButtonRef.value.showSuccess()
  }
  closeModal()
}
</script>

<style scoped>
/* Custom styles if needed */
</style>