import { LLM_PROVIDERS_API, SERVER_BASE_URL } from '@/constants';
import { fetchAndCached, FetchCachedOption } from './gm-helper';
// import { RawCharacterData } from '@/newDb';
export async function getLLMProviders(isForced: boolean = false) {
  const options: FetchCachedOption = {
    apiURL: LLM_PROVIDERS_API,
    apiType: "json",
    nameOfCache: "mianix:llm_providers",
  }
  return await fetchAndCached(options, isForced);
}

export async function getPresetResouce(pathName: string, apiType: 'json' | 'text', isForced: boolean = false) {
  const options: FetchCachedOption = {
    apiURL: `${SERVER_BASE_URL}/presets/${pathName}`,
    apiType: apiType,
    nameOfCache: `mianix:${pathName}`,
  }
  return await fetchAndCached(options, isForced);
}

export function fileSizeHuman(size: number){
  if(size < 1024) return `${size} bytes`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = 0;
  size = size / 1024; // Convert to KB first
  while(size >= 1024 && i < units.length - 1){
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

export function clearHtmlTag(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, "");
}

export function clearHtmlTagAndLineBreak(text: string): string {
  return text.replace(/<\/?[^>]+(>|$)/g, "").replace(/\n/g, "");
}

export function textTruncate(text: string, maxLength: number, isClearHtml: boolean = false): string {
  if (isClearHtml) {
    text = clearHtmlTagAndLineBreak(text);
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Chuyển đổi một chuỗi kebab-case thành camelCase
 * Ví dụ: "first-mes" -> "firstMes"
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Đệ quy chuyển đổi tất cả keys trong object từ kebab-case sang camelCase
 */
function convertKeysToCamelCase(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamelCase(item));
  }

  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = kebabToCamel(key);
      newObj[camelKey] = convertKeysToCamelCase(obj[key]);
    }
  }
  return newObj;
}

export function mergeObjects<T extends object, U extends object>(obj1: T, obj2: U): T & U {
  function isObject(item: any): item is object {
    return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date) && !(item instanceof Map) && !(item instanceof Set);
  }

  function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    if (!isObject(target) || !isObject(source)) {
      return source;
    }

    const output: Record<string, any> = { ...target };
    
    for (const key in source) {
      if (isObject(source[key])) {
        if (key in target && isObject(target[key])) {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          output[key] = { ...source[key] };
        }
      } else if (Array.isArray(source[key])) {
        output[key] = [...source[key]];
      } else if (source[key] instanceof Date) {
        output[key] = new Date(source[key]);
      } else if (source[key] instanceof Map) {
        output[key] = new Map(source[key]);
      } else if (source[key] instanceof Set) {
        output[key] = new Set(source[key]);
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  return deepMerge(obj1, obj2) as T & U;
}

export function jsonStrToJson(valueToSave: string) {
  try {
    let cleanValue = valueToSave.trim();
    // Remove markdown code block if present
    if (cleanValue.startsWith('```json')) {
      cleanValue = cleanValue.replace(/^```json[\r\n]+|```$/g, '');
    }
    // Remove single-line comments
    cleanValue = cleanValue.replace(new RegExp('(^|\\s)//.*$', 'gm'), '');
    // Remove multi-line comments
    cleanValue = cleanValue.replace(/\/\*[\s\S]*?\*\//g, '');
    // Optionally: Replace template variables with empty string
    cleanValue = cleanValue.replace(/{{[^}]+}}/g, '');
    // Remove trailing commas before closing brackets/braces
    cleanValue = cleanValue.replace(/,\s*([}\]])/g, '$1');
    // Try to parse if it's a JSON string
    return JSON.parse(cleanValue);
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return null;
  }
}