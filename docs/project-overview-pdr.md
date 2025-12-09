# Project Overview & Product Development Requirements (PDR)

**Project:** Mianix Userscript
**Version:** 1.0.0 (Phase 01-02 Complete)
**Last Updated:** 2025-12-08
**Status:** Active Development

## Executive Summary

Mianix is a browser userscript that enhances roleplay conversations by integrating character management, memory retrieval (RAG), and worldbook context injection. The system reduces token usage 50-70% via selective semantic retrieval while maintaining context relevance.

**Key Achievement (Phase 01-02):** Implemented worldbook system with embedding-based semantic ranking, enabling hybrid retrieval (keyword + semantic).

## Product Vision

### Problem Statement
- Users managing multiple AI characters spend excessive tokens on worldbook injection
- All matching worldbook entries injected indiscriminately (wasteful)
- No semantic understanding of relevance
- Memory-only system insufficient for complex worldbuilding
- **NEW (Phase 04):** Worldbook duplication across characters; no shared context management

### Solution
- **Semantic Worldbook Retrieval:** Top-K ranking via embedding similarity
- **Hybrid Retrieval:** Keyword pre-filtering + semantic ranking
- **Selective Injection:** Only relevant entries passed to model (50-70% token reduction)
- **Graceful Degradation:** Fallback to keyword-only if no embeddings
- **NEW (Phase 04):** Global worldbooks with per-character linking; merged retrieval

### Target Users
- Roleplay enthusiasts managing multiple characters
- Creative writers needing rich context
- Power users optimizing token usage
- **NEW:** Campaign/setting authors needing shared worldbooks across characters

## Functional Requirements

### F1: Character Management
- Multi-character support with persistent storage
- Character profiles (name, description, avatar)
- Per-character worldbooks and memories
- Import/export (SillyTavern compatible)
- Auto-save on modifications
- **Status:** ✅ Implemented

### F2: Memory System (RAG)
- Embedding-based semantic search
- Configurable embedding model
- Memory threshold: 0.5 (cosine similarity)
- IndexedDB persistent storage
- Graceful fallback without embeddings
- **Status:** ✅ Implemented (from prior work)

### F3: Worldbook Management (NEW - Phase 01-02)
- Keyword-based entry filtering
- Optional semantic ranking via embeddings
- DataTable UI for entry management
- Add/edit/delete entry forms
- Embedding progress tracking
- **Status:** ✅ Completed (Needs fixes per review)

### F4: Chat Interface
- Multi-model support (OpenAI, Claude, Ollama, etc.)
- Streaming response support
- Auto-detect provider from API key format
- Prompt building with memory/worldbook injection
- **Status:** ✅ Implemented

### F5: Hybrid Retrieval (In Progress - Phase 03)
- Keyword pre-filtering of worldbook entries
- Semantic ranking with threshold (0.5)
- Top-K selection (limit: 5)
- Integration into prompt generation
- **Status:** ⏸️ Blocked (awaiting Phase 01/02 fixes)

### F6: Global Worldbooks (Phase 04 - Complete)
- Shared worldbooks across characters
- Create/edit/delete global worldbooks
- Per-character linking (many-to-many)
- Merged retrieval (global + character entries)
- UI for management (GlobalWorldbookManager)
- Navigation menu integration
- **Status:** ✅ Implemented

## Non-Functional Requirements

### NFR1: Performance
- Embedding generation non-blocking (async)
- Hybrid retrieval < 200ms
- UI responsiveness maintained during heavy operations
- Token reduction: 50-70% vs. all-matching strategy
- **Metric:** Measure token count before/after injection

### NFR2: Reliability
- Graceful degradation without embedding model
- IndexedDB fallback if API unavailable
- Error recovery without data loss
- Support for 100+ worldbook entries per character
- **Metric:** 99.9% uptime (userscript context)

### NFR3: Maintainability
- Clear separation of concerns (services, stores, components)
- Reuse existing patterns (MemoryService, Pinia stores)
- Comprehensive error handling
- TypeScript strict mode
- **Metric:** Code review pass rate > 95%

### NFR4: Security
- Embeddings stored locally (no transmission except for generation)
- Type-safe character/worldbook references
- Input validation on all forms
- XSS protection via Vue escaping
- **Metric:** Zero security vulnerabilities in review

### NFR5: Compatibility
- SillyTavern import/export format unchanged
- Backward compatible with existing characters
- Works in Chrome/Firefox/Edge userscript environment
- No breaking API changes
- **Metric:** 100% compatibility with existing data

## Architecture Overview

### Layered Architecture
```
UI Layer (Vue Components)
    ↓
State Management (Pinia Stores)
    ↓
Service Layer (RAG, Embedding, API)
    ↓
Data Persistence (IndexedDB)
```

### Key Components
- **WorldbookService:** Embedding generation + semantic search
- **worldbookStore:** State management for entries and UI
- **WorldbookEditor:** UI for entry management
- **Hybrid Retrieval:** Keyword + semantic ranking (Phase 03)

## Implementation Timeline

| Phase | Duration | Status | Description |
|-------|----------|--------|-------------|
| 01 | Dec 08 | ✅ Complete | WorldbookService + embeddings |
| 02 | Dec 08 | ✅ Complete | Worldbook Editor UI |
| 03 | Dec 09-10 | ⏸️ Blocked | Hybrid retrieval integration |
| 04 | Dec 09 | ✅ Complete | Global worldbooks system |
| 05 | Dec 13-14 | ⏸️ Pending | Testing + migration |

**Note:** Phase 04 delivered without Phase 01/02 blockers being fully resolved. Phase 03 remains blocked by code review issues.

## Success Criteria

### Phase 01-02 (Completed)
- [x] WorldbookService creates embeddings for entries
- [x] Worldbook Editor UI allows add/edit/delete operations
- [x] Embedding progress tracked and displayed
- [x] Fallback works without embedding model
- [ ] Code review issues resolved (BLOCKING Phase 03)

### Phase 03 (Pending)
- [ ] Hybrid retrieval integrated into prompt generation
- [ ] Keyword pre-filtering working correctly
- [ ] Semantic ranking produces relevant entries
- [ ] Token reduction measured (target: 50-70%)

### Phase 04 (Completed)
- [x] Global worldbooks created via GlobalWorldbookManager UI
- [x] Per-character linking of global worldbooks (many-to-many)
- [x] Merged retrieval combines global + character entries
- [x] WorldbookLinker component for character-to-global links
- [x] Navigation menu integrated

### Phase 05 (Pending)
- [ ] Unit tests for services (>80% coverage)
- [ ] Component tests for UI (>70% coverage)
- [ ] Migration guide for existing users
- [ ] Production deployment successful

## Dependencies & Constraints

### Technical Dependencies
- Vue 3 with Composition API
- TypeScript 5+ (strict mode)
- Pinia for state management
- IndexedDB (dexie) for persistence
- Embedding model (OpenAI, local, or fallback)

### External Constraints
- Browser userscript environment (CSP limitations)
- No backend server (client-side only)
- API key required for embedding generation
- Rate limiting from embedding providers

### Integration Points
- SillyTavern character export format
- OpenAI/Anthropic/Ollama API endpoints
- IndexedDB browser storage

## Risk Assessment

### High Risk
1. **Store Import Race Condition** (Phase 02)
   - Risk: UI may fail silently if service not loaded
   - Mitigation: Replace with direct import
   - Owner: Development team
   - Status: Identified, awaiting fix

2. **Missing Input Validation** (Phase 02)
   - Risk: Invalid data may corrupt worldbooks
   - Mitigation: Add validation in addEntry/updateEntry
   - Owner: Development team
   - Status: Identified, awaiting fix

### Medium Risk
3. **Embedding Model Unavailable**
   - Risk: Fallback to keyword-only reduces effectiveness
   - Mitigation: Clear error messages, graceful degradation
   - Owner: Product team
   - Status: Designed, needs testing

4. **Token Reduction Expectations**
   - Risk: 50-70% target may not be achievable
   - Mitigation: Measure actual reduction, adjust targets
   - Owner: QA team
   - Status: To be measured in Phase 05

### Low Risk
5. **Backward Compatibility**
   - Risk: Breaking changes with existing characters
   - Mitigation: Maintain SillyTavern format
   - Owner: Development team
   - Status: Type system enforces compatibility

## Acceptance Criteria

### Definition of Done (Phase 01-02)
- [x] All files created per specification
- [x] Build passes (vite build --mode production)
- [x] TypeScript strict mode passes
- [ ] Code review passed (currently failing, needs fixes)
- [ ] Unit tests for critical paths (pending Phase 05)
- [ ] Documentation updated (THIS DOCUMENT)

### Code Review Status
**Current:** Phase 01-02 implementation passes build but requires fixes:
- High Priority: Store import anti-pattern (race condition)
- High Priority: Missing input validation (data corruption risk)
- Medium Priority: Error handling gaps
- Medium Priority: Type safety improvements

**Next Step:** Fix identified issues before Phase 03 starts.

## Team & Responsibilities

| Role | Responsibility | Current |
|------|-----------------|---------|
| Product Manager | Requirements, roadmap, success metrics | Planning Phase 03 |
| Tech Lead | Architecture review, standards enforcement | Reviewing Phase 01-02 |
| Developer | Implementation, unit tests | Awaiting code review fixes |
| QA Engineer | Integration testing, token reduction measurement | Preparing Phase 05 |

## Communication & Escalation

- **Issue Tracking:** Plans directory with phase-specific files
- **Code Review:** See `plans/251208-1815-worldbook-optimization/reports/`
- **Status Updates:** Weekly in plan.md
- **Escalation:** Critical issues block downstream phases

## Version History

| Version | Date | Phase | Status |
|---------|------|-------|--------|
| 1.0.0-alpha.1 | 2025-12-08 | 01-02 | Implemented, needs fixes |
| 1.0.0-alpha.2 | 2025-12-09 | 04 | Implemented (global worldbooks) |
| 1.0.0-beta | 2025-12-14 | 05 | Pending (blocked on Phase 03) |
| 1.0.0 | 2025-12-20 | 05 | Planned release |

## Related Documentation

- **Architecture:** [system-architecture.md](./system-architecture.md)
- **Code Standards:** [code-standards.md](./code-standards.md)
- **Codebase:** [codebase-summary.md](./codebase-summary.md)
- **Phase Plan:** [plans/251208-1815-worldbook-optimization/plan.md](../plans/251208-1815-worldbook-optimization/plan.md)
- **Code Review:** [Phase 01-02 Report](../plans/251208-1815-worldbook-optimization/reports/code-reviewer-251208-worldbook-phase01-phase02.md)

## Glossary

| Term | Definition |
|------|-----------|
| RAG | Retrieval-Augmented Generation - context injection before LLM call |
| Embedding | Dense vector representation of text (1536-dim) |
| Worldbook | Character-specific reference material (entries with keywords) |
| Hybrid Retrieval | Combination of keyword filtering + semantic ranking |
| Token Optimization | Reducing unnecessary tokens by selective context injection |
| Graceful Degradation | Fallback functionality when primary feature unavailable |
| Cosine Similarity | Metric for measuring vector similarity (0.0-1.0) |
| IndexedDB | Browser database for client-side persistence |

## Next Review Date

**Date:** 2025-12-09
**Focus:** Code review fixes for Phase 01-02
**Decision Point:** Proceed to Phase 03 or prioritize fixes?

## Appendix: Feature Comparison

### Before (All-Matching)
```
User: "How do I cast fire spells?"
  ↓
Inject ALL worldbook entries matching "fire" OR "spell"
  ↓
Result: 15-20 entries = 500+ tokens
  ↓
Model receives unfocused context
```

### After (Selective Semantic)
```
User: "How do I cast fire spells?"
  ↓
Keyword filter: ["fire", "spell"] → 8 entries
  ↓
Semantic rank: Top-5 by similarity (threshold: 0.5)
  ↓
Result: 5 most relevant entries = 150-200 tokens
  ↓
Token reduction: 60-70%
```

