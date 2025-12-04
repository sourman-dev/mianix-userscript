/**
 * LLM API using native Fetch API (requires CORS support)
 * Use this for providers that support CORS (e.g., OpenAI, some proxies)
 * For providers without CORS, use llm.ts (GM.xmlHttpRequest)
 */

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
}

/**
 * Send request using native fetch API with streaming support
 */
export async function sendOpenAiRequestFetch(
  options: OpenAIOptions,
  onChunk?: (chunk: string) => void
): Promise<string | void> {
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

      return data?.choices?.[0]?.message?.content || '';
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

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log("✅ Fetch stream finished successfully");
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
            
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.warn("Could not parse streaming JSON chunk:", jsonStr, e);
          }
        }
      }
    }

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
): Promise<string> {
  const result = await sendOpenAiRequestFetch({ ...options, stream: false });
  return result as string;
}

/**
 * Convenience function for streaming requests
 */
export async function sendOpenAiRequestFetchStream(
  options: Omit<OpenAIOptions, 'stream'>,
  onChunk: (chunk: string) => void
): Promise<void> {
  await sendOpenAiRequestFetch({ ...options, stream: true }, onChunk);
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
