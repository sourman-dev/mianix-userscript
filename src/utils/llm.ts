import { gmFetchLLM,  gmFetchLLMStream } from "./gm-helper";

export interface OpenAIRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  maxTokens?: number;
  temperature?: number;
  top_p?: number;
}

// export interface LLMOptions {
//   maxTokens?: number;
//   temperature?: number;
//   top_p?: number;
//   contextWindow: number;
// }

export interface OpenAIOptions {
  provider?: string;
  baseURL: string;
  apiKey: string;
  data: OpenAIRequest;
  stream?: boolean;
}

export async function sendOpenAiRequest(
  options: OpenAIOptions,
  onChunk?: (chunk: string) => void
): Promise<string | void> {
  const isStreaming = options.stream === true && onChunk !== undefined;
  const requestData = { ...options.data, stream: isStreaming };
  
  // Ensure baseURL ends with /
  const normalizedBaseURL = options.baseURL.endsWith('/') ? options.baseURL : `${options.baseURL}/`;
  const apiURL = `${normalizedBaseURL}chat/completions`;
  
  // --- Xử lý cho trường hợp KHÔNG STREAMING (giữ lại code cũ nếu cần) ---
  if (!isStreaming) {
    // Bạn có thể giữ lại hàm gmFetchLLM cũ cho trường hợp này,
    // hoặc tạo một request mới ở đây.
    // hoặc tạo một request mới ở đây.
    
    const response = await gmFetchLLM(apiURL, { // Giả sử gmFetchLLM cũ vẫn tồn tại
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(requestData),
    });
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

  // --- Xử lý cho trường hợp STREAMING ---
  console.log("🎬 STREAMING MODE ACTIVATED"); // Debug: Check if streaming is triggered
  
  if (!onChunk) {
    throw new Error('onChunk callback is required for streaming mode');
  }

  // Buffer để lưu trữ các dòng dữ liệu chưa hoàn chỉnh
  let buffer = "";

  const processDataChunk = (newData: string) => {
    // Nối dữ liệu mới vào buffer
    buffer += newData;

    // Tách buffer thành các dòng
    const lines = buffer.split('\n');

    // Dòng cuối cùng có thể chưa hoàn chỉnh, giữ lại nó trong buffer cho lần sau
    buffer = lines.pop() || "";

    // Xử lý từng dòng hoàn chỉnh
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data: ")) {
        const jsonStr = trimmedLine.slice(5).trim();
        if (jsonStr === "[DONE]") {
          // Stream đã kết thúc từ phía server
          return;
        }
        try {
          const data = JSON.parse(jsonStr);
          const content = data?.choices?.[0]?.delta?.content;
          if (content) {
            // Gửi nội dung đến callback cuối cùng của người dùng
            onChunk(content);
          }
        } catch (e) {
          console.warn("Could not parse streaming JSON chunk:", jsonStr, e);
        }
      }
    }
  };

  try {
    // Gọi hàm streaming mới
    await gmFetchLLMStream(apiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify(requestData),
      onChunk: processDataChunk, // Cung cấp hàm xử lý chunk
    });
    // Khi promise resolve, stream đã kết thúc
    console.log("LLM stream finished successfully.");
  } catch (error) {
    console.error("Error during LLM stream:", error);
    // Báo lỗi cho người dùng, ví dụ: onChunk("[ERROR]...")
    onChunk(`\n\n[LỖI]: ${(error as Error).message}`);
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