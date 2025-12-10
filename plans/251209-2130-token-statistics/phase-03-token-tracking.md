# Phase 03: Token Tracking Service

**Date:** 2025-12-09
**Status:** Pending
**Dependencies:** Phase 01, Phase 02
**Duration:** 1 day

## Overview

Intercept LLM API responses in llm-fetch.ts, extract token usage data, calculate costs using PricingService, attach to DialogueMessageType.

## Key Implementation

```typescript
// src/services/token-tracking-service.ts
export class TokenTrackingService {
  static extractTokenUsage(response: any, model: string, provider: string): TokenUsageStats | null {
    const usage = response.usage;
    if (!usage) return null;
    
    const pricing = PricingService.findModelPricing(provider, model);
    const costUSD = pricing ? 
      PricingService.calculateCost(pricing, usage.prompt_tokens, usage.completion_tokens) : null;
    const costVND = costUSD ? ExchangeRateService.convertToVND(costUSD) : null;
    
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      costUSD,
      costVND,
      model,
      provider,
      timestamp: Date.now()
    };
  }
}
```

## Integration Points

- llm-fetch.ts: Extract usage from API response, call TokenTrackingService
- dialogue.ts: Save tokenStats to DialogueMessageType
- Handle streaming responses (extract from final chunk)

## Files

**Create:** src/services/token-tracking-service.ts
**Modify:** src/utils/llm-fetch.ts, src/stores/dialogue.ts

→ Next: [Phase 04: Statistics Store](./phase-04-stats-store.md)
