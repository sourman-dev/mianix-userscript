<template>
  <Dialog
    :visible="useModal.isModalOpen(MODALS.CHARACTER_IMPORT)"
    modal
    header="Import Character"
    :class="'character-import-dialog'"
    @update:visible="(value) => !value && useModal.closeModal()"
    :closable="true"
     :style="{ width: '50vw' }"
    :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
    @hide="cancelDialog"
  >
    <div class="file-upload-container">
      <label for="character-card-upload" class="file-upload-area">
        <div class="flex items-center justify-center flex-col">
          <i class="pi pi-cloud-upload" style="font-size: 3rem;"></i>
          <p>{{ msg1 }}</p>
          <p class="text-sm text-gray-500 mt-2">
            {{ msg2 }}
          </p>
        </div>
        <input 
          type="file" 
          id="character-card-upload" 
          accept=".png" 
          @change="onFileSelect" 
          class="hidden-input"
        />
      </label>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        @click="useModal.closeModal()"
      />
      <Button 
        label="Import" 
        @click="importOnly"
        :loading="loadingImport"
        :disabled="!selectedFile"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { MODALS} from '@/constants';
import { onMounted, defineEmits, ref } from 'vue';
import { parseCharacterCard } from '@/utils/character-parser';
import { useModalStore } from '@/stores/modal';
import { fileSizeHuman } from '@/utils/common';

// Định nghĩa các sự kiện emit
const emit = defineEmits<{
  'character-imported': [characterData: any, imageFile: File]
}>();

const useModal = useModalStore();
const msg1 = ref('');
const msg2 = ref('');
const loadingImport = ref(false);

const cancelDialog = () => {
  // Reset messages when dialog is canceled
  // console.log('Cancel dialog');
  loadingImport.value = false;
  msg1.value = 'Drag file here or click to select';
  msg2.value = 'Only SillyTavern PNG character card files are supported';
};
// Lưu trữ file đã chọn
let selectedFile: File | null = null;

const onFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  selectedFile = input.files?.[0] || null;
  if (!selectedFile) return;
  msg1.value = selectedFile.name;
  msg2.value = fileSizeHuman(selectedFile.size);
  // Hiển thị tên file đã chọn nếu cần
  console.log("Selected file:", selectedFile.name);
};

// Xử lý khi nhấn nút Import
const importOnly = async () => {
  if (!selectedFile) return;
  
  try {
    loadingImport.value = true;
    const parsedData = await parseCharacterCard(selectedFile);
    

    // Emit sự kiện với dữ liệu character đã parse
    emit('character-imported', parsedData, selectedFile);
    // Đóng modal sau khi import thành công
    useModal.closeModal();
  } catch (error) {
    console.error("Error parsing character card:", error);
    // TODO: Show error message to user
  }
  finally {
    // Reset messages after import
    cancelDialog();
  }
};



// Xử lý khi nhấn nút Import & Edit
// TODO: Implement this function when edit functionality is ready

// Xử lý kéo thả file
const setupDragAndDrop = () => {
  const dropArea = document.querySelector('.file-upload-area');
  const fileInput = document.getElementById('character-card-upload') as HTMLInputElement;
  
  if (!dropArea || !fileInput) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.add('highlight');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('highlight');
    }, false);
  });
  
  dropArea.addEventListener('drop', (e: Event) => {
    const dragEvent = e as DragEvent;
    const dt = dragEvent.dataTransfer;
    if (dt?.files.length) {
      fileInput.files = dt.files;
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    }
  }, false);
};

// Thiết lập kéo thả sau khi component được mount
onMounted(() => {
  cancelDialog();
  setupDragAndDrop();
});
</script>

<style scoped>
.character-import-dialog {
  width: 90vw;
  max-width: 550px;
}

.file-upload-container {
  width: 100%;
  margin-bottom: 1rem;
}

.file-upload-area {
  display: block;
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.file-upload-area:hover, .file-upload-area.highlight {
  border-color: #666;
  background-color: rgba(0, 0, 0, 0.05);
}

.hidden-input {
  display: none;
}

@media (max-width: 768px) {
  .character-import-dialog {
    width: 95vw;
  }
  
  .file-upload-area {
    padding: 1.5rem;
  }
}

@media (max-width: 480px) {
  .file-upload-area {
    padding: 1rem;
  }
}
</style>