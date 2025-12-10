<template>
  <div class="token-stats-dashboard p-6">
    <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
      <i class="pi pi-chart-line"></i>
      Token Usage Statistics
    </h2>

    <!-- Current Period Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <!-- Today -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar"></i>
            Today
          </div>
        </template>
        <template #content>
          <div v-if="currentDailyStats" class="stats-card">
            <div class="stat-row">
              <span class="label">Input Tokens:</span>
              <span class="value">{{ formatNumber(currentDailyStats.totalInputTokens) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Output Tokens:</span>
              <span class="value">{{ formatNumber(currentDailyStats.totalOutputTokens) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Cost (VND):</span>
              <span class="value text-yellow-400">{{ formatVND(currentDailyStats.totalCostVND) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Responses:</span>
              <span class="value">{{ currentDailyStats.responseCount }}</span>
            </div>
          </div>
          <div v-else class="text-gray-500">No data for today</div>
        </template>
      </Card>

      <!-- This Week -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar-times"></i>
            This Week
          </div>
        </template>
        <template #content>
          <div v-if="currentWeeklyStats" class="stats-card">
            <div class="stat-row">
              <span class="label">Input Tokens:</span>
              <span class="value">{{ formatNumber(currentWeeklyStats.totalInputTokens) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Output Tokens:</span>
              <span class="value">{{ formatNumber(currentWeeklyStats.totalOutputTokens) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Cost (VND):</span>
              <span class="value text-yellow-400">{{ formatVND(currentWeeklyStats.totalCostVND) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Responses:</span>
              <span class="value">{{ currentWeeklyStats.responseCount }}</span>
            </div>
          </div>
          <div v-else class="text-gray-500">No data for this week</div>
        </template>
      </Card>

      <!-- This Month -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar-plus"></i>
            This Month
          </div>
        </template>
        <template #content>
          <div v-if="currentMonthlyStats" class="stats-card">
            <div class="stat-row">
              <span class="label">Input Tokens:</span>
              <span class="value">{{ formatNumber(currentMonthlyStats.totalInputTokens) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Output Tokens:</span>
              <span class="value">{{ formatNumber(currentMonthlyStats.totalOutputTokens) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Cost (VND):</span>
              <span class="value text-yellow-400">{{ formatVND(currentMonthlyStats.totalCostVND) }}</span>
            </div>
            <div class="stat-row">
              <span class="label">Responses:</span>
              <span class="value">{{ currentMonthlyStats.responseCount }}</span>
            </div>
          </div>
          <div v-else class="text-gray-500">No data for this month</div>
        </template>
      </Card>
    </div>

    <!-- Historical Data Table -->
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <span>Historical Data</span>
          <SelectButton v-model="viewMode" :options="viewModeOptions" />
        </div>
      </template>
      <template #content>
        <DataTable
          :value="historicalData"
          :loading="loading"
          stripedRows
          showGridlines
        >
          <Column field="period" header="Period" />
          <Column field="totalInputTokens" header="Input Tokens">
            <template #body="{ data }">
              {{ formatNumber(data.totalInputTokens) }}
            </template>
          </Column>
          <Column field="totalOutputTokens" header="Output Tokens">
            <template #body="{ data }">
              {{ formatNumber(data.totalOutputTokens) }}
            </template>
          </Column>
          <Column field="totalCostVND" header="Cost (VND)">
            <template #body="{ data }">
              <span class="text-yellow-400">{{ formatVND(data.totalCostVND) }}</span>
            </template>
          </Column>
          <Column field="responseCount" header="Responses" />
        </DataTable>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTokenStatsStore } from '@/stores/token-stats';
import { useResourcesStore } from '@/stores/resources';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import SelectButton from 'primevue/selectbutton';

const tokenStatsStore = useTokenStatsStore();
const resourcesStore = useResourcesStore();

const viewMode = ref<'weekly' | 'monthly'>('weekly');
const viewModeOptions = ['weekly', 'monthly'];
const loading = ref(false);

// Current period stats (reactive)
const currentDailyStats = computed(() => tokenStatsStore.currentDailyStats);
const currentWeeklyStats = computed(() => tokenStatsStore.currentWeeklyStats);
const currentMonthlyStats = computed(() => tokenStatsStore.currentMonthlyStats);

// Historical data
const historicalData = computed(() => {
  if (viewMode.value === 'weekly') {
    return weeklyHistory.value.map(record => ({
      period: `${record.weekStart} ~ ${record.weekEnd}`,
      ...record
    }));
  } else {
    return monthlyHistory.value.map(record => ({
      period: record.month,
      ...record
    }));
  }
});

const weeklyHistory = ref<any[]>([]);
const monthlyHistory = ref<any[]>([]);

/**
 * Load stats on mount
 */
onMounted(async () => {
  const characterId = resourcesStore.currentCharacterCard?.id;
  if (!characterId) return;

  loading.value = true;

  try {
    // Load current stats
    await tokenStatsStore.loadCurrentStats(characterId);

    // Load historical data
    weeklyHistory.value = await tokenStatsStore.getWeeklyHistory(characterId, 8);
    monthlyHistory.value = await tokenStatsStore.getMonthlyHistory(characterId, 12);
  } catch (error) {
    console.error('Failed to load token stats:', error);
  } finally {
    loading.value = false;
  }
});

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
.token-stats-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
}

.stat-row .label {
  color: #9ca3af;
  font-size: 0.875rem;
}

.stat-row .value {
  font-weight: 600;
  font-size: 1rem;
}
</style>
