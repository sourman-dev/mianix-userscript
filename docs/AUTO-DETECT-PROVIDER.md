# Auto-Detect Provider Feature

## 🎯 Tính năng

### Tự động nhận diện LLM Provider từ Base URL

Thay vì phải chọn provider từ dropdown (cần call server), giờ hệ thống sẽ **tự động detect** provider dựa trên Base URL.

## 🔧 Cách hoạt động

### 1. User nhập Base URL
```
Base URL: https://api.openai.com/v1
```

### 2. Hệ thống auto-detect provider
```
LLM Provider: OpenAI ← Tự động điền
ℹ️ Auto-detected: OpenAI
```

### 3. User có thể edit nếu muốn
```
LLM Provider: [OpenAI] ← Có thể sửa thành tên khác
```

## 📋 Supported Providers

### Cloud Providers

| Provider | Base URL Pattern | Auto-detected Name |
|----------|-----------------|-------------------|
| **OpenAI** | `api.openai.com` | OpenAI |
| **Anthropic** | `api.anthropic.com` | Anthropic |
| **Google** | `generativelanguage.googleapis.com` | Google |
| **Groq** | `api.groq.com` | Groq |
| **Together AI** | `api.together.xyz` | Together AI |
| **Perplexity** | `api.perplexity.ai` | Perplexity |
| **Mistral** | `api.mistral.ai` | Mistral |
| **Cohere** | `api.cohere.ai` | Cohere |

### Local Providers

| Provider | Base URL Pattern | Auto-detected Name |
|----------|-----------------|-------------------|
| **Ollama** | `localhost:11434` or `127.0.0.1:11434` | Ollama |
| **LM Studio** | `localhost:1234` or `127.0.0.1:1234` | LM Studio |

### Custom

Nếu không match pattern nào → `Custom`

## 💡 Benefits

### 1. Không cần server call
- ❌ Trước: Phải fetch providers từ server
- ✅ Sau: Detect local, không cần network

### 2. Offline-friendly
- Hoạt động ngay cả khi không có internet
- Không phụ thuộc vào server

### 3. Flexible
- User vẫn có thể edit provider name
- Không bị giới hạn bởi danh sách có sẵn

### 4. Smart
- Tự động detect cả local providers (Ollama, LM Studio)
- Nhận diện được hầu hết providers phổ biến

## 🎨 UI Flow

### Scenario 1: OpenAI
```
1. Nhập Base URL: https://api.openai.com/v1
   → LLM Provider: OpenAI ✨
   ℹ️ Auto-detected: OpenAI

2. Nhập API Key: sk-...
   → Auto-fetch models ✨
   ✅ Đã tải 15 models
```

### Scenario 2: Ollama (Local)
```
1. Nhập Base URL: http://localhost:11434/v1
   → LLM Provider: Ollama ✨
   ℹ️ Auto-detected: Ollama

2. Nhập API Key: (bất kỳ)
   → Auto-fetch models ✨
   ✅ Đã tải 5 models
```

### Scenario 3: Custom Provider
```
1. Nhập Base URL: https://my-custom-api.com/v1
   → LLM Provider: Custom ✨

2. User có thể edit: My Custom Provider
```

## 🔍 Technical Details

### Detection Function

```typescript
const detectProviderFromUrl = (url: string): string => {
  if (!url) return 'Custom'
  
  const lowerUrl = url.toLowerCase()
  
  // Check patterns
  if (lowerUrl.includes('api.openai.com')) return 'OpenAI'
  if (lowerUrl.includes('api.anthropic.com')) return 'Anthropic'
  if (lowerUrl.includes('localhost:11434')) return 'Ollama'
  // ... more patterns
  
  return 'Custom'
}
```

### Watch Trigger

```typescript
watch(baseUrl, (newBaseUrl) => {
  if (newBaseUrl && !isSettingFromModal.value) {
    const detectedProvider = detectProviderFromUrl(newBaseUrl)
    llmProvider.value = detectedProvider
  }
})
```

### UI Changes

**Trước:**
```vue
<Select v-model="llmProvider" :options="llmProviders_NameAndBaseUrl" />
```

**Sau:**
```vue
<InputText v-model="llmProvider" placeholder="Tự động detect từ Base URL" />
<small v-if="llmProvider !== 'Custom'">
  ℹ️ Auto-detected: {{ llmProvider }}
</small>
```

## 🚀 Combined with Auto-Fetch Models

Khi kết hợp 2 tính năng:

```
1. Nhập Base URL: https://api.openai.com/v1
   → Provider: OpenAI ✨ (auto-detect)

2. Nhập API Key: sk-...
   → Models: [Loading...] ✨ (auto-fetch)
   ✅ Đã tải 15 models

3. Chọn Model Type: 💬 Chat

4. Chọn Model: gpt-4-turbo-preview

5. Save → Done! 🎉
```

## 📊 Comparison

### Old Flow (Server-dependent)
```
1. Modal opens
2. Fetch providers from server ← Network call
3. Wait for response
4. Select provider from dropdown
5. Manually type base URL
6. Manually type model name
```

### New Flow (Client-side)
```
1. Modal opens
2. Type base URL
   → Provider auto-detected ✨
3. Type API key
   → Models auto-fetched ✨
4. Select model from dropdown
5. Done! 🎉
```

**Faster, smarter, offline-friendly!**

## ⚠️ Edge Cases

### 1. Unknown provider
- URL không match pattern nào
- Fallback: `Custom`
- User có thể edit thành tên mong muốn

### 2. Multiple matches
- Ví dụ: URL có cả `openai` và `custom`
- Ưu tiên match đầu tiên (OpenAI)

### 3. Edit mode
- Khi load model cũ, không trigger auto-detect
- Giữ nguyên provider name đã lưu

## 🎉 Summary

**Loại bỏ dependency vào server cho providers!**

- ✅ Auto-detect từ URL
- ✅ Offline-friendly
- ✅ Hỗ trợ 10+ providers
- ✅ User vẫn có thể edit
- ✅ Kết hợp với auto-fetch models
- ✅ UX mượt mà hơn

---

**Implemented**: 2025-12-04  
**Status**: ✅ WORKING
