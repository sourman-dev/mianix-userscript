# UI Enhancements Plan

**Date:** 2025-12-09
**Status:** Planning
**Priority:** P0

## Context

Enhancement plan for mianix-userscript UI: (1) NSFW toggle in Translate.vue to mask character avatars, (2) alternate greetings selector in ProfileSelectorModal.

## Phase Overview

| Phase | Name | Priority | Status | Est. Lines |
|-------|------|----------|--------|------------|
| 01 | NSFW Toggle | P0 | Pending | ~50 |
| 02 | Greeting Selector | P0 | Pending | ~40 |

## Architecture

```
CharacterCardType (db/index.ts)     CharacterCardData (types/character.d.ts)
        │                                     │
        ├── isNSFW: boolean (NEW)             │ (no change needed)
        │                                     │
        v                                     v
   Translate.vue ─────────────────> CharacterAvatar.vue
   (add toggle)                     (conditional render)
        │
        └── LLM verified: uses sendOpenAiRequestStream()

ProfileSelectorModal.vue
        │
        └── Add greeting selector dropdown + preview textarea
```

## Key Files

| File | Changes | Phase |
|------|---------|-------|
| `src/db/index.ts:22-29` | Add `isNSFW?: boolean` to CharacterCardType | 01 |
| `src/components/character_cards/Translate.vue:14-23` | Add NSFW toggle UI | 01 |
| `src/components/character_cards/Translate.vue:254-265` | Update save handler | 01 |
| `src/components/character_cards/CharacterAvatar.vue` | Add isNSFW prop, conditional render | 01 |
| `src/components/profiles/ProfileSelectorModal.vue` | Add greeting selector | 02 |
| `src/components/character_cards/Index.vue:52` | Pass greeting index to modal | 02 |

## Phase Files

- [Phase 01: NSFW Toggle](./phase-01-nsfw-toggle.md)
- [Phase 02: Greeting Selector](./phase-02-greeting-selector.md)

## Dependencies

- PrimeVue 4.3.5 components (ToggleSwitch, Select, Textarea)
- APP_LOGO constant from `src/constants.ts`
- CharacterCard class from `src/db/index.ts`

## LLM Verification (Phase 01)

Lines 162-179 in Translate.vue:
- Uses `sendOpenAiRequestStream()` from `@/utils/llm`
- Passes `baseURL`, `apiKey`, `modelName` from `defaultLLMModel`
- Proxy/API usage is CORRECT - no changes needed

## Success Criteria

1. NSFW toggle visible in Translate.vue General Info section
2. NSFW state persists to IndexedDB via CharacterCards collection
3. CharacterAvatar shows APP_LOGO when isNSFW=true
4. Greeting selector appears when alternate_greetings.length > 0
5. "Random" option uses existing `characterCard.getGreeting()` behavior
6. Selected greeting preview shows in readonly Textarea
7. Build passes with no TypeScript errors
