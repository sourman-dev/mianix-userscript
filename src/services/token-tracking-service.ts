// file: src/services/token-tracking-service.ts

import type { TokenUsageStats } from '@/types/token-stats';
import { PricingService } from './pricing-service';
import { ExchangeRateService } from './exchange-rate-service';

/**
 * Service for tracking token usage and calculating costs from LLM API responses
 * Integrates with PricingService and ExchangeRateService
 */
export class TokenTrackingService {

  /**
   * Normalize model name to match Helicone API naming conventions
   * Examples:
   * - "deepseek/deepseek-v3.2" → "deepseek/deepseek_v3" (NOVITA format)
   * - "deepseek-v3.1" → "deepseek_v3"
   * - "gpt-4" → "gpt-4" (unchanged)
   */
  private static normalizeModelName(model: string, provider: string): string {
    // NOVITA-specific normalization
    if (provider === 'NOVITA') {
      // Convert "deepseek/deepseek-v3.2" → "deepseek/deepseek_v3"
      // Convert "deepseek-v3.1" → "deepseek_v3"
      if (model.includes('deepseek-v')) {
        return model.replace(/-v(\d+)\.\d+/, '_v$1'); // Replace -vX.Y with _vX
      }
    }

    // Default: no normalization
    return model;
  }

  /**
   * Extract token usage statistics from LLM API response
   * Handles both OpenAI-compatible and streaming responses
   *
   * @param response - API response object (non-streaming)
   * @param model - Model name (e.g., "gpt-4", "claude-3-5-sonnet")
   * @param provider - Provider name (e.g., "openai", "anthropic")
   * @returns TokenUsageStats or null if usage data not available
   */
  static extractTokenUsage(
    response: any,
    model: string,
    provider: string
  ): TokenUsageStats | null {
    // Extract usage data from response
    const usage = response?.usage;

    if (!usage) {
      console.warn('⚠️ No usage data in API response');
      return null;
    }

    // Handle different response formats
    const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
    const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;

    // Normalize model name to match Helicone API conventions
    const normalizedModel = this.normalizeModelName(model, provider);

    // Calculate cost using PricingService
    const pricing = PricingService.findModelPricing(provider, normalizedModel);

    let costUSD: number | null = null;
    let costVND: number | null = null;

    if (pricing) {
      costUSD = PricingService.calculateCost(pricing, inputTokens, outputTokens);
      costVND = ExchangeRateService.convertToVND(costUSD);
    } else {
      console.warn(`⚠️ No pricing found for ${provider}/${normalizedModel} (original: ${model})`);
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      costUSD,
      costVND,
      model,
      provider,
      timestamp: Date.now()
    };
  }

  /**
   * Extract token usage from streaming response (final chunk)
   * Streaming responses often include usage data in the last chunk
   *
   * @param finalChunk - Last chunk from streaming response
   * @param model - Model name
   * @param provider - Provider name
   * @returns TokenUsageStats or null
   */
  static extractTokenUsageFromStream(
    finalChunk: any,
    model: string,
    provider: string
  ): TokenUsageStats | null {
    // Check if final chunk contains usage data
    if (finalChunk?.usage) {
      return this.extractTokenUsage(finalChunk, model, provider);
    }

    console.warn('⚠️ No usage data in streaming response final chunk');
    return null;
  }

  /**
   * Format token stats for display
   * @param stats - TokenUsageStats object
   * @returns Formatted string (e.g., "1,234↑ 5,678↓ ≈ 12,345₫")
   */
  static formatTokenStats(stats: TokenUsageStats): string {
    const input = stats.inputTokens.toLocaleString();
    const output = stats.outputTokens.toLocaleString();

    if (stats.costVND) {
      const cost = Math.round(stats.costVND).toLocaleString('vi-VN');
      return `${input}↑ ${output}↓ ≈ ${cost}₫`;
    }

    // Unknown model - show tokens only
    return `${input}↑ ${output}↓ (Unknown model)`;
  }

  /**
   * Validate token usage data
   * @param stats - TokenUsageStats to validate
   * @returns True if valid
   */
  static isValidTokenStats(stats: TokenUsageStats | null | undefined): stats is TokenUsageStats {
    if (!stats) return false;

    return (
      typeof stats.inputTokens === 'number' &&
      typeof stats.outputTokens === 'number' &&
      stats.inputTokens >= 0 &&
      stats.outputTokens >= 0
    );
  }
}
