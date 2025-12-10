<template>
  <div v-if="tokenStats" class="token-stats text-xs text-gray-400 mt-2 flex items-center gap-3">
    <!-- Token counts -->
    <span class="flex items-center gap-1">
      <i class="pi pi-arrow-up text-blue-400" style="font-size: 0.7rem"></i>
      {{ formatNumber(tokenStats.inputTokens) }}
    </span>
    <span class="flex items-center gap-1">
      <i class="pi pi-arrow-down text-green-400" style="font-size: 0.7rem"></i>
      {{ formatNumber(tokenStats.outputTokens) }}
    </span>

    <!-- Cost (VND) -->
    <span v-if="tokenStats.costVND" class="flex items-center gap-1">
      <i class="pi pi-dollar text-yellow-400" style="font-size: 0.7rem"></i>
      {{ formatVND(tokenStats.costVND) }}
    </span>

    <!-- Unknown model warning -->
    <span v-else class="flex items-center gap-1 text-orange-400">
      <i class="pi pi-exclamation-triangle" style="font-size: 0.7rem"></i>
      Unknown model
    </span>
  </div>
</template>

<script setup lang="ts">
import type { TokenUsageStats } from '@/types/token-stats';

const props = defineProps<{
  tokenStats?: TokenUsageStats | null;
}>();

/**
 * Format number with thousands separator
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * Format VND currency
 */
const formatVND = (amount: number): string => {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(rounded);
};
</script>

<style scoped>
.token-stats {
  user-select: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.token-stats:hover {
  opacity: 1;
}
</style>
