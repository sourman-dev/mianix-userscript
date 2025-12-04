# Native Fetch Streaming Implementation

## 🎯 Vấn đề

`GM.xmlHttpRequest` trong Tampermonkey **không trigger `readyState 3`** và **`onprogress` cũng không hoạt động**, khiến streaming bị mất.

## ✅ Giải pháp

Sử dụng **native `fetch` API** với `ReadableStream` cho providers hỗ trợ CORS.

## 📁 Files Created

### 1. `src/utils/llm-fetch.ts`
Native fetch implementation với streaming thật sự.

**Features:**
- ✅ Streaming qua `ReadableStream`
- ✅ SSE (Server-Sent Events) parsing
- ✅ Proper error handling
- ✅ Sync & Stream convenience functions
- ✅ CORS testing utility

### 2. `src/utils/llm-smart.ts`
Smart wrapper tự động chọn giữa fetch và GM.

**Features:**
- ✅ Auto-detect CORS support
- ✅ Cache CORS test results
- ✅ Fallback to GM if fetch fails
- ✅ Prefer fetch for streaming (better support)

## 🔧 Changes Made

### ChatScreen.vue
```typescript
// TRƯỚC
import { sendOpenAiRequestStream } from '@/utils/llm';

// SAU
import { sendOpenAiRequestFetchStream } from '@/utils/llm-fetch';
```

## 📊 Comparison

### GM.xmlHttpRequest (Old)
```
❌ readyState 3 không trigger
❌ onprogress không hoạt động
❌ Phải chờ response hoàn thành
❌ Không streaming thật sự
```

### Native Fetch (New)
```
✅ ReadableStream hoạt động
✅ Chunks được nhận realtime
✅ Streaming thật sự
✅ Chữ xuất hiện từng chữ một
```

## 🌐 Provider Compatibility

### ✅ CORS-Enabled (Use Fetch)
- **OpenAI**: `https://api.openai.com/v1`
- **Groq**: `https://api.groq.com/openai/v1`
- **Together AI**: `https://api.together.xyz/v1`
- **Local Ollama**: `http://localhost:11434/v1`
- **Local LM Studio**: `http://localhost:1234/v1`

### ❌ CORS-Blocked (Use GM)
- **Anthropic**: `https://api.anthropic.com` (blocked)
- **Some proxies**: Depends on configuration

## 🚀 Usage

### Option 1: Direct Fetch (Recommended for CORS providers)
```typescript
import { sendOpenAiRequestFetchStream } from '@/utils/llm-fetch';

await sendOpenAiRequestFetchStream(options, (chunk) => {
  console.log(chunk); // Realtime streaming!
});
```

### Option 2: Smart Auto-Select
```typescript
import { sendOpenAiRequestSmartStream } from '@/utils/llm-smart';

// Auto-detect CORS and choose best method
await sendOpenAiRequestSmartStream(options, (chunk) => {
  console.log(chunk);
});
```

### Option 3: Force GM (For non-CORS providers)
```typescript
import { sendOpenAiRequestStream } from '@/utils/llm';

// Use GM.xmlHttpRequest (no streaming, but works with CORS-blocked)
await sendOpenAiRequestStream(options, (chunk) => {
  console.log(chunk);
});
```

## 🧪 Testing

### Test CORS Support
```typescript
import { testCORS } from '@/utils/llm-fetch';

const supportsCORS = await testCORS(
  'https://api.openai.com/v1',
  'sk-...'
);

console.log(supportsCORS); // true or false
```

### Test Streaming
1. Open DevTools Console
2. Send a chat message
3. Look for logs:
   - `✅ Fetch stream finished successfully` → Streaming works!
   - Chunks appearing in realtime → Success!

## 📝 Code Flow

### Fetch Streaming Flow
```
1. fetch(apiURL, { stream: true })
   ↓
2. response.body.getReader()
   ↓
3. while (true) { reader.read() }
   ↓
4. Decode chunk → Parse SSE → Extract content
   ↓
5. onChunk(content) → UI updates REALTIME ✨
   ↓
6. done? → Break loop
```

### SSE Parsing
```
Raw chunk:
"data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n"

After parsing:
→ content = "Hello"
→ onChunk("Hello")
→ UI shows "Hello" immediately
```

## ⚠️ Limitations

### Fetch API
- ❌ Blocked by CORS if provider doesn't allow
- ✅ Streaming works perfectly
- ✅ Modern browsers only

### GM.xmlHttpRequest
- ✅ Bypasses CORS
- ❌ Streaming doesn't work (Tampermonkey limitation)
- ✅ Works in all Userscript managers

## 🎯 Recommendation

1. **Use Fetch** for providers that support CORS (OpenAI, Groq, Ollama, etc.)
2. **Use GM** only for CORS-blocked providers (Anthropic, some proxies)
3. **Avoid providers** that both block CORS AND you need streaming

## 📈 Performance

### Before (GM without streaming)
```
Request → Wait 10s → Full response appears
User experience: 😴 Boring, feels slow
```

### After (Fetch with streaming)
```
Request → Chunk 1 (0.1s) → Chunk 2 (0.2s) → ... → Done
User experience: 🤩 Exciting, feels fast!
```

## 🔍 Debugging

### If streaming doesn't work:
1. Check console for `✅ Fetch stream finished successfully`
2. If not, check for CORS errors
3. If CORS error, switch to GM or use CORS proxy
4. If fetch works but no chunks, check SSE parsing logic

### Common Issues:
- **CORS error**: Provider doesn't support CORS → Use GM
- **No chunks**: Provider not sending SSE format → Check API docs
- **Slow streaming**: Network issue, not code issue

---

**Implemented**: 2025-12-04 19:41  
**Status**: ✅ WORKING (for CORS-enabled providers)
