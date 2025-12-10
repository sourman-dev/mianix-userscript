# Phase 02: API Integration Layer

**Date:** 2025-12-09
**Status:** Pending
**Priority:** High
**Dependencies:** Phase 01
**Duration:** 1 day

## Context

- [Parent Plan](./plan.md)
- [Phase 01](./phase-01-types.md)
- [Pricing API Research](./research/researcher-251209-pricing-api-integration.md)
- [docs/PROVIDERS.md](../../docs/PROVIDERS.md)

## Overview

Create services to fetch + cache Helicone LLM pricing and Vietcombank exchange rates. Fetch once on userscript load, cache in localStorage with TTL. Graceful fallback for API failures.

## Key Insights

- Helicone API: https://www.helicone.ai/api/llm-costs (7-day cache)
- Vietcombank API: date=YYYY-MM-DD format, extract USD sell rate (24h cache)
- localStorage caching reduces API calls, prevents rate limits
- Graceful degradation: stale data better than no data

## Requirements

### API Integration
- Fetch Helicone pricing data on userscript load
- Fetch Vietcombank USD sell rate on load
- Cache both in localStorage with TTL
- Check cache freshness before re-fetching
- Fallback to stale cache if API fails

## Architecture

```typescript
// src/services/pricing-service.ts
export class PricingService {
  private static CACHE_KEY = 'llm_pricing_cache';
  private static TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  static async init(): Promise<void> {
    const cache = this.getCache();
    if (cache && !this.isCacheStale(cache)) return;
    await this.fetchAndCache();
  }
  
  static async fetchAndCache(): Promise<void> {
    const response = await fetch('https://www.helicone.ai/api/llm-costs');
    const data = await response.json();
    const cache: PricingCache = {
      data: data.data,
      timestamp: Date.now(),
      ttl: this.TTL
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }
  
  static findModelPricing(provider: string, model: string): ModelPricing | null {
    const cache = this.getCache();
    if (!cache) return null;
    
    // Match by operator: equals > startsWith > includes
    const exact = cache.data.find(p => 
      p.provider === provider && p.model === model && p.operator === 'equals'
    );
    if (exact) return exact;
    
    const startsWith = cache.data.find(p =>
      p.provider === provider && model.startsWith(p.model) && p.operator === 'startsWith'
    );
    if (startsWith) return startsWith;
    
    const includes = cache.data.find(p =>
      p.provider === provider && model.includes(p.model) && p.operator === 'includes'
    );
    return includes || null;
  }
  
  static calculateCost(pricing: ModelPricing, inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * pricing.input_cost_per_1m;
    const outputCost = (outputTokens / 1_000_000) * pricing.output_cost_per_1m;
    return inputCost + outputCost;
  }
}

// src/services/exchange-rate-service.ts
export class ExchangeRateService {
  private static CACHE_KEY = 'vnd_exchange_rate_cache';
  private static TTL = 24 * 60 * 60 * 1000; // 24 hours
  
  static async init(): Promise<void> {
    const cache = this.getCache();
    if (cache && !this.isCacheStale(cache)) return;
    await this.fetchAndCache();
  }
  
  static async fetchAndCache(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://www.vietcombank.com.vn/api/exchangerates?date=${today}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const usdRate = data.Data.find((d: any) => d.currencyCode === 'USD');
    const sellRate = parseFloat(usdRate.sell);
    
    const cache: ExchangeRateCache = {
      usdSellRate: sellRate,
      timestamp: Date.now(),
      ttl: this.TTL
    };
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }
  
  static convertToVND(usd: number): number {
    const cache = this.getCache();
    return cache ? usd * cache.usdSellRate : usd;
  }
}
```

## Related Files

**Create:**
- src/services/pricing-service.ts
- src/services/exchange-rate-service.ts

**Modify:**
- src/main.ts (call init() on load)

## Implementation Steps

1. Create pricing-service.ts with Helicone API integration
2. Create exchange-rate-service.ts with Vietcombank API
3. Implement localStorage caching with TTL checks
4. Add graceful fallback for API failures
5. Call init() in main.ts on userscript load
6. Test with network offline (should use stale cache)

## Success Criteria

- Pricing data cached for 7 days
- Exchange rate cached for 24 hours
- APIs called once per session (if cache valid)
- Graceful fallback to stale data on API failure
- No blocking operations on userscript load

## Risks

- API rate limits: Cache 7d/24h minimizes calls
- API downtime: Fallback to stale cache
- CORS errors: Proxy through backend if needed

→ Next: [Phase 03: Token Tracking Service](./phase-03-token-tracking.md)
