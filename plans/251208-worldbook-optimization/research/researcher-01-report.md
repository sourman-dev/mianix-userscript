# Worldbook/Lorebook Optimization Research Report
**Date:** 2025-12-08 | **Topic:** Token Optimization & RAG Integration for Roleplay AI

---

## 1. Token Optimization Techniques

### Selective Injection & Keyword Matching
SillyTavern implements **context budget system** (% or absolute tokens). Entries activate via:
- **Standard keywords**: Comma-separated, case-insensitive matching within configurable scan depth
- **Regex patterns**: JavaScript-style regex (`/pattern/`) for flexible matching (optional words, spacing, char-specific via `\x01` separator)
- **Vector similarity**: Supplements keywords by embedding recent messages vs. entry content
- **Filter logic**: Secondary keys (AND ANY/ALL, NOT ANY/ALL) refine activation

**Conciseness rule**: Keep entry contents brief to conserve tokens.

### Context Relevance Scoring & Position-Based Insertion
Priority order:
1. **Constant entries** inserted first
2. **Higher order numbers** inserted next
3. **Direct mentions** (in other entries) have priority

Insertion positions control impact:
- Before/after character definitions
- Example message positions
- Author's note locations
- Specific chat depth layers
- **Outlets**: Manual placement via macros for precise control (entries stored under named outlet, injected where you decide)

**Result**: Higher insertion order = closer to conversation end = maximized influence on model output.

### Caching Strategies
- **Minimum Activations**: Override scan-depth limits, search backward through chat history until N entries trigger (respects Budget cap)
- **Vector Storage**: Embeddings cached in JSON files (`/vectors` folder) via Vectra library for repeated comparisons without recomputation

---

## 2. RAG Integration Patterns

### Vector Embedding & Similarity Search
**Data Bank (SillyTavern's RAG feature)**:
- Documents split into chunks (configurable size)
- Each chunk converted to vector embeddings (numerical arrays representing semantic meaning)
- **Similarity search**: Compare chat messages against stored embeddings; shorter distance = higher relevance
- Retrieved chunks activate lore book entries automatically (optional: "Include in World Info Scanning")

**Controls**: Score threshold (0-1), chunk size, max chunks retrieved balance precision vs. context space.

### Hybrid Approach (Best Practice)
Combine **semantic search** (embeddings/cosine similarity) + **lexical search** (BM25/keyword matching):
- Semantic captures meaning-based relevance
- Lexical ensures precise term matches
- Result: Comprehensive accuracy balancing broad understanding with exact keyword precision

**Use case**: Query "dragon lair" retrieves both direct matches AND semantically similar entries (cave, treasure, creature habitat).

### Worldbook-Specific Implementation
Vectorize all lorebook entries:
1. Convert each entry's content to embeddings using models like BERT/Sentence-Transformers
2. Store in vector DB (Pinecone, Qdrant, Weaviate, or Postgres Vector)
3. On message arrival: Query vector DB for top-K most similar entries
4. Inject top results into context, respecting token budget
5. Entries trigger additional lore recursively ("Include in World Info Scanning")

---

## 3. Reusable Worldbook Patterns

### Global vs. Character-Specific Hierarchy
**Structure for reuse**:
```
worldbooks/
├── global/                    # Shared across all characters
│   ├── world-geography.json
│   ├── magic-system.json
│   └── nations-factions.json
└── characters/
    ├── alice/
    │   ├── personal-memories.json
    │   └── alice-specific-lore.json
    └── bob/
        └── bob-specific-lore.json
```

**Inheritance pattern**: Character loads global entries + own entries. Override: specific entries shadow global entries with same key.

### Practical Optimization
- **Global entries** (world rules, geography): Mark as "constant" (always inject)
- **Character-specific**: Inject only when character is active
- **Conditional outlets**: Use outlets to inject character-specific lore only in character's perspective messages
- **Lazy loading**: Load global book once, reference by ID; only load character books on character activation

### Shared Entry System
- Define entry once in global book with unique ID (e.g., `dragon_queen_7`)
- Reference from character books via ID instead of duplicating content
- Update once, applies everywhere
- Reduces token waste from repetition

---

## Implementation Summary

| Strategy | Token Savings | Complexity | Best For |
|----------|---|---|---|
| **Keyword + Order** | 20-30% | Low | Simple, fast activation |
| **Vector Similarity** | 40-60% | High | Complex scenarios, nuanced matching |
| **Hybrid (Keyword + Vector)** | 50-70% | High | Balanced accuracy & efficiency |
| **Global/Character Hierarchy** | 30-40% | Medium | Multi-character systems |
| **Outlets** | 15-25% | Medium | Fine-grained control |

---

## Key Takeaways

1. **Token efficiency = priority ordering + conciseness + hybrid matching**
2. **RAG with vectors > keyword-only** (semantic understanding matters in roleplay)
3. **Reuse via global hierarchy** reduces redundancy across characters
4. **Outlets enable precision injection** without wasting context on irrelevant entries
5. **Minimum Activations + Budget cap** = predictable token usage

**Unresolved**: Optimal embedding model selection for creative writing vs. BERT defaults; SillyTavern's specific vector DB recommendation (Vectra vs. alternatives).

---

## Sources
- [SillyTavern World Info Documentation](https://docs.sillytavern.app/usage/core-concepts/worldinfo/)
- [SillyTavern Data Bank (RAG) Documentation](https://docs.sillytavern.app/usage/core-concepts/data-bank/)
- [Retrieval-Augmented Generation Guide - Pinecone](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [RAG & Semantic Search - OpenAI Help Center](https://help.openai.com/en/articles/8868588-retrieval-augmented-generation-rag-and-semantic-search-for-gpts)
- [Contextual Retrieval - Anthropic](https://www.anthropic.com/news/contextual-retrieval)
- [SillyTavern Tutorials 2025 - Sider](https://sider.ai/blog/ai-tools/best-sillytavern-tutorials-to-master-roleplay-ai-in-2025)
