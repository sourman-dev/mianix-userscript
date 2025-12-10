# Phase 01: Type Definitions & Data Models

**Date:** 2025-12-09
**Status:** ✅ COMPLETED
**Priority:** High (Foundation)
**Dependencies:** None
**Duration:** 0.5 day (Actual: 0.5 day)

## Context

- [Parent Plan](./plan.md)
- [Research Report](./reports/researcher-251209-token-tracking-patterns.md)
- [Code Standards](../../docs/code-standards.md)

## Overview

Define TypeScript types for token tracking: TokenUsageStats, pricing cache, exchange rates. Extend DialogueMessageType with optional tokenStats field. Add TokenUsageHistory collection to IndexedDB schema.

## Key Insights

- Optional tokenStats field ensures backward compatibility
- Pricing cache mirrors Helicone API response format
- Daily aggregates stored in IndexedDB (TokenUsageHistory)
- Null costs for unknown models (graceful degradation)

## Requirements

### Types Needed
- TokenUsageStats (input/output tokens, USD/VND costs, model/provider)
- ModelPricing (Helicone API format)
- PricingCache (localStorage with TTL)
- ExchangeRateCache (Vietcombank rate with TTL)
- DailyTokenStats (IndexedDB daily aggregates, keep 90 days)
- WeeklyTokenStats (IndexedDB weekly aggregates, keep 52 weeks)
- MonthlyTokenStats (IndexedDB monthly aggregates, keep forever)

### Architecture

```typescript
// src/types/token-stats.d.ts
export interface TokenUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUSD?: number | null;
  costVND?: number | null;
  model: string;
  provider: string;
  timestamp: number;
}

export interface ModelPricing {
  provider: string;
  model: string;
  operator: 'equals' | 'startsWith' | 'includes';
  input_cost_per_1m: number;
  output_cost_per_1m: number;
}

export interface PricingCache {
  data: ModelPricing[];
  timestamp: number;
  ttl: number;
}

export interface ExchangeRateCache {
  usdSellRate: number;
  timestamp: number;
  ttl: number;
}

export interface TokenUsageHistory {
  id: string;
  characterId: string;
  date: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUSD: number;
  totalCostVND: number;
  responseCount: number;
  createdAt: number;
  updatedAt: number;
}

// Extend DialogueMessageType in character.d.ts
tokenStats?: TokenUsageStats;
```

## Related Files

**Create:**
- src/types/token-stats.d.ts

**Modify:**
- src/types/character.d.ts
- src/db/index.ts

## Implementation Steps

1. ✅ Create token-stats.d.ts with all interfaces (TokenUsageStats, ModelPricing, PricingCache, ExchangeRateCache, DailyTokenStats, WeeklyTokenStats, MonthlyTokenStats)
2. ✅ Extend DialogueMessageType in db/index.ts with optional tokenStats field (NOTE: type defined in db/index.ts, not character.d.ts)
3. ✅ Add 3 collections to db/index.ts:
   - ✅ DailyTokenStats (characterId-YYYY-MM-DD format)
   - ✅ WeeklyTokenStats (characterId-YYYY-Www format)
   - ✅ MonthlyTokenStats (characterId-YYYY-MM format)
4. ✅ Run typecheck (via build - passed)

## Success Criteria

- ✅ TypeScript strict mode passes (strict: true, build successful)
- ✅ Backward compatible DialogueMessageType (optional tokenStats field)
- ✅ IndexedDB schema updated (3 new collections)
- ✅ No breaking changes (verified via successful build)

## Code Review

- **Report:** [code-reviewer-251209-phase01-token-types.md](./reports/code-reviewer-251209-phase01-token-types.md)
- **Score:** 9.5/10 - EXCELLENT
- **Status:** ✅ APPROVED for Phase 02

### Action Items Before Phase 02
- [ ] Update documentation: Fix `TokenUsageHistory` → `DailyTokenStats/WeeklyTokenStats/MonthlyTokenStats` references in plan files
- [ ] Enhance IndexedDB collection comments to clarify primary key strategy

## Risks

- Breaking changes: Mitigated by optional tokenStats field
- IndexedDB migration: New collection, no migration needed

→ Next: [Phase 02: API Integration](./phase-02-api-integration.md)
