# Phase 06: LLMProviderSelect Hardcoded Update

**Date:** 2025-12-09
**Status:** Pending
**Dependencies:** None (can run parallel)
**Duration:** 0.5 day

## Overview

Replace API-based provider fetching in LLMProviderSelect.vue with hardcoded provider list from docs/PROVIDERS.md.

## Implementation

```typescript
// src/constants/providers.ts
export const LLM_PROVIDERS = [
  'ANTHROPIC', 'AVIAN', 'AWS', 'AZURE', 'BEDROCK',
  'COHERE', 'DEEPSEEK', 'FIREWORKS', 'GOOGLE', 'GROQ',
  'LLAMA', 'MISTRAL', 'NEBIUS', 'NOVITA', 'OPENAI',
  'OPENROUTER', 'PERPLEXITY', 'QSTASH', 'TOGETHER', 'VERCEL', 'X'
] as const;

export type LLMProvider = typeof LLM_PROVIDERS[number];
```

## Files

**Create:** src/constants/providers.ts
**Modify:** src/components/common/LLMProviderSelect.vue

## Changes

- Remove `getLLMProviders()` API call
- Import `LLM_PROVIDERS` from constants
- Remove caching logic (no longer needed)

→ Complete
