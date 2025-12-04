/**
 * Smart LLM API wrapper - Auto-select between fetch and GM.xmlHttpRequest
 * Tries fetch first (for CORS-enabled providers), falls back to GM if needed
 */

import { 
  sendOpenAiRequestFetch, 
  sendOpenAiRequestFetchSync, 
  sendOpenAiRequestFetchStream,
  testCORS,
  type OpenAIOptions 
} from './llm-fetch';

import { 
  sendOpenAiRequest as sendOpenAiRequestGM,
  sendOpenAiRequestSync as sendOpenAiRequestSyncGM,
  sendOpenAiRequestStream as sendOpenAiRequestStreamGM,
} from './llm';

// Cache CORS test results to avoid repeated tests
const corsCache = new Map<string, boolean>();

/**
 * Check if provider supports CORS (with caching)
 */
async function checkCORS(baseURL: string, apiKey: string): Promise<boolean> {
  const cacheKey = `${baseURL}|${apiKey.substring(0, 10)}`;
  
  if (corsCache.has(cacheKey)) {
    return corsCache.get(cacheKey)!;
  }

  const supportsCORS = await testCORS(baseURL, apiKey);
  corsCache.set(cacheKey, supportsCORS);
  
  console.log(`🔍 CORS test for ${baseURL}: ${supportsCORS ? '✅ Supported' : '❌ Not supported'}`);
  
  return supportsCORS;
}

/**
 * Smart request - Auto-select between fetch and GM
 */
export async function sendOpenAiRequestSmart(
  options: OpenAIOptions,
  onChunk?: (chunk: string) => void
): Promise<string | void> {
  const isStreaming = options.stream === true && onChunk !== undefined;

  // For streaming, always try fetch first (better streaming support)
  if (isStreaming) {
    try {
      console.log("🎬 Trying native fetch for streaming...");
      return await sendOpenAiRequestFetch(options, onChunk);
    } catch (error) {
      console.warn("⚠️ Fetch failed, falling back to GM.xmlHttpRequest:", error);
      return await sendOpenAiRequestGM(options, onChunk);
    }
  }

  // For non-streaming, check CORS first
  const supportsCORS = await checkCORS(options.baseURL, options.apiKey);
  
  if (supportsCORS) {
    console.log("✅ Using native fetch (CORS supported)");
    return await sendOpenAiRequestFetch(options, onChunk);
  } else {
    console.log("⚠️ Using GM.xmlHttpRequest (CORS not supported)");
    return await sendOpenAiRequestGM(options, onChunk);
  }
}

/**
 * Convenience function for non-streaming requests
 */
export async function sendOpenAiRequestSmartSync(
  options: Omit<OpenAIOptions, 'stream'>
): Promise<string> {
  const result = await sendOpenAiRequestSmart({ ...options, stream: false });
  return result as string;
}

/**
 * Convenience function for streaming requests
 */
export async function sendOpenAiRequestSmartStream(
  options: Omit<OpenAIOptions, 'stream'>,
  onChunk: (chunk: string) => void
): Promise<void> {
  await sendOpenAiRequestSmart({ ...options, stream: true }, onChunk);
}

/**
 * Force use fetch (for CORS-enabled providers)
 */
export {
  sendOpenAiRequestFetch,
  sendOpenAiRequestFetchSync,
  sendOpenAiRequestFetchStream,
};

/**
 * Force use GM.xmlHttpRequest (for non-CORS providers)
 */
export {
  sendOpenAiRequestGM,
  sendOpenAiRequestSyncGM,
  sendOpenAiRequestStreamGM,
};
