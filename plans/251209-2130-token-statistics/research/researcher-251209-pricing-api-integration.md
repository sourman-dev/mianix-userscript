## Research Report: LLM Pricing API & VND Exchange Rate Integration

### 1. Helicone API Structure & Response Format
The Helicone LLM pricing API (`https://www.helicone.ai/api/llm-costs`) provides cost data per 1 million tokens for various LLM providers and models.

**API Endpoints:**
- `GET https://www.helicone.ai/api/llm-costs`: Get all models with costs.
- `GET https://www.helicone.ai/api/llm-costs?provider={provider_name}`: Filter by provider.
- `GET https://www.helicone.ai/api/llm-costs?model={model_name}`: Search by model name.
- `GET https://www.helicone.ai/api/llm-costs?provider={provider_name}&model={model_name}`: Combine filters.

**Response Structure:**
The API returns a JSON object with `metadata` and `data` fields. The `data` array contains objects with:
- `provider`: (e.g., "OPENAI", "ANTHROPIC")
- `model`: Model identifier (e.g., "gpt-4", "claude-3-opus")
- `operator`: Matching logic for the model name ("equals", "startsWith", "includes")
- `input_cost_per_1m`: Cost per 1 million input tokens (USD)
- `output_cost_per_1m`: Cost per 1 million output tokens (USD)
- `per_image`, `per_call`: (Optional) Costs for images or API calls.

**Example Response (`docs/PROVIDERS.md`):**
```json
{
  "metadata": {
    "total_models": 250,
    "note": "All costs are per 1 million tokens unless otherwise specified",
    "operators_explained": { /* ... */ }
  },
  "data": [
    {
      "provider": "OPENAI",
      "model": "gpt-4",
      "operator": "equals",
      "input_cost_per_1m": 30.0,
      "output_cost_per_1m": 60.0,
      "show_in_playground": true
    }
  ]
}
```

### 2. Best Practices for Caching Pricing Data
LLM pricing data is relatively static but can change. Exchange rates fluctuate more frequently.

**Strategy:**
-   **Helicone LLM Costs:**
    -   Cache duration: 24 hours to 7 days, or until a specific `Cache-Control` header suggests revalidation.
    -   Invalidation: Implement a scheduled task to refresh the cache daily. Optionally, listen for webhooks from Helicone if available for immediate updates.
    -   Storage: In-memory cache (e.g., Redis, or a simple in-app cache) for quick access. Persist to disk/DB for application restarts.
-   **VND Exchange Rate:**
    -   Cache duration: 1 to 6 hours, as rates can change multiple times a day.
    -   Invalidation: Refresh on a shorter schedule (e.g., hourly).
    -   Storage: Similar to LLM costs, prioritize fast access.

**Implementation Considerations:**
-   **Graceful Degradation:** If API calls fail, serve stale data from the cache and log the error. This prevents service disruption.
-   **Atomic Updates:** When refreshing cache, fetch new data, validate it, then replace the old data atomically to avoid serving incomplete or corrupt information.

### 3. Exchange Rate API Patterns (Vietcombank)
The Vietcombank API (`https://www.vietcombank.com.vn/api/exchangerates?date={YYYY-MM-DD}`) provides daily exchange rates.

**API Endpoint:**
- `GET https://www.vietcombank.com.vn/api/exchangerates?date={YYYY-MM-DD}`

**Response Structure:**
The API returns a JSON object with `Count`, `Date`, `UpdatedDate`, and a `Data` array. Each object in `Data` contains currency information:
- `currencyName`
- `currencyCode` (e.g., "USD")
- `cash`, `transfer`, `sell`: Different rates for the currency.

**Example Response (`docs/PROVIDERS.md`):**
```json
{
  "Count": 20,
  "Date": "2025-12-09T00:00:00",
  "UpdatedDate": "2025-12-09T08:16:30+07:00",
  "Data": [
    {
      "currencyName": "US DOLLAR",
      "currencyCode": "USD",
      "cash": "26142.00",
      "transfer": "26172.00",
      "sell": "26412.00",
      "icon": "..."
    },
    // ... other currencies
  ]
}
```
To get the USD to VND rate, iterate through `Data` and find the object where `currencyCode` is "USD", then extract the desired rate (e.g., `transfer` rate).

### 4. Handling Unknown Models/Providers Gracefully
When a requested model or provider is not found in the Helicone API response:

**Strategy:**
-   **Default Costs:** Assign a default high cost to unknown models to discourage their use or flag them for review.
-   **Configuration:** Maintain a configurable list of "unsupported" or "experimental" models that should either error or use a fallback cost.
-   **Logging/Alerting:** Log all requests for unknown models/providers and potentially trigger alerts for manual investigation. This helps in identifying new models to add.
-   **User Feedback:** Provide clear error messages to the user indicating that the model/provider is not supported for cost estimation.

### 5. Provider List Standardization
The `docs/PROVIDERS.md` lists standardized provider names (e.g., ANTHROPIC, OPENAI). This list should be the single source of truth.

**Strategy:**
-   **Mapping:** Internally map any incoming provider names to these standardized names before querying the Helicone API. This handles variations (e.g., "anthropic" -> "ANTHROPIC").
-   **Validation:** Validate incoming provider names against the standardized list. If a provider is not in the list, it should be treated as an unknown provider.
-   **Enforcement:** Use an enum or a fixed array of strings in the application's code to represent the allowed providers, ensuring consistency.

### Unresolved Questions
- Is there a preferred USD-VND rate (cash, transfer, sell) to use from the Vietcombank API for cost estimation? (The `transfer` rate is typically used for interbank transactions, which might be most appropriate for API usage context.)
- Does Helicone offer webhooks for real-time price updates, reducing the need for frequent polling?
- Are there specific business rules for fallback costs for unknown LLM models/providers?
