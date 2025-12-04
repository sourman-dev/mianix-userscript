import { GM } from '$';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer';

interface GmFetchOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string | FormData | Blob | ArrayBuffer;
  responseType?: ResponseType;
}

export interface FetchCachedOption {
  apiURL: string;
  apiType: 'json' | 'text';
  nameOfCache: string;
  needProcess?: boolean;
}

export async function gmFetch<T = any>(
  url: string, 
  options: GmFetchOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    responseType = 'json'
  } = options;

  // Prepare headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Prepare body data
  let requestData: any = body;
  
  // If body is FormData or Blob, remove Content-Type to let browser set it
  if (body instanceof FormData || body instanceof Blob) {
    delete defaultHeaders['Content-Type'];
  } else if (body && typeof body === 'object' && !(body instanceof ArrayBuffer)) {
    // If body is an object and not ArrayBuffer, stringify it
    requestData = JSON.stringify(body);
  }
  
  // console.log('Request:', { method, url, headers: defaultHeaders, data: requestData });
  
  return new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method,
      url,
      headers: defaultHeaders,
      data: requestData,
      responseType: responseType === 'arrayBuffer' ? 'arraybuffer' : undefined,
      onload: (response) => {
        try {
          // For LLM requests, we don't pre-process the response
          // Let the response object handle parsing based on the actual content
          const result = response.responseText || response.response || null;
          // console.log('Response:', { status: response.status, headers: response.responseHeaders, data: result });
          if (response.status >= 200 && response.status < 300) {
            resolve(result as T);
          } else {
            console.error(`HTTP ${response.status}: ${response.statusText}`);
            reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
          }
        } catch (error) {
          console.error("Error processing response:", error);
          reject(error);
        }
      },
      onerror: (error) => {
        console.error("Network error:", error);
        reject(new Error(`Network error: ${error.error || 'Unknown error'}`));
      },
      ontimeout: () => {
        reject(new Error('Request timeout'));
      }
    });
  });
}

export async function gmFetchLLM<T = any>(
  url: string,
  options: GmFetchOptions = {}
): Promise<any> { // Trả về 'any' vì response có thể là text stream
  const {
    method = 'GET',
    headers = {},
    body,
    responseType = 'text' // Thay đổi mặc định sang 'text' để lấy dữ liệu thô
  } = options;

  // Prepare headers
  const defaultHeaders: Record<string, string> = {
    // 'Content-Type': 'application/json', // Sẽ được set bên dưới nếu là json
    ...headers
  };

  // Prepare body data
  let requestData: any = body;

  // If body is FormData or Blob, remove Content-Type to let browser set it
  if (body instanceof FormData || body instanceof Blob) {
    delete defaultHeaders['Content-Type'];
  } else if (body && typeof body === 'object' && !(body instanceof ArrayBuffer)) {
    // If body is an object and not ArrayBuffer, stringify it
    requestData = JSON.stringify(body);
    defaultHeaders['Content-Type'] = 'application/json'; // Đặt Content-Type khi gửi JSON
  }

  return new Promise((resolve, reject) => {
    let fullResponseText = ''; // Tích lũy toàn bộ text response
    let isStreamingDetected = false;

    GM.xmlHttpRequest({
      method,
      url,
      headers: defaultHeaders,
      data: requestData,
      // Không cần responseType ở đây nếu chúng ta muốn đọc text thô
      // GM.xmlHttpRequest trả về responseText mặc định là text
      onreadystatechange: (response) => {
        if (response.readyState === 3) {
          // Phát hiện streaming dựa trên dấu hiệu của LLM SSE
          // Nếu bạn mong đợi Server-Sent Events
          if (!isStreamingDetected && response.responseText && response.responseText.includes('data: ')) {
            isStreamingDetected = true;
            // Trong trạng thái 3, chúng ta có thể có dữ liệu đến, nhưng không nên xử lý ngay tại đây
            // mà để onload xử lý toàn bộ. Tuy nhiên, nếu bạn muốn xử lý realtime,
            // bạn có thể đẩy dữ liệu vào một queue hoặc emit event.
            // Cách đơn giản nhất là để onload xử lý toàn bộ.
          }
          // Nếu là streaming, chúng ta không resolve ở đây.
          // Đợi readyState 4.
        } else if (response.readyState === 4) {
          // Yêu cầu đã hoàn thành
          fullResponseText = response.responseText || '';
          
          const responseObj = {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText || 'OK',
            headers: response.responseHeaders, // Headers thường là string, cần parse nếu cần
            responseText: fullResponseText, // Toàn bộ text response
            // Tích hợp phương thức json() và text() theo chuẩn Fetch API
            json: async () => {
              if (responseObj.ok && responseObj.responseText) {
                try {
                  return JSON.parse(responseObj.responseText);
                } catch (e) {
                  console.error("Failed to parse JSON:", e);
                  return null;
                }
              }
              return null;
            },
            text: async () => responseObj.responseText,
            // Để đơn giản, ta không giả lập getReader() ở đây nữa.
            // Nếu bạn thực sự cần stream từ GM.xmlHttpRequest, nó sẽ phức tạp hơn.
            // Nhưng với LLM, chúng ta thường mong đợi output cuối cùng hoặc là các chunk SSE đã được xử lý.
            body: {
              getReader: () => {
                // Đây là giả lập rất đơn giản, chỉ cho các trình duyệt không hỗ trợ SSE
                // hoặc khi bạn muốn lấy toàn bộ response dưới dạng stream giả lập
                const encoder = new TextEncoder();
                const data = encoder.encode(responseObj.responseText);
                let position = 0;
                return {
                  read: async (): Promise<{ done: boolean, value?: Uint8Array }> => {
                    if (position >= data.length) {
                      return { done: true, value: undefined };
                    }
                    const chunkSize = Math.min(1024, data.length - position);
                    const chunk = data.slice(position, position + chunkSize);
                    position += chunkSize;
                    return { done: false, value: chunk };
                  }
                };
              }
            }
          };
          resolve(responseObj);
        }
      },
      onload: (response) => {
        // onload được gọi khi request hoàn thành (readyState 4).
        // Chúng ta đã xử lý ở onreadystatechange, nên ở đây có thể bỏ trống hoặc log.
        // if (!isStreamingDetected) {
        //   const responseObj = {
        //     ok: response.status >= 200 && response.status < 300,
        //     status: response.status,
        //     statusText: response.statusText || 'OK',
        //     headers: response.responseHeaders,
        //     responseText: response.responseText || '',
        //     json: async () => {
        //       if (responseObj.ok && responseObj.responseText) {
        //         try { return JSON.parse(responseObj.responseText); } catch (e) { return null; }
        //       }
        //       return null;
        //     },
        //     text: async () => responseObj.responseText,
        //     body: { // Fallback body reader
        //       getReader: () => {
        //         const encoder = new TextEncoder();
        //         const data = encoder.encode(responseObj.responseText);
        //         let position = 0;
        //         return {
        //           read: async (): Promise<{ done: boolean, value?: Uint8Array }> => {
        //             if (position >= data.length) { return { done: true, value: undefined }; }
        //             const chunkSize = Math.min(1024, data.length - position);
        //             const chunk = data.slice(position, position + chunkSize);
        //             position += chunkSize;
        //             return { done: false, value: chunk };
        //           }
        //         };
        //       }
        //     }
        //   };
        //   resolve(responseObj);
        // }
      },
      onerror: (error) => {
        console.error("Network error:", error);
        reject(new Error(`Network error: ${error.error || 'Unknown error'}`));
      },
      ontimeout: () => {
        reject(new Error('Request timeout'));
      }
    });
  });
}

// Định nghĩa kiểu dữ liệu cho options để code rõ ràng hơn
interface GmFetchStreamOptions extends GmFetchOptions {
  onChunk: (chunk: string) => void; // Callback để xử lý từng mảnh dữ liệu mới
}

/**
 * Hàm này được thiết kế ĐẶC BIỆT cho việc streaming.
 * Nó không trả về dữ liệu, mà gọi onChunk mỗi khi có dữ liệu mới.
 * Nó trả về một Promise sẽ resolve khi stream kết thúc.
 */
export function gmFetchLLMStream(
  url: string,
  options: GmFetchStreamOptions
): Promise<void> {
  const {
    method = 'POST', // Streaming thường là POST
    headers = {},
    body,
    onChunk,
  } = options;

  return new Promise((resolve, reject) => {
    // Biến này cực kỳ quan trọng: nó theo dõi vị trí cuối cùng chúng ta đã xử lý trong responseText
    let lastProcessedPosition = 0;

    // Prepare headers
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    let requestData: any = body;
    if (body instanceof FormData || body instanceof Blob) {
      delete defaultHeaders['Content-Type'];
    } else if (body && typeof body === 'object') {
      requestData = JSON.stringify(body);
    }

    GM.xmlHttpRequest({
      method,
      url,
      headers: defaultHeaders,
      data: requestData,
      
      // 🔧 FIX: Dùng onprogress thay vì onreadystatechange
      // Một số Tampermonkey version không trigger readyState 3
      onprogress: (response) => {
        const currentResponseText = response.responseText || '';
        // Lấy phần dữ liệu MỚI kể từ lần kiểm tra trước
        const newData = currentResponseText.substring(lastProcessedPosition);
        
        if (newData) {
          console.log(`📦 Streaming chunk received (onprogress): ${newData.length} chars`); // Debug
          // Gọi callback với chỉ dữ liệu mới
          onChunk(newData);
          // Cập nhật vị trí đã xử lý
          lastProcessedPosition = currentResponseText.length;
        }
      },

      // onload được gọi khi request hoàn thành (readyState 4)
      onload: (response) => {
        // Xử lý nốt phần dữ liệu cuối cùng (nếu có)
        const finalData = (response.responseText || '').substring(lastProcessedPosition);
        if (finalData) {
          onChunk(finalData);
        }

        if (response.status >= 200 && response.status < 300) {
          resolve(); // Stream thành công, resolve Promise
        } else {
          // Vẫn có thể có lỗi ngay cả khi onload
          console.error(`HTTP ${response.status}: ${response.statusText}`, response.responseText);
          reject(new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${response.responseText}`));
        }
      },

      onerror: (error) => {
        console.error("Network error:", error);
        reject(new Error(`Network error: ${error.error || 'Unknown error'}`));
      },

      ontimeout: () => {
        reject(new Error('Request timeout'));
      }
    });
  });
}

export async function fetchAndCached(options: FetchCachedOption, isForced: boolean = false){
  const { apiURL, apiType, nameOfCache } = options;
  const lastCheck = await GM.getValue(`${nameOfCache}-check`);
  const cached = await GM.getValue(nameOfCache);
  const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  if (isForced || !lastCheck || !cached || Date.now() - lastCheck > twelveHours) {
    try {
      let data = await gmFetch(apiURL, {
        method: 'GET',
        responseType: apiType
      });

      if(data){
        await GM.setValue(nameOfCache, apiType === 'json' ? JSON.stringify(data): data);
        await GM.setValue(`${nameOfCache}-check`, Date.now());
      }

      return data;
    } catch (error) {
      console.error("Error fetching:", error);
      return cached ? JSON.parse(cached) : null;
    }
  }

  return apiType === 'json' ? JSON.parse(cached): cached;
}