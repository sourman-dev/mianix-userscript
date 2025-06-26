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

  return new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method,
      url,
      headers: defaultHeaders,
      data: requestData,
      responseType: responseType === 'arrayBuffer' ? 'arraybuffer' : undefined,
      onload: (response) => {
        try {
          let result: any;
          
          switch (responseType) {
            case 'json':
              result = response.responseText ? JSON.parse(response.responseText) : null;
              break;
            case 'text':
              result = response.responseText;
              break;
            case 'blob':
              // Convert response to blob
              const contentType = response.responseHeaders ? 
                (response.responseHeaders['content-type' as keyof typeof response.responseHeaders] || response.responseHeaders['Content-Type' as keyof typeof response.responseHeaders]) || 'application/octet-stream' :
                'application/octet-stream';
              const blobData = response.response || response.responseText || '';
              const blob = new Blob([blobData], { type: String(contentType) });
              result = blob;
              break;
            case 'arrayBuffer':
              result = response.response;
              break;
            default:
              result = response.responseText;
          }
          
          if (response.status >= 200 && response.status < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
          }
        } catch (error) {
          reject(error);
        }
      },
      onerror: (error) => {
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