<template>
  <div class="flex gap-1 items-center">
    <button
      v-if="role === 'user' || role === 'assistant'"
      @click="emitClick('pencil')"
      class="p-1 rounded hover:bg-gray-200 text-xs"
      title="Chỉnh sửa"
      :disabled="isDisabled"
    >
      <i class="pi pi-pencil"></i>
    </button>
    <button
      v-if="role === 'assistant'"
      @click="emitClick('replay')"
      class="p-1 rounded hover:bg-gray-200 text-xs"
      title="Replay"
      :disabled="isDisabled"
    >
      <i class="pi pi-replay"></i>
    </button>
    <button
      v-if="role === 'user' || role === 'assistant'"
      @click="emitClick('delete')"
      class="p-1 rounded hover:bg-red-100 text-red-600 text-xs"
      title="Xoá"
      :disabled="isDisabled"
    >
      <i class="pi pi-trash"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'
const props = defineProps({
  role: { type: String, required: true },
  messageId: { type: [String, Number], required: true },
  latestMessageId: { type: [String, Number], required: true },
})

const isDisabled = computed(() => {
    return props.messageId !== props.latestMessageId
})

const emit = defineEmits(['button-click'])
function emitClick(buttonName: string) {
  emit('button-click', { buttonName, role: props.role, messageId: props.messageId })
}
</script>