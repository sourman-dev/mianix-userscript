# Token Statistics Module - Implementation Plan Summary

**Plan Created:** 2025-12-09
**Status:** Ready for Review
**Total Phases:** 6
**Estimated Duration:** 4-6 days

## Overview

Comprehensive plan for implementing token usage tracking and cost estimation module. Tracks LLM token consumption (input/output) per response and aggregates daily statistics per character. Integrates Helicone pricing API and Vietcombank exchange rate API with localStorage caching.

## Research Completed

✅ **2 Research Agents (Parallel Execution)**
- Token tracking patterns in web apps (localStorage vs IndexedDB)
- LLM pricing API integration and caching strategies

✅ **3 Scout Agents (Parallel Execution)**
- API services: llm-fetch.ts, llm-smart.ts, prompt-utils.ts, worldbook-validation.ts
- Chat components: ChatScreen.vue, MessageButtons.vue, EditMessageModal.vue
- Stores & types: dialogue.ts, DialogueMessageType, LLMOptions, LLMModel

## Plan Structure

```
plans/251209-2130-token-statistics/
├── plan.md                      # Main plan (overview, phases, architecture)
├── phase-01-types.md            # Type definitions & data models
├── phase-02-api-integration.md  # Helicone + Vietcombank APIs
├── phase-03-token-tracking.md   # Token extraction service
├── phase-04-stats-store.md      # Pinia store for aggregation
├── phase-05-ui-components.md    # Stats display UI
├── phase-06-provider-select.md  # Hardcode provider list
├── research/
│   └── researcher-251209-pricing-api-integration.md
└── reports/
    └── researcher-251209-token-tracking-patterns.md
```

## Key Features

### Token Tracking
- Extract token usage from LLM API responses (streaming + non-streaming)
- Track input/output tokens per message
- Calculate costs in USD and VND
- Graceful degradation for unknown models (show tokens only, no cost)

### Cost Estimation
- Helicone API for LLM pricing (per 1M tokens)
- Vietcombank API for USD→VND exchange rate
- localStorage caching (7 days pricing, 24h exchange rate)
- Fetch APIs once on userscript load

### Data Storage
- **Per-response:** DialogueMessageType.tokenStats (optional field)
- **Aggregated:** IndexedDB TokenUsageHistory collection (daily stats per character)
- **Caching:** localStorage for pricing/exchange rate data

### UI Components
- TokenStatsDisplay: Inline stats in ChatScreen per message
- TokenStatsDashboard: Aggregated daily/weekly/monthly stats
- Graceful UI for unknown models

## Implementation Phases

| Phase | Focus | Duration | Status |
|-------|-------|----------|--------|
| 01 | Type definitions & data models | 0.5 day | Pending |
| 02 | API integration (Helicone + Vietcombank) | 1 day | Pending |
| 03 | Token tracking service | 1 day | Pending |
| 04 | Statistics aggregation store | 1 day | Pending |
| 05 | UI components | 1.5 days | Pending |
| 06 | LLMProviderSelect hardcoded update | 0.5 day | Pending |

**Total:** 5.5 days (estimated)

## Technical Architecture

```
Userscript Load
    ↓
PricingService.init() + ExchangeRateService.init()
    ↓ (localStorage cache, 7d + 24h TTL)
LLM Request (llm-fetch.ts)
    ↓ (extract usage from response)
TokenTrackingService.calculateCost()
    ↓ (attach to DialogueMessageType.tokenStats)
TokenStatsStore.recordUsage()
    ↓ (IndexedDB daily aggregates)
UI: TokenStatsDisplay + TokenStatsDashboard
```

## Files to Create (8)

1. `src/types/token-stats.d.ts` - Type definitions
2. `src/services/pricing-service.ts` - Helicone API + cache
3. `src/services/exchange-rate-service.ts` - Vietcombank API + cache
4. `src/services/token-tracking-service.ts` - Cost calculation
5. `src/stores/token-stats.ts` - Pinia store for aggregation
6. `src/components/token_stats/TokenStatsDisplay.vue` - Per-response UI
7. `src/components/token_stats/TokenStatsDashboard.vue` - Aggregated UI
8. `src/constants/providers.ts` - Hardcoded provider list

## Files to Modify (5)

1. `src/types/character.d.ts` - Extend DialogueMessageType
2. `src/db/index.ts` - Add TokenUsageHistory collection
3. `src/utils/llm-fetch.ts` - Integrate token tracking
4. `src/components/common/LLMProviderSelect.vue` - Use hardcoded providers
5. `src/stores/dialogue.ts` - Call tokenStatsStore on message save

## Success Criteria

- [ ] Token counts tracked for every LLM response
- [ ] Costs calculated accurately (USD + VND)
- [ ] Daily aggregates computed per character
- [ ] localStorage cache working (7d pricing, 24h rate)
- [ ] UI displays token/cost stats per message
- [ ] Dashboard shows daily/weekly aggregates
- [ ] Unknown models show tokens only (no cost)
- [ ] LLMProviderSelect uses hardcoded list
- [ ] No performance degradation
- [ ] TypeScript strict mode passes

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| API rate limits | Cache 7d/24h, minimize calls |
| Unknown model pricing | Show tokens only, log for manual review |
| Streaming response token extraction | Parse final SSE chunk metadata |
| IndexedDB quota | Cleanup old stats after 90 days |
| Performance impact | Async operations, non-blocking |

## Next Steps

1. **User Review:** Review plan structure and phases
2. **Phase 01 Start:** Implement type definitions
3. **Sequential Execution:** Complete phases 01→06 in order
4. **Testing:** Validate at each phase completion
5. **Integration:** Final integration testing

## Unresolved Questions

1. Preferred Vietcombank rate (cash/transfer/sell)? → Using "sell" rate
2. Token cleanup strategy for IndexedDB? → 90-day retention suggested
3. Should dashboard be new screen or modal? → New screen recommended
4. Real-time stats updates or on-demand? → On-demand with manual refresh

---

**Plan Ready for Implementation**
