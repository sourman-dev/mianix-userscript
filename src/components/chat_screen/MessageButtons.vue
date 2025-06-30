<!-- src/components/chat_screen/MessageButtons.vue -->
<template>
  <div class="flex justify-end">
    <!-- Nút Pencil -->
    <Button
      icon="pi pi-pencil"
      severity="secondary"
      text rounded size="small"
      @click="emitClick('edit')"
      v-tooltip.top="'Chỉnh sửa'"
      :disabled="isDisabled"
    />
    
    <!-- Nút Replay (chỉ cho assistant) -->
    <Button
      icon="pi pi-replay"
      severity="secondary"
      text rounded size="small"
      @click="emitClick('replay')"
      v-tooltip.top="'Tạo lại'"
      :disabled="isDisabled"
    />
    
    <!-- Nút Delete -->
    <Button
      icon="pi pi-trash"
      severity="danger"
      text rounded size="small"
      @click="emitClick('delete')"
      v-tooltip.top="'Xoá'"
      :disabled="isDisabled"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'
import Button from 'primevue/button';

// onMounted(() => {
//   console.log(props)
// })

const props = defineProps({
  role: { type: String, required: true },
  messageId: { type: [String, Number], required: true },
  latestMessageId: { type: [String, Number], required: false },
  status: { type: String, required: false, default: 'completed' },
})

const isDisabled = computed(() => {
    return props.messageId !== props.latestMessageId
})

const emit = defineEmits(['button-click'])
function emitClick(buttonName: string) {
  emit('button-click', { buttonName, role: props.role, messageId: props.messageId })
}
</script>

<style scoped>
/* Xóa hết CSS cũ, chúng ta dùng PrimeVue và Tailwind */
</style>