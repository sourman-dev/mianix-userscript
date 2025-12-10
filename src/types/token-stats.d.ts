// file: src/types/token-stats.d.ts

/**
 * Token usage statistics for a single LLM response
 * Tracks input/output tokens and calculated costs (USD + VND)
 */
export interface TokenUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD?: number | null;      // null for unknown models
  costVND?: number | null;      // null for unknown models
  model: string;
  provider: string;
  timestamp: number;
}

/**
 * Model pricing data from Helicone API
 * Costs are per 1 million tokens (USD)
 */
export interface ModelPricing {
  provider: string;
  model: string;
  operator: 'equals' | 'startsWith' | 'includes';
  input_cost_per_1m: number;
  output_cost_per_1m: number;
}

/**
 * Pricing cache stored in localStorage
 * TTL: 7 days
 */
export interface PricingCache {
  data: ModelPricing[];
  timestamp: number;
  ttl: number; // Milliseconds
}

/**
 * Exchange rate cache stored in localStorage  
 * TTL: 24 hours
 */
export interface ExchangeRateCache {
  usdSellRate: number;
  timestamp: number;
  ttl: number; // Milliseconds
}

/**
 * Daily token usage aggregates (IndexedDB)
 * Retention: 90 days (auto-cleanup)
 */
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

/**
 * Weekly token usage aggregates (IndexedDB)
 * Retention: 52 weeks
 */
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

/**
 * Monthly token usage aggregates (IndexedDB)
 * Retention: Forever
 */
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
