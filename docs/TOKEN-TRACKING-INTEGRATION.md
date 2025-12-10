# Token Statistics Integration Guide

## Current Status

✅ **Fully Implemented:**
- Type definitions (TokenUsageStats, pricing caches, aggregation tables)
- API services (Helicone pricing, Vietcombank exchange rates)
- Token tracking service (extract from LLM responses)
- Pre-aggregated statistics store (daily/weekly/monthly)
- UI components (per-response display, dashboard)
- Navigation integration (TOKEN_STATISTICS screen)

⚠️ **Limitation: Streaming Mode**

The current ChatScreen implementation uses **streaming mode** (`sendOpenAiRequestFetchStream`), which does NOT return token usage data in the current implementation.

## How Token Tracking Works

When an LLM response includes token usage data, the system automatically:

1. **Extracts tokens** via `TokenTrackingService.extractTokenUsage()`
2. **Calculates costs** using cached Helicone pricing + Vietcombank exchange rates
3. **Saves to message** via `dialogueStore.updateAIResponse(nodeId, response, tokenStats)`
4. **Records to aggregates** automatically in `updateAIResponse()` → `tokenStatsStore.recordUsage()`
5. **Displays inline** via `<TokenStatsDisplay :token-stats="node.tokenStats" />`

## Enabling Token Tracking

### Option 1: Switch to Non-Streaming (Recommended for Token Tracking)

Modify `ChatScreen.vue` to use non-streaming API:

\`\`\`typescript
import { sendOpenAiRequestFetchSync } from '@/utils/llm-fetch';

// In sendRequestToLLM function:
const options: OpenAIOptions = {
  baseURL: currentLLMModel.value.baseUrl,
  apiKey: currentLLMModel.value.apiKey,
  provider: currentLLMModel.value.llmProvider, // 🆕 Add provider for pricing lookup
  data: {
    model: currentLLMModel.value.modelName,
    messages: [/* ... */],
    stream: false, // 🔧 Disable streaming
    temperature: llmOptions?.temperature || 0.8,
    top_p: llmOptions?.top_p || 0.9,
  }
};

const response = await sendOpenAiRequestFetchSync(options);

// response.tokenStats will contain:
// { inputTokens, outputTokens, totalTokens, costUSD, costVND, model, provider, timestamp }

// Pass to updateAIResponse:
dialogueStore.updateAIResponse(pendingNodeId, response.content, response.tokenStats);
\`\`\`

### Option 2: Enhance Streaming to Extract Usage from Final Chunk

Some OpenAI-compatible providers return usage data in the final streaming chunk:

\`\`\`typescript
// In llm-fetch.ts streaming handler:
if (done) {
  // Extract usage from last chunk
  if (lastChunkData?.usage) {
    const tokenStats = TokenTrackingService.extractTokenUsageFromStream(
      lastChunkData,
      model,
      provider
    );
    // Return or store tokenStats somehow
  }
}
\`\`\`

**Problem:** Current streaming implementation doesn't return tokenStats to caller.

**Solution:** Refactor `sendOpenAiRequestFetchStream` to accept a callback for token stats:

\`\`\`typescript
await sendOpenAiRequestFetchStream(
  options,
  (chunk) => { llmResponse.value += chunk; }, // Content callback
  (tokenStats) => { /* Token stats callback */ } // 🆕 New callback
);
\`\`\`

### Option 3: Estimate Tokens (Least Accurate)

Use character-based estimation for streaming (NOT recommended for production):

\`\`\`typescript
import { createEstimatedTokenStats } from '@/utils/token-estimation';

const estimatedStats = createEstimatedTokenStats(
  userInput,
  aiResponse,
  modelName,
  providerName
);

dialogueStore.updateAIResponse(nodeId, aiResponse, estimatedStats);
\`\`\`

**Warning:** Estimates are inaccurate and cannot calculate costs without exact token counts.

## Viewing Statistics

1. Navigate to **Statistics** screen (add button to NavConfig.vue)
2. View per-response stats inline in chat messages
3. Access dashboard for aggregated daily/weekly/monthly data

## Manual Recording (If Needed)

If you have tokenStats from external source:

\`\`\`typescript
import { useTokenStatsStore } from '@/stores/token-stats';

const tokenStatsStore = useTokenStatsStore();

await tokenStatsStore.recordUsage(characterId, {
  inputTokens: 100,
  outputTokens: 200,
  totalTokens: 300,
  costUSD: 0.0015,
  costVND: 37500,
  model: 'gpt-4',
  provider: 'openai',
  timestamp: Date.now()
});
\`\`\`

## Provider Configuration

Add `llmProvider` field when creating LLM models for accurate pricing lookup:

\`\`\`typescript
{
  id: 'model-1',
  name: 'GPT-4',
  apiKey: 'sk-...',
  baseUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-4',
  llmProvider: 'openai', // 🆕 Must match Helicone provider names
  modelType: 'chat'
}
\`\`\`

## Helicone Provider Names

Common provider names from Helicone API:
- `openai` - OpenAI
- `anthropic` - Anthropic Claude
- `google` - Google Gemini
- `mistral` - Mistral AI
- `cohere` - Cohere

Unknown providers will show token counts without cost estimates.

## Data Retention

- **Daily stats:** 90 days (auto-cleanup)
- **Weekly stats:** 52 weeks
- **Monthly stats:** Forever
- **Pricing cache:** 7 days
- **Exchange rate cache:** 24 hours

## Troubleshooting

### No token stats showing

1. Check if provider returns `usage` in response
2. Verify `provider` field is set in OpenAIOptions
3. Ensure using non-streaming or enhanced streaming
4. Check console for "💰 Token usage recorded" log

### Costs showing as null

1. Verify provider name matches Helicone database
2. Check if pricing cache is populated: `PricingService.getAllPricing()`
3. Force refresh: `await PricingService.forceRefresh()`

### Wrong exchange rate

1. Check Vietcombank API is accessible
2. Force refresh: `await ExchangeRateService.forceRefresh()`
3. Verify cache: `ExchangeRateService.getCurrentRate()`
