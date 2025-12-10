# Phase 05: UI Components

**Date:** 2025-12-09
**Status:** Pending
**Dependencies:** Phase 01-04
**Duration:** 1.5 days

## Overview

Create UI components to display token statistics: per-response stats in ChatScreen, aggregated dashboard for daily/character stats. Graceful UI for unknown models (show tokens only).

## Components

### TokenStatsDisplay.vue (Per-Response)
Display token/cost stats inline with each message in ChatScreen.

```vue
<template>
  <div v-if="tokenStats" class="token-stats text-xs text-gray-500 mt-2">
    <div class="flex items-center gap-3">
      <span>{{ tokenStats.inputTokens }}↑ {{ tokenStats.outputTokens }}↓</span>
      <span v-if="tokenStats.costVND">≈ {{ formatVND(tokenStats.costVND) }}</span>
      <span v-else class="text-orange-500">Unknown model</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TokenUsageStats } from '@/types/token-stats';

const props = defineProps<{ tokenStats?: TokenUsageStats }>();

const formatVND = (amount: number) => 
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
</script>
```

### TokenStatsDashboard.vue (Aggregated)
New screen showing daily/weekly/monthly aggregates per character.

```vue
<template>
  <div class="dashboard p-4">
    <h2>Token Usage Statistics</h2>
    
    <DataTable :value="characterStats">
      <Column field="date" header="Date" />
      <Column field="totalInputTokens" header="Input Tokens" />
      <Column field="totalOutputTokens" header="Output Tokens" />
      <Column field="totalCostVND" header="Cost (VND)">
        <template #body="{ data }">{{ formatVND(data.totalCostVND) }}</template>
      </Column>
      <Column field="responseCount" header="Responses" />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTokenStatsStore } from '@/stores/token-stats';

const tokenStatsStore = useTokenStatsStore();
const characterStats = computed(() => tokenStatsStore.weekStats);
</script>
```

## Integration

**ChatScreen.vue:**
- Import TokenStatsDisplay
- Add to message bubble template
- Pass `node.tokenStats` as prop

**Navigation:**
- Add "Statistics" screen to SCREENS constant
- Add navigation button in header

## Files

**Create:**
- src/components/token_stats/TokenStatsDisplay.vue
- src/components/token_stats/TokenStatsDashboard.vue

**Modify:**
- src/components/chat_screen/ChatScreen.vue
- src/constants.ts (add STATISTICS screen)
- src/stores/screen.ts (add screen mapping)

## Success Criteria

- Per-response stats display in chat
- Unknown models show token counts with warning
- Dashboard shows aggregated daily stats
- No UI lag from stats calculations

→ Implementation Complete
