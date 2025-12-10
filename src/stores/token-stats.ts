// file: src/stores/token-stats.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '@/db';
import type {
  TokenUsageStats,
  DailyTokenStats,
  WeeklyTokenStats,
  MonthlyTokenStats
} from '@/types/token-stats';

/**
 * Token Statistics Store
 * Pre-aggregated daily/weekly/monthly stats to avoid expensive queries
 * Updates incrementally on each LLM response
 */
export const useTokenStatsStore = defineStore('tokenStats', () => {
  // Current period stats (reactive)
  const currentDailyStats = ref<DailyTokenStats | null>(null);
  const currentWeeklyStats = ref<WeeklyTokenStats | null>(null);
  const currentMonthlyStats = ref<MonthlyTokenStats | null>(null);

  /**
   * Record token usage and update ALL aggregates incrementally
   * No expensive queries - just atomic updates to pre-aggregated data
   *
   * @param characterId - Character card ID
   * @param tokenStats - Token usage statistics from LLM response
   */
  async function recordUsage(characterId: string, tokenStats: TokenUsageStats) {
    if (!tokenStats) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthStr = dateStr.substring(0, 7);          // YYYY-MM
    const weekStr = getISOWeekString(now);             // YYYY-Www

    // Update all 3 aggregates in parallel
    await Promise.all([
      updateDailyStats(characterId, dateStr, tokenStats),
      updateWeeklyStats(characterId, weekStr, now, tokenStats),
      updateMonthlyStats(characterId, monthStr, tokenStats)
    ]);

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
    const existing = await db.DailyTokenStats.findOne({ id });

    if (existing) {
      // Incremental update (no query + sum)
      await db.DailyTokenStats.updateOne(
        { id },
        {
          $inc: {
            totalInputTokens: tokenStats.inputTokens,
            totalOutputTokens: tokenStats.outputTokens,
            totalCostUSD: tokenStats.costUSD || 0,
            totalCostVND: tokenStats.costVND || 0,
            responseCount: 1
          },
          $set: {
            updatedAt: Date.now()
          }
        }
      );
    } else {
      // Create new record
      await db.DailyTokenStats.insert({
        id,
        characterId,
        date,
        totalInputTokens: tokenStats.inputTokens,
        totalOutputTokens: tokenStats.outputTokens,
        totalCostUSD: tokenStats.costUSD || 0,
        totalCostVND: tokenStats.costVND || 0,
        responseCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
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
    const existing = await db.WeeklyTokenStats.findOne({ id });

    if (existing) {
      await db.WeeklyTokenStats.updateOne(
        { id },
        {
          $inc: {
            totalInputTokens: tokenStats.inputTokens,
            totalOutputTokens: tokenStats.outputTokens,
            totalCostUSD: tokenStats.costUSD || 0,
            totalCostVND: tokenStats.costVND || 0,
            responseCount: 1
          },
          $set: {
            updatedAt: Date.now()
          }
        }
      );
    } else {
      await db.WeeklyTokenStats.insert({
        id,
        characterId,
        weekStart,
        weekEnd,
        totalInputTokens: tokenStats.inputTokens,
        totalOutputTokens: tokenStats.outputTokens,
        totalCostUSD: tokenStats.costUSD || 0,
        totalCostVND: tokenStats.costVND || 0,
        responseCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
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
    const existing = await db.MonthlyTokenStats.findOne({ id });

    if (existing) {
      await db.MonthlyTokenStats.updateOne(
        { id },
        {
          $inc: {
            totalInputTokens: tokenStats.inputTokens,
            totalOutputTokens: tokenStats.outputTokens,
            totalCostUSD: tokenStats.costUSD || 0,
            totalCostVND: tokenStats.costVND || 0,
            responseCount: 1
          },
          $set: {
            updatedAt: Date.now()
          }
        }
      );
    } else {
      await db.MonthlyTokenStats.insert({
        id,
        characterId,
        month,
        totalInputTokens: tokenStats.inputTokens,
        totalOutputTokens: tokenStats.outputTokens,
        totalCostUSD: tokenStats.costUSD || 0,
        totalCostVND: tokenStats.costVND || 0,
        responseCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
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
   * Get weekly history (no aggregation needed)
   */
  async function getWeeklyHistory(characterId: string, weeks: number = 4): Promise<WeeklyTokenStats[]> {
    const records = await db.WeeklyTokenStats
      .find({ characterId })
      .fetch();

    // Sort by weekStart descending and limit
    return records
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
      .slice(0, weeks);
  }

  /**
   * Get monthly history (no aggregation needed)
   */
  async function getMonthlyHistory(characterId: string, months: number = 12): Promise<MonthlyTokenStats[]> {
    const records = await db.MonthlyTokenStats
      .find({ characterId })
      .fetch();

    // Sort by month descending and limit
    return records
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, months);
  }

  /**
   * Background cleanup: Delete old daily records (keep 90 days)
   */
  async function cleanupOldDailyRecords() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const oldRecords = await db.DailyTokenStats.find().fetch();
    const toDelete = oldRecords.filter(r => r.date < cutoffStr);

    for (const record of toDelete) {
      await db.DailyTokenStats.removeOne({ id: record.id });
    }

    console.log(`🗑️ Cleaned up ${toDelete.length} old daily token stats`);
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

// ============ Helper Functions ============

/**
 * Get ISO week string (YYYY-Www format)
 */
function getISOWeekString(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get ISO week number (1-53)
 */
function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Get week bounds (Monday-Sunday)
 */
function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0]
  };
}
