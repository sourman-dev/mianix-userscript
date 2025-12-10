# Phase 04: Statistics Aggregation Store

**Date:** 2025-12-09
**Status:** Pending
**Dependencies:** Phase 01-03
**Duration:** 1.5 days

## Overview

Create Pinia store (tokenStatsStore) with **pre-aggregated** daily/weekly/monthly stats. Update aggregates incrementally on each message to avoid expensive query + sum operations that block UI.

## Key Insights

- **Pre-aggregate on write**: Update daily/weekly/monthly totals when recording usage
- **Avoid expensive queries**: Never sum individual records in UI getters
- **Incremental updates**: Add to existing aggregates instead of recalculating
- **Background cleanup**: Archive old daily records to monthly aggregates

## Architecture

### IndexedDB Collections

```typescript
// Daily aggregates (keep 90 days)
export interface DailyTokenStats {
  id: string;                   // characterId-YYYY-MM-DD
  characterId: string;
  date: string;                 // YYYY-MM-DD
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostVND: number;
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}

// Weekly aggregates (keep 52 weeks)
export interface WeeklyTokenStats {
  id: string;                   // characterId-YYYY-Www
  characterId: string;
  weekStart: string;            // YYYY-MM-DD (Monday)
  weekEnd: string;              // YYYY-MM-DD (Sunday)
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostVND: number;
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}

// Monthly aggregates (keep forever)
export interface MonthlyTokenStats {
  id: string;                   // characterId-YYYY-MM
  characterId: string;
  month: string;                // YYYY-MM
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostVND: number;
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}
```

### Store Implementation

```typescript
// src/stores/token-stats.ts
export const useTokenStatsStore = defineStore('tokenStats', () => {
  const currentDailyStats = ref<DailyTokenStats | null>(null);
  const currentWeeklyStats = ref<WeeklyTokenStats | null>(null);
  const currentMonthlyStats = ref<MonthlyTokenStats | null>(null);

  /**
   * Record usage and update ALL aggregates incrementally
   * No expensive queries - just atomic updates to pre-aggregated data
   */
  async function recordUsage(characterId: string, tokenStats: TokenUsageStats) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthStr = dateStr.substring(0, 7);         // YYYY-MM
    const weekStr = getISOWeekString(now);            // YYYY-Www

    // Update daily aggregate
    await updateDailyStats(characterId, dateStr, tokenStats);

    // Update weekly aggregate
    await updateWeeklyStats(characterId, weekStr, now, tokenStats);

    // Update monthly aggregate
    await updateMonthlyStats(characterId, monthStr, tokenStats);

    // Refresh current stats (reactive)
    await loadCurrentStats(characterId);
  }

  /**
   * Update daily stats (upsert pattern)
   */
  async function updateDailyStats(
    characterId: string,
    date: string,
    tokenStats: TokenUsageStats
  ) {
    const id = `${characterId}-${date}`;
    let record = await db.DailyTokenStats.findOne({ id });

    if (!record) {
      record = {
        id, characterId, date,
        totalInputTokens: 0, totalOutputTokens: 0,
        totalCostUSD: 0, totalCostVND: 0,
        responseCount: 0,
        createdAt: Date.now(), updatedAt: Date.now()
      };
    }

    // Incremental update (no query + sum)
    record.totalInputTokens += tokenStats.inputTokens;
    record.totalOutputTokens += tokenStats.outputTokens;
    record.totalCostUSD += tokenStats.costUSD || 0;
    record.totalCostVND += tokenStats.costVND || 0;
    record.responseCount += 1;
    record.updatedAt = Date.now();

    await db.DailyTokenStats.upsert(record);
  }

  /**
   * Update weekly stats (same pattern)
   */
  async function updateWeeklyStats(
    characterId: string,
    weekStr: string,
    date: Date,
    tokenStats: TokenUsageStats
  ) {
    const { weekStart, weekEnd } = getWeekBounds(date);
    const id = `${characterId}-${weekStr}`;
    let record = await db.WeeklyTokenStats.findOne({ id });

    if (!record) {
      record = {
        id, characterId, weekStart, weekEnd,
        totalInputTokens: 0, totalOutputTokens: 0,
        totalCostUSD: 0, totalCostVND: 0,
        responseCount: 0,
        createdAt: Date.now(), updatedAt: Date.now()
      };
    }

    record.totalInputTokens += tokenStats.inputTokens;
    record.totalOutputTokens += tokenStats.outputTokens;
    record.totalCostUSD += tokenStats.costUSD || 0;
    record.totalCostVND += tokenStats.costVND || 0;
    record.responseCount += 1;
    record.updatedAt = Date.now();

    await db.WeeklyTokenStats.upsert(record);
  }

  /**
   * Update monthly stats (same pattern)
   */
  async function updateMonthlyStats(
    characterId: string,
    month: string,
    tokenStats: TokenUsageStats
  ) {
    const id = `${characterId}-${month}`;
    let record = await db.MonthlyTokenStats.findOne({ id });

    if (!record) {
      record = {
        id, characterId, month,
        totalInputTokens: 0, totalOutputTokens: 0,
        totalCostUSD: 0, totalCostVND: 0,
        responseCount: 0,
        createdAt: Date.now(), updatedAt: Date.now()
      };
    }

    record.totalInputTokens += tokenStats.inputTokens;
    record.totalOutputTokens += tokenStats.outputTokens;
    record.totalCostUSD += tokenStats.costUSD || 0;
    record.totalCostVND += tokenStats.costVND || 0;
    record.responseCount += 1;
    record.updatedAt = Date.now();

    await db.MonthlyTokenStats.upsert(record);
  }

  /**
   * Load current stats (today, this week, this month)
   * No aggregation - just direct reads
   */
  async function loadCurrentStats(characterId: string) {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const monthStr = dateStr.substring(0, 7);
    const weekStr = getISOWeekString(now);

    currentDailyStats.value = await db.DailyTokenStats.findOne({
      id: `${characterId}-${dateStr}`
    }) || null;

    currentWeeklyStats.value = await db.WeeklyTokenStats.findOne({
      id: `${characterId}-${weekStr}`
    }) || null;

    currentMonthlyStats.value = await db.MonthlyTokenStats.findOne({
      id: `${characterId}-${monthStr}`
    }) || null;
  }

  /**
   * Get historical stats (no aggregation needed)
   */
  async function getWeeklyHistory(characterId: string, weeks: number = 4) {
    return await db.WeeklyTokenStats
      .find({ characterId })
      .sort({ weekStart: -1 })
      .limit(weeks)
      .fetch();
  }

  async function getMonthlyHistory(characterId: string, months: number = 12) {
    return await db.MonthlyTokenStats
      .find({ characterId })
      .sort({ month: -1 })
      .limit(months)
      .fetch();
  }

  /**
   * Background cleanup: Delete old daily records (keep 90 days)
   */
  async function cleanupOldDailyRecords() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    await db.DailyTokenStats.removeMany({ date: { $lt: cutoffStr } });
  }

  return {
    currentDailyStats,
    currentWeeklyStats,
    currentMonthlyStats,
    recordUsage,
    loadCurrentStats,
    getWeeklyHistory,
    getMonthlyHistory,
    cleanupOldDailyRecords
  };
});

// Helper functions
function getISOWeekString(date: Date): string {
  // Returns YYYY-Www format (e.g., "2025-W50")
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  // Returns Monday-Sunday bounds for the week
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0]
  };
}
```

## Performance Benefits

✅ **No expensive queries**: All aggregates pre-calculated
✅ **Non-blocking UI**: Direct reads, no computation in getters
✅ **Incremental updates**: O(1) writes instead of O(n) query + sum
✅ **Scalable**: Works with 100k+ messages without slowdown
✅ **Background cleanup**: Old daily records archived to monthly

## Files

**Create:**
- src/stores/token-stats.ts
- src/utils/date-helpers.ts (ISO week calculations)

**Modify:**
- src/db/index.ts (add 3 collections: Daily, Weekly, Monthly)

→ Next: [Phase 05: UI Components](./phase-05-ui-components.md)
