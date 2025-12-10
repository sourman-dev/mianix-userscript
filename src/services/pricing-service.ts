// file: src/services/pricing-service.ts

import type { ModelPricing, PricingCache } from '@/types/token-stats';

/**
 * Service for fetching and caching LLM pricing data from Helicone API
 * Cache TTL: 7 days
 * API: https://www.helicone.ai/api/llm-costs
 */
export class PricingService {
  private static CACHE_KEY = 'llm_pricing_cache';
  private static TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  /**
   * Initialize pricing service - fetch or use cached data
   * Call this once on userscript load
   */
  static async init(): Promise<void> {
    const cache = this.getCache();

    // Use existing cache if valid
    if (cache && !this.isCacheStale(cache)) {
      console.log('💰 Pricing cache valid, skipping fetch');
      return;
    }

    // Fetch fresh data
    try {
      await this.fetchAndCache();
      console.log('💰 Pricing data fetched and cached');
    } catch (error) {
      console.warn('⚠️ Failed to fetch pricing data, using stale cache:', error);
      // Continue with stale cache if available
    }
  }

  /**
   * Fetch pricing data from Helicone API and cache in localStorage
   */
  private static async fetchAndCache(): Promise<void> {
    const response = await fetch('https://www.helicone.ai/api/llm-costs');

    if (!response.ok) {
      throw new Error(`Helicone API failed: ${response.status}`);
    }

    const data = await response.json();

    const cache: PricingCache = {
      data: data.data || data, // Handle both {data: [...]} and [...] formats
      timestamp: Date.now(),
      ttl: this.TTL
    };

    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  /**
   * Get cached pricing data from localStorage
   */
  private static getCache(): PricingCache | null {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (!cached) return null;

    try {
      return JSON.parse(cached) as PricingCache;
    } catch {
      return null;
    }
  }

  /**
   * Check if cache is stale (older than TTL)
   */
  private static isCacheStale(cache: PricingCache): boolean {
    const age = Date.now() - cache.timestamp;
    return age > cache.ttl;
  }

  /**
   * Find pricing for a specific provider/model combination
   * Matching priority: equals > startsWith > includes
   *
   * @returns ModelPricing or null if not found
   */
  static findModelPricing(provider: string, model: string): ModelPricing | null {
    const cache = this.getCache();
    if (!cache || !cache.data) return null;

    // Normalize provider/model for case-insensitive matching
    const providerLower = provider.toLowerCase();
    const modelLower = model.toLowerCase();

    // 1. Try exact match first
    const exact = cache.data.find(p =>
      p.provider.toLowerCase() === providerLower &&
      p.model.toLowerCase() === modelLower &&
      p.operator === 'equals'
    );
    if (exact) return exact;

    // 2. Try startsWith match
    const startsWith = cache.data.find(p =>
      p.provider.toLowerCase() === providerLower &&
      modelLower.startsWith(p.model.toLowerCase()) &&
      p.operator === 'startsWith'
    );
    if (startsWith) return startsWith;

    // 3. Try includes match
    const includes = cache.data.find(p =>
      p.provider.toLowerCase() === providerLower &&
      modelLower.includes(p.model.toLowerCase()) &&
      p.operator === 'includes'
    );

    return includes || null;
  }

  /**
   * Calculate cost (USD) for a given token usage
   *
   * @param pricing - Model pricing data
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Total cost in USD
   */
  static calculateCost(
    pricing: ModelPricing,
    inputTokens: number,
    outputTokens: number
  ): number {
    const inputCost = (inputTokens / 1_000_000) * pricing.input_cost_per_1m;
    const outputCost = (outputTokens / 1_000_000) * pricing.output_cost_per_1m;
    return inputCost + outputCost;
  }

  /**
   * Get all cached pricing data (for debugging/UI)
   */
  static getAllPricing(): ModelPricing[] | null {
    const cache = this.getCache();
    return cache?.data || null;
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
