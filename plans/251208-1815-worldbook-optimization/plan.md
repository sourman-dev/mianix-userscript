# Worldbook Optimization Implementation Plan

**Date:** 2025-12-08
**Goal:** Reduce worldbook token usage 50-70% via selective injection + RAG
**Status:** Phase 01-03 Complete | Phase 05 Ready

## Objective

Transform worldbook injection from "all-matching" to "relevance-ranked" with hybrid retrieval (keyword + semantic).

## Implementation Phases

| Phase | Name | Priority | Deps | Status | Review |
|-------|------|----------|------|--------|--------|
| 01 | [WorldbookService + Embeddings](./phase-01-worldbook-service.md) | P0 | None | ✅ Complete (Review Issues) | [Report](./reports/code-reviewer-251208-worldbook-phase01-phase02.md) |
| 02 | [Worldbook Editor UI](./phase-02-editor-ui.md) | P0 | None | ✅ Complete (Review Issues) | [Report](./reports/code-reviewer-251208-worldbook-phase01-phase02.md) |
| 03 | [Hybrid Retrieval Integration](./phase-03-hybrid-retrieval.md) | P0 | Phase 01 | ✅ Complete | Tests 35/35 passed |
| 04 | [Global Worldbooks](./phase-04-global-worldbooks.md) | P1 | Phase 02 | ⏸️ Pending | Optional feature |
| 05 | [Testing + Migration](./phase-05-testing-migration.md) | P0 | All | 🔄 Ready | Phase 01-03 complete |

**Parallel Execution:** Phase 01 and Phase 02 can run concurrently.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Prompt Generation                         │
│  buildFinalPrompt() ──► getRelevantWorldBookEntries()       │
│                              │                               │
│                              ▼                               │
│                   ┌──────────────────┐                       │
│                   │ Hybrid Retrieval │                       │
│                   └────────┬─────────┘                       │
│                            │                                 │
│              ┌─────────────┴─────────────┐                   │
│              ▼                           ▼                   │
│     ┌────────────────┐        ┌───────────────────┐          │
│     │ Keyword Filter │        │ Semantic Ranking  │          │
│     │ (existing)     │        │ (WorldbookService)│          │
│     └───────┬────────┘        └─────────┬─────────┘          │
│             │                           │                    │
│             └─────────────┬─────────────┘                    │
│                           ▼                                  │
│                    ┌─────────────┐                           │
│                    │ Top-K Select│ (limit: 5, threshold: 0.5)│
│                    └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Key Files to Modify

| File | Change |
|------|--------|
| `src/services/worldbook-service.ts` | NEW: RAG logic |
| `src/components/worldbook/WorldbookEditor.vue` | NEW: Editor UI |
| `src/utils/prompt-utils.ts` | MODIFY: Hybrid retrieval |
| `src/types/character.d.ts` | MODIFY: Add `embedding` field |
| `src/db/index.ts` | MODIFY: Add GlobalWorldbooks collection |
| `src/constants.ts` | MODIFY: Add WORLDBOOK_EDITOR screen |

## Success Criteria

1. Token reduction: 50-70% fewer worldbook tokens injected
2. Relevance: Top-K entries match context semantically
3. Fallback: Keyword-only if no embeddings configured
4. Compatibility: SillyTavern import/export unchanged
5. UX: Edit worldbooks without docs

## Research References

- [Researcher 01: Token Optimization](./research/researcher-01-report.md)
- [Researcher 02: UI/UX Patterns](./research/researcher-02-report.md)
- [Codebase Analysis](./reports/codebase-analysis.md)
- [Synthesis Report](./reports/synthesis-report.md)
