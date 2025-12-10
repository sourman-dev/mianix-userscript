# Token Statistics & Cost Estimation - Implementation Plan

**Created:** 2025-12-09
**Status:** Planning
**Estimated Duration:** 4-6 phases

## Overview

Build module to track LLM token usage (input/output) and estimate costs per response + per day per character. Use Helicone pricing API + Vietcombank exchange rate API, cache in localStorage. Show token counts for unknown models (no cost estimation). Update LLMProviderSelect to hardcoded provider list.

## Success Criteria

- ✅ Track tokens per LLM response (input/output)
- ✅ Aggregate daily stats per character
- ✅ Fetch Helicone pricing + Vietcombank rate once on load, cache in localStorage
- ✅ Display cost in VND for known models
- ✅ Display token counts only for unknown models (graceful degradation)
- ✅ Non-blocking operations, no UI lag
- ✅ LLMProviderSelect uses hardcoded provider list

## Phase Breakdown

### [Phase 01: Type Definitions & Data Models](./phase-01-types.md)
Extend DialogueMessageType with token stats, create TokenUsageStats interface, pricing cache types, exchange rate types. Update existing types to support token tracking.

### [Phase 02: API Integration Layer](./phase-02-api-integration.md)
Create services for Helicone LLM pricing API + Vietcombank exchange rate API. Implement localStorage caching with TTL, fetch on userscript load, graceful fallback for API failures.

### [Phase 03: Token Tracking Service](./phase-03-token-tracking.md)
Intercept LLM responses in llm-fetch.ts, extract token data from API response, calculate cost using pricing cache, store per-response stats in DialogueMessageType.

### [Phase 04: Statistics Aggregation Store](./phase-04-stats-store.md)
Create tokenStatsStore (Pinia) for per-character, per-day aggregation. Use IndexedDB for historical token usage data. Provide getters for daily/weekly/monthly stats.

### [Phase 05: UI Components](./phase-05-ui-components.md)
Create TokenStatsDisplay component for per-response stats in ChatScreen. Create TokenStatsDashboard for daily/character aggregated stats. Graceful UI for unknown models.

### [Phase 06: LLMProviderSelect Hardcoded Update](./phase-06-provider-select.md)
Replace API-based provider fetching in LLMProviderSelect.vue with hardcoded provider list from PROVIDERS.md. Remove API dependency.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Userscript Load                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ PricingService.init() + ExchangeRateService.init()        │  │
│  │ ► Fetch Helicone API (cache 7 days in localStorage)      │  │
│  │ ► Fetch Vietcombank API (cache 24h in localStorage)      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Request Flow                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ llm-fetch.ts: sendOpenAiRequestFetch()                    │  │
│  │ ► Intercept API response                                  │  │
│  │ ► Extract usage: { prompt_tokens, completion_tokens }    │  │
│  │ ► TokenTrackingService.calculateCost(model, usage)       │  │
│  │ ► Store in DialogueMessage.tokenStats                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Management                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ tokenStatsStore (Pinia)                                   │  │
│  │ ► Reactive per-message stats                             │  │
│  │ ► Aggregate daily stats per character (IndexedDB)        │  │
│  │ ► Getters: todayUsage(), weekUsage(), monthUsage()       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ TokenStatsDisplay.vue (per-response, in ChatScreen)      │  │
│  │ TokenStatsDashboard.vue (aggregated, new screen)         │  │
│  │ ► Show cost in VND for known models                      │  │
│  │ ► Show token counts only for unknown models              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## File Inventory

**New Files:**
- `src/types/token-stats.d.ts` - Token usage types
- `src/services/pricing-service.ts` - Helicone API integration + cache
- `src/services/exchange-rate-service.ts` - Vietcombank API + cache
- `src/services/token-tracking-service.ts` - Cost calculation logic
- `src/stores/token-stats.ts` - Pinia store for aggregation
- `src/components/token_stats/TokenStatsDisplay.vue` - Per-response UI
- `src/components/token_stats/TokenStatsDashboard.vue` - Aggregated UI
- `src/constants/providers.ts` - Hardcoded provider list

**Modified Files:**
- `src/types/character.d.ts` - Extend DialogueMessageType
- `src/db/index.ts` - Add TokenUsageHistory collection (IndexedDB)
- `src/utils/llm-fetch.ts` - Integrate token tracking
- `src/components/common/LLMProviderSelect.vue` - Use hardcoded providers
- `src/stores/dialogue.ts` - Call tokenStatsStore on message save

## Integration Points

1. **llm-fetch.ts → TokenTrackingService**: Extract `usage` from response, calculate cost
2. **dialogue.ts store → tokenStatsStore**: Save token stats when message completes
3. **ChatScreen.vue → TokenStatsDisplay**: Show per-response cost/tokens
4. **New screen → TokenStatsDashboard**: Show aggregated daily stats

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| API rate limits (Helicone/VCB) | Low | Cache 7d/24h, fallback to stale data |
| Unknown models (no pricing) | High | Show tokens only, no cost estimation |
| Token count inaccuracy | Medium | Use API-reported usage, not client estimates |
| IndexedDB quota exceeded | Low | Cleanup old stats after 90 days |
| Streaming response token tracking | Medium | Extract from final response metadata |

## Next Steps

Start with Phase 01 (Type Definitions). Each phase builds incrementally.
