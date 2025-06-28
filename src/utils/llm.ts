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

export async function sendOpenAiRequest(
  options: OpenAIOptions,
  onChunk?: (chunk: string) => void
): Promise<string | void> {
  try {
    const isStreaming = options.stream === true && onChunk !== undefined;
    const requestData = { ...options.data, stream: isStreaming };
    
    const apiURL = `${options.baseURL}chat/completions`;
    const response = await fetch(apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Non-streaming mode
    if (!isStreaming) {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || '';
    }

    // Streaming mode
    if (!onChunk) {
      throw new Error('onChunk callback is required for streaming mode');
    }

    // Safari compatibility: Check if ReadableStream is supported
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Safely decode and handle chunks
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;

          try {
            const jsonStr = trimmedLine.slice(5).trim(); // Remove 'data: ' more safely
            if (jsonStr === "[DONE]") {
              // onChunk("\n[Translation completed]");
              return;
            }

            const data = JSON.parse(jsonStr);
            const content = data?.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }

            if (data?.choices?.[0]?.finish_reason === "stop") {
              // onChunk("\n[Translation completed]");
              return;
            }
          } catch (e) {
            console.warn("Error parsing chunk:", e);
            continue;
          }
        }
      }
    } else {
      // Fallback for browsers that don't support ReadableStream (streaming mode)
      const text = await response.text();
      try {
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(5).trim();
            if (jsonStr === "[DONE]") continue;
            const data = JSON.parse(jsonStr);
            const content = data?.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          }
        }
        // onChunk("\n[Translation completed]");
      } catch (e) {
        console.error("Error processing response:", e);
        throw e;
      }
    }
  } catch (error) {
    console.error("OpenAI request error:", error);
    throw error;
  }
}

// Convenience function for non-streaming requests
export async function sendOpenAiRequestSync(
  options: Omit<OpenAIOptions, 'stream'>
): Promise<string> {
  const result = await sendOpenAiRequest({ ...options, stream: false });
  return result as string;
}

// Convenience function for streaming requests
export async function sendOpenAiRequestStream(
  options: Omit<OpenAIOptions, 'stream'>,
  onChunk: (chunk: string) => void
): Promise<void> {
  await sendOpenAiRequest({ ...options, stream: true }, onChunk);
}