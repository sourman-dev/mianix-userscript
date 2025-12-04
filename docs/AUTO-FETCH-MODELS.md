# Auto-Fetch Models Feature

## 🎯 Tính năng mới

### Tự động tải danh sách models từ API

Khi user nhập **Base URL** và **API Key**, hệ thống sẽ **tự động gọi API** để lấy danh sách models có sẵn.

## 🔧 Cách hoạt động

### 1. API Endpoint
```
GET {baseUrl}/models
Authorization: Bearer {apiKey}
```

### 2. Response Format (OpenAI-compatible)
```json
{
  "data": [
    {"id": "gpt-4-turbo-preview"},
    {"id": "gpt-3.5-turbo"},
    {"id": "text-embedding-3-small"}
  ]
}
```

### 3. Auto-trigger
- Watch `baseUrl` và `apiKey`
- Khi CẢ HAI có giá trị → Tự động gọi API
- Debounce 500ms để tránh spam

### 4. UI States

#### Loading
```
Model Name: [Disabled input with spinner]
ℹ️ Đang tải danh sách models từ API...
```

#### Success
```
Model Name: [Dropdown with fetched models]
✅ Đã tải 15 models
```

#### Error
```
Model Name: [Empty dropdown]
(Console log error)
```

## 📋 Supported Providers

### ✅ OpenAI
```
Base URL: https://api.openai.com/v1
API Key: sk-...
```

### ✅ Ollama
```
Base URL: http://localhost:11434/v1
API Key: (bất kỳ, Ollama không check)
```

### ✅ LM Studio
```
Base URL: http://localhost:1234/v1
API Key: (bất kỳ)
```

### ✅ Together AI
```
Base URL: https://api.together.xyz/v1
API Key: ...
```

### ✅ Groq
```
Base URL: https://api.groq.com/openai/v1
API Key: gsk_...
```

## 🎨 UI Flow

### Bước 1: Chọn Provider (Optional)
```
LLM Provider: [OpenAI ▼]
→ Auto-fill Base URL
```

### Bước 2: Nhập Base URL
```
Base URL: https://api.openai.com/v1
```

### Bước 3: Nhập API Key
```
API Key: sk-...
→ Trigger auto-fetch (sau 500ms)
```

### Bước 4: Loading
```
Model Name: [🔄 Loading...]
ℹ️ Đang tải danh sách models từ API...
```

### Bước 5: Select Model
```
Model Name: [gpt-4-turbo-preview ▼]
✅ Đã tải 15 models
```

## 💡 Benefits

### 1. UX tốt hơn
- ❌ Trước: User phải tự gõ tên model (dễ sai)
- ✅ Sau: Chọn từ dropdown (chính xác 100%)

### 2. Discover models
- User biết được provider có những models nào
- Không cần tra docs

### 3. Validate API credentials
- Nếu fetch thành công → API key đúng
- Nếu fail → API key sai hoặc URL sai

## 🔍 Technical Details

### Code Location
`src/components/llm_models/Modal.vue`

### Key Functions

#### fetchAvailableModels()
```typescript
const fetchAvailableModels = async () => {
  // 1. Chuẩn hóa URL
  let modelsUrl = baseUrl.value
  if (!modelsUrl.includes('/models')) {
    modelsUrl = `${modelsUrl}/models`
  }
  
  // 2. Call API
  const response = await fetch(modelsUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey.value}`
    }
  })
  
  // 3. Parse response
  const data = await response.json()
  const models = data.data.map(m => m.id || m.name)
  
  // 4. Update state
  selectedProvider.value.models = models
  filteredModels.value = models
}
```

#### Watch trigger
```typescript
watch([baseUrl, apiKey], ([newBaseUrl, newApiKey]) => {
  if (newBaseUrl && newApiKey && !isSettingFromModal.value) {
    setTimeout(() => {
      fetchAvailableModels()
    }, 500) // Debounce
  }
})
```

## ⚠️ Edge Cases

### 1. Provider không hỗ trợ /models endpoint
- Một số provider custom có thể không có endpoint này
- Fallback: User vẫn có thể gõ tay model name

### 2. CORS issues
- Nếu gọi từ browser, có thể bị CORS
- Solution: Dùng proxy hoặc backend

### 3. Rate limiting
- Debounce 500ms để tránh spam
- Chỉ gọi khi CẢ HAI fields đều có giá trị

## 🚀 Future Improvements

### 1. Cache models
- Lưu models đã fetch vào localStorage
- Không cần fetch lại mỗi lần mở modal

### 2. Filter by model type
- Nếu chọn Model Type = Embedding
- Chỉ show embedding models trong dropdown

### 3. Model info tooltip
- Hover vào model name
- Show thông tin: context window, pricing, etc.

---

**Implemented**: 2025-12-04  
**Status**: ✅ WORKING
