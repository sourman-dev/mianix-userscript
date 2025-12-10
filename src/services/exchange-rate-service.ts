// file: src/services/exchange-rate-service.ts

import type { ExchangeRateCache } from '@/types/token-stats';

/**
 * Service for fetching and caching USD→VND exchange rate from Vietcombank API
 * Cache TTL: 24 hours
 * API: https://www.vietcombank.com.vn/api/exchangerates?date=YYYY-MM-DD
 */
export class ExchangeRateService {
  private static CACHE_KEY = 'vnd_exchange_rate_cache';
  private static TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Initialize exchange rate service - fetch or use cached data
   * Call this once on userscript load
   */
  static async init(): Promise<void> {
    const cache = this.getCache();

    // Use existing cache if valid
    if (cache && !this.isCacheStale(cache)) {
      console.log('💱 Exchange rate cache valid, skipping fetch');
      return;
    }

    // Fetch fresh data
    try {
      await this.fetchAndCache();
      console.log('💱 Exchange rate fetched and cached');
    } catch (error) {
      console.warn('⚠️ Failed to fetch exchange rate, using stale cache:', error);
      // Continue with stale cache if available
    }
  }

  /**
   * Fetch USD sell rate from Vietcombank API and cache in localStorage
   */
  private static async fetchAndCache(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://www.vietcombank.com.vn/api/exchangerates?date=${today}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Vietcombank API failed: ${response.status}`);
    }

    const data = await response.json();

    // Find USD entry in response
    const usdRate = data.Data?.find((item: any) => item.currencyCode === 'USD');

    if (!usdRate || !usdRate.sell) {
      throw new Error('USD sell rate not found in API response');
    }

    const sellRate = parseFloat(usdRate.sell.replace(/,/g, '')); // Remove commas from "25,123.45"

    const cache: ExchangeRateCache = {
      usdSellRate: sellRate,
      timestamp: Date.now(),
      ttl: this.TTL
    };

    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  /**
   * Get cached exchange rate from localStorage
   */
  private static getCache(): ExchangeRateCache | null {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (!cached) return null;

    try {
      return JSON.parse(cached) as ExchangeRateCache;
    } catch {
      return null;
    }
  }

  /**
   * Check if cache is stale (older than TTL)
   */
  private static isCacheStale(cache: ExchangeRateCache): boolean {
    const age = Date.now() - cache.timestamp;
    return age > cache.ttl;
  }

  /**
   * Convert USD to VND using cached exchange rate
   *
   * @param usd - Amount in USD
   * @returns Amount in VND, or original USD if no cache available
   */
  static convertToVND(usd: number): number {
    const cache = this.getCache();

    if (!cache) {
      console.warn('⚠️ No exchange rate cache available, returning USD value');
      return usd;
    }

    return usd * cache.usdSellRate;
  }

  /**
   * Get current cached USD sell rate (for debugging/UI)
   */
  static getCurrentRate(): number | null {
    const cache = this.getCache();
    return cache?.usdSellRate || null;
  }

  /**
   * Get cache age in hours (for debugging/UI)
   */
  static getCacheAge(): number | null {
    const cache = this.getCache();
    if (!cache) return null;

    const ageMs = Date.now() - cache.timestamp;
    return ageMs / (60 * 60 * 1000); // Convert to hours
  }

  /**
   * Force refresh cache (manual override)
   */
  static async forceRefresh(): Promise<void> {
    await this.fetchAndCache();
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }
}
