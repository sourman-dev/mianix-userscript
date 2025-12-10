// file: src/utils/token-estimation.ts

/**
 * Estimate token count from text using simple heuristic
 * Rough estimation: 1 token ≈ 4 characters for English, 2-3 for Vietnamese
 * This is NOT accurate but better than nothing for streaming responses without usage data
 */

export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Simple heuristic: ~4 chars per token (conservative estimate)
  return Math.ceil(text.length / 4);
}

/**
 * Create estimated TokenUsageStats for streaming responses
 * USE ONLY when actual usage data is not available
 */
export function createEstimatedTokenStats(
  userInput: string,
  assistantResponse: string,
  model: string,
  provider: string
) {
  const inputTokens = estimateTokens(userInput);
  const outputTokens = estimateTokens(assistantResponse);

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUSD: null, // Cannot estimate without knowing actual tokens
    costVND: null,
    model,
    provider,
    timestamp: Date.now(),
    isEstimated: true // Flag to indicate this is estimated
  };
}
