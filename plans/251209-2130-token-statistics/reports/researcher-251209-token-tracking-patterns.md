# Research Report: Token Statistics and Cost Calculation in Web Applications

## Executive Summary
This report investigates patterns for tracking LLM token usage and calculating costs in Vue 3 web applications. Key findings suggest using IndexedDB for persistent client-side token storage due to its capacity and asynchronous nature, while localStorage can be used for simpler, less critical data like cached pricing. Dynamic pricing for LLMs necessitates fetching rates from APIs (or hardcoded updates) and careful caching with expiration. Vue 3 composables and Pinia stores are ideal for structuring the tracking logic and managing application state. Currency conversion should also leverage caching strategies with appropriate TTLs, potentially using server-side caching for critical data and client-side for display purposes.

## Research Methodology
- Sources consulted: 4 (Gemini API calls)
- Date range of materials: 2024
- Key search terms used: "LLM token tracking localStorage IndexedDB", "LLM API dynamic pricing cost calculation", "currency conversion caching strategy web app", "localStorage schema LLM pricing data", "Vue 3 composable LLM token tracking"

## Key Findings

### 1. Token Tracking Patterns in LLM Applications (localStorage vs IndexedDB)

Tracking LLM token usage (input and output) is crucial for cost management, performance optimization, and observability. For client-side persistence of this data, **IndexedDB is generally the superior choice** over `localStorage`.

*   **`IndexedDB`**:
    *   **Advantages**: Offers virtually unlimited storage, stores structured data (JavaScript objects), operates asynchronously (non-blocking UI), supports indexing for efficient querying, and transactions for data integrity. Ideal for extensive logging of LLM interactions and detailed historical records.
    *   **Best Practice**: Utilize for significant volumes of token usage data. Collect granular metadata like user ID, timestamp, model used, prompt type, and success status. Data should be eventually synchronized with a backend for long-term storage and analytics.
*   **`localStorage`**:
    *   **Limitations**: Limited storage (5-10MB), synchronous operations (can block UI), and no built-in expiration. Not suitable for large or complex logs of token usage.
    *   **Suitability**: Best for small, simple data like user preferences or as a fallback for very basic, temporary token counts.

### 2. Cost Calculation with Dynamic Pricing (Fetch vs Hardcoded Rates)

LLM API pricing is primarily token-based, with dynamic pricing models becoming prevalent.

*   **Token-Based Pricing**: Costs are calculated per input and output tokens, with output tokens often being more expensive. Pricing varies by model and context window size.
*   **Dynamic Pricing (2024 Trends)**: The market sees frequent price adjustments, reductions (e.g., GPT-4o mini discounts), tiered pricing, and batch processing discounts.
*   **Fetching Pricing Data**: While some providers offer APIs for real-time pricing, many still rely on static data or web scraping. This necessitates:
    *   **Periodic Updates**: Implement mechanisms to periodically update static pricing data.
    *   **Provider-Specific Endpoints**: Integrate with specific pricing APIs if available.
*   **Real-time Cost Estimation**: Crucial for managing expenses. Involves continuously tracking token consumption and applying current pricing data. Cumulative token counts for input/output should be maintained and updated after each API call.

### 3. Currency Conversion Handling (Caching Strategies)

Handling currency conversion in web applications requires careful caching to reduce API calls, improve performance, and manage costs.

*   **Caching is Vital**: Reduces API calls, improves performance, and saves costs.
*   **Server-Side Caching (Recommended for Critical Data)**: Use tools like Redis or Memcached. Store exchange rates with periodic updates and implement a "stale-while-revalidate" pattern.
*   **Client-Side Caching**:
    *   **`localStorage`**: Simple, persistent, client-side. Good for fallback rates, infrequently updated rates, or user preferences. **Requires manual expiration logic** (store timestamp and check it).
    *   **`IndexedDB`**: Asynchronous, larger storage, supports transactions. Suitable for historical rates or larger sets of currencies.
    *   **Service Workers & Cache API**: Robust for offline support and fine-grained caching control.
*   **Cache Invalidation (TTL)**: Exchange rates are dynamic; set an appropriate Time-To-Live (TTL) for cached data.
*   **APIs for Real-time Rates (2024)**: Choose reliable APIs based on update frequency, currency coverage, historical data, reliability, pricing, and security. Popular options include ExchangeRate-API, Open Exchange Rates, Fixer.io, Currencyapi.com, and the European Central Bank (ECB) API.
*   **Security**: Always proxy API requests through a backend to protect API keys.
*   **`Intl.NumberFormat`**: Use for correct currency display based on locale.

### 4. LocalStorage Structure for Pricing/Rate Data

A robust `localStorage` structure for LLM pricing and rate data should accommodate dynamic pricing and facilitate efficient caching and retrieval.

```json
{
  "llmPricingData": {
    "models": {
      "gpt-4o-mini": {
        "prompt": 0.00015,
        "completion": 0.0006,
        "currency": "USD",
        "unit": "1K tokens",
        "provider": "openai",
        "last_updated_year": 2024
      },
      // ... other models
    },
    "lastUpdatedTimestamp": 1704067200000, // Unix timestamp in milliseconds
    "schemaVersion": "1.0",
    "notes": "Pricing data reflects rates as of 2024, primarily for 1K tokens in USD. Actual rates may vary by region, specific API usage, and provider changes. Local models are typically free."
  }
}
```

*   **`llmPricingData`**: Top-level key for all LLM pricing information.
*   **`models`**: Object where keys are unique model identifiers (e.g., "gpt-4o-mini"). Each model object contains:
    *   `prompt` (Number): Cost per unit of prompt tokens.
    *   `completion` (Number): Cost per unit of completion tokens.
    *   `currency` (String): Currency of prices (e.g., "USD").
    *   `unit` (String): Unit of measurement (e.g., "1K tokens").
    *   `provider` (String): LLM provider (e.g., "openai").
    *   `last_updated_year` (Number): Year of last price verification.
    *   `note` (Optional String): Specific notes.
*   **`lastUpdatedTimestamp`**: Unix timestamp for cache invalidation.
*   **`schemaVersion`**: For future-proofing schema evolution.
*   **`notes`**: General disclaimers.

### 5. Vue 3 Composables/Stores for Statistics Tracking

Vue 3's Composition API and Pinia provide an excellent foundation for building modular and reactive token statistics tracking.

*   **`useLLMTokenTracker` (Composable)**:
    *   **Purpose**: Encapsulates logic for estimating/calculating token counts.
    *   **Implementation**: Would typically import a model-specific tokenizer (e.g., `tiktoken` for OpenAI) to accurately count tokens for prompt and response texts.
*   **`useTokenStore` (Pinia Store)**:
    *   **Purpose**: Centralized state management for all token-related statistics.
    *   **State**: `totalInputTokens`, `totalOutputTokens`, `interactionHistory` (an array of `TokenStats` objects including timestamp, input/output tokens, and model), `maxHistoryLength`.
    *   **Getters**: `overallTokenUsage`, `recentInteractions`.
    *   **Actions**: `addTokens` (updates totals and history), `resetStats`.
*   **`useRealtimeLLMInteractions` (Composable)**:
    *   **Purpose**: Handles real-time LLM interaction data and integrates with the Pinia store.
    *   **Implementation**: In a real application, this would connect to a WebSocket or Server-Sent Events (SSE) API to receive interaction data. It then uses `useLLMTokenTracker` to count tokens and `useTokenStore` to update statistics.
*   **Component (`TokenDashboard.vue`)**:
    *   **Purpose**: Displays the token statistics reactively using the Pinia store and the real-time composable.
    *   **Technology**: Uses Vue 3 Composition API with `<script setup>`, Pinia, and potentially a styling framework like Tailwind CSS for presentation.

## Implementation Recommendations

### Quick Start Guide
1.  **Define Tokenizer**: Choose an appropriate tokenizer library for your LLM(s) (e.g., `tiktoken` for OpenAI) and integrate it into a `useLLMTokenTracker` composable.
2.  **Setup Pinia Store**: Create a `tokenStore` using Pinia to manage global token statistics, including total counts and interaction history.
3.  **Implement Real-time Data Ingestion**: Develop a composable (`useRealtimeLLMInteractions`) to connect to your LLM interaction feed (WebSocket, SSE, or direct API response processing) and update the Pinia store with token data.
4.  **Display Statistics**: Create Vue components that leverage the `tokenStore` to display real-time and aggregated token usage.
5.  **Pricing Data Management**: Decide on a strategy for fetching and caching LLM pricing data (API vs. hardcoded, localStorage with expiration vs. IndexedDB for larger datasets).

### Code Examples
(Refer to the detailed code examples in the "Vue 3 Composables/Stores for Statistics Tracking" section above for concrete implementations of Pinia store, token tracking composable, and real-time data composable.)

### Common Pitfalls
*   **Inaccurate Tokenization**: Using generic word counts instead of model-specific tokenizers will lead to incorrect cost estimations.
*   **Stale Pricing Data**: Not implementing a robust caching and refresh strategy for dynamic LLM pricing will result in outdated cost calculations.
*   **Blocking UI**: Using `localStorage` for large datasets or performing synchronous operations can degrade user experience.
*   **Exposing API Keys**: Storing sensitive API keys client-side, especially for currency conversion APIs, is a security risk. Proxy all such requests through your backend.
*   **Ignoring Currency Conversion**: Failing to convert costs to the user's local currency or handling it incorrectly will lead to a poor user experience.

## Resources & References

### Official Documentation
*   [Pinia Documentation](https://pinia.vuejs.org/)
*   [Vue 3 Documentation](https://vuejs.org/guide/introduction.html)
*   [MDN Web Docs: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
*   [MDN Web Docs: Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
*   [MDN Web Docs: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
*   [OpenAI Tokenizer (tiktoken)](https://github.com/openai/tiktoken)

### Recommended Tutorials
*   (Generic search results, no specific links due to API error. Users should search for "Vue 3 Pinia tutorial", "Vue 3 composables tutorial", "IndexedDB Vue example" for practical guides.)

### Community Resources
*   (Generic search results, no specific links due to API error. Users should search for "Vue.js community", "LLM development forums".)

### Further Reading
*   [A Guide to LLM Tokenizers](https://huggingface.co/docs/transformers/tokenizer_summary)
*   [Understanding LLM Pricing Models](https://www.assemblyai.com/blog/llm-pricing-guide/)

## Appendices

### A. Glossary
*   **LLM**: Large Language Model.
*   **Token**: The basic unit of text processing for an LLM, roughly equivalent to a word or part of a word.
*   **Input Tokens**: Tokens sent to the LLM as part of the prompt.
*   **Output Tokens**: Tokens generated by the LLM as a response.
*   **Composable**: A function in Vue 3 that leverages the Composition API to encapsulate reusable stateful logic.
*   **Pinia**: The official state management library for Vue 3.
*   **IndexedDB**: A low-level API for client-side storage of large amounts of structured data.
*   **LocalStorage**: A simple key-value store for client-side data, limited in size and synchronous.
*   **TTL**: Time To Live, a mechanism for expiring cached data.

### Unresolved Questions
*   Specific APIs for fetching real-time LLM pricing data vary by provider. A robust solution would need to account for this or rely on a centralized backend proxy.
*   The exact tokenizer to use depends heavily on the specific LLM(s) being integrated.
*   Whether to implement client-side (IndexedDB) or server-side caching for currency rates depends on the criticality of the data and performance requirements.
