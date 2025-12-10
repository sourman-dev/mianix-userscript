/**
 * LLM API using native Fetch API (requires CORS support)
 * Use this for providers that support CORS (e.g., OpenAI, some proxies)
 * For providers without CORS, use llm.ts (GM.xmlHttpRequest)
 */

import type { TokenUsageStats } from '@/types/token-stats';
import { TokenTrackingService } from '@/services/token-tracking-service';

export interface OpenAIRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  maxTokens?: number;
  temperature?: number;
  top_p?: number;
}

export interface OpenAIOptions {
  baseURL: string;
  apiKey: string;
  data: OpenAIRequest;
  stream?: boolean;
  provider?: string; // Provider name for token tracking (e.g., "openai", "anthropic")
}

export interface LLMResponse {
  content: string;
  tokenStats?: TokenUsageStats | null;
}

/**
 * Send request using native fetch API with streaming support
 */
export async function sendOpenAiRequestFetch(
  options: OpenAIOptions,
  onChunk?: (chunk: string) => void
): Promise<string | LLMResponse | TokenUsageStats | null | void> {
  const isStreaming = options.stream === true && onChunk !== undefined;
  const requestData = { ...options.data, stream: isStreaming };
  
  // Ensure baseURL ends with /
  const normalizedBaseURL = options.baseURL.endsWith('/') ? options.baseURL : `${options.baseURL}/`;
  const apiURL = `${normalizedBaseURL}chat/completions`;

  try {
    const response = await fetch(apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // --- Non-streaming mode ---
    if (!isStreaming) {
      const data = await response.json();

      if (!data) {
        console.error("❌ LLM Response is null/undefined");
        return '';
      }

      if (data.error) {
        console.error("❌ LLM API Error:", data.error);
        return '';
      }

      const content = data?.choices?.[0]?.message?.content || '';

      // Extract token usage statistics
      const provider = (options.provider || 'UNKNOWN').toUpperCase();
      const model = options.data.model;
      const tokenStats = TokenTrackingService.extractTokenUsage(data, model, provider);

      // Return response with token stats
      return {
        content,
        tokenStats
      };
    }

    // --- Streaming mode ---
    if (!onChunk) {
      throw new Error('onChunk callback is required for streaming mode');
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastChunkData: any = null; // Store last chunk for token extraction

    let finalTokenStats: TokenUsageStats | null = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("✅ Fetch stream finished successfully");

        // Extract token stats from last chunk (if available)
        if (lastChunkData) {
          const provider = (options.provider || 'UNKNOWN').toUpperCase();
          const model = options.data.model;
          const tokenStats = TokenTrackingService.extractTokenUsageFromStream(
            lastChunkData,
            model,
            provider
          );

          if (tokenStats) {
            console.log('💰 Token stats from stream:', TokenTrackingService.formatTokenStats(tokenStats));
            finalTokenStats = tokenStats; // Store for return
          }
        }

        break;
      }

      // Decode chunk
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6).trim();
          
          if (jsonStr === '[DONE]') {
            continue;
          }

          try {
            const data = JSON.parse(jsonStr);
            const content = data?.choices?.[0]?.delta?.content;

            // Store for token extraction at end
            lastChunkData = data;

            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.warn("Could not parse streaming JSON chunk:", jsonStr, e);
          }
        }
      }
    }

    // Return token stats extracted from stream
    return finalTokenStats;

  } catch (error) {
    console.error("❌ Fetch request failed:", error);
    if (onChunk) {
      onChunk(`\n\n[LỖI]: ${(error as Error).message}`);
    }
    throw error;
  }
}

/**
 * Convenience function for non-streaming requests
 */
export async function sendOpenAiRequestFetchSync(
  options: Omit<OpenAIOptions, 'stream'>
): Promise<LLMResponse> {
  const result = await sendOpenAiRequestFetch({ ...options, stream: false });
  return result as LLMResponse;
}

/**
 * Convenience function for streaming requests
 */
export async function sendOpenAiRequestFetchStream(
  options: Omit<OpenAIOptions, 'stream'>,
  onChunk: (chunk: string) => void
): Promise<TokenUsageStats | null> {
  const result = await sendOpenAiRequestFetch({ ...options, stream: true }, onChunk);
  return result as TokenUsageStats | null;
}

/**
 * Test if a provider supports CORS
 */
export async function testCORS(baseURL: string, apiKey: string): Promise<boolean> {
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  const apiURL = `${normalizedBaseURL}models`;

  try {
    const response = await fetch(apiURL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.warn("CORS test failed:", error);
    return false;
  }
}
