# Bug Fix: Auto-Fetch Models Not Working

## 🐛 Vấn đề

Sau khi thêm tính năng auto-detect provider, tính năng auto-fetch models **không hoạt động**.

## 🔍 Root Cause

### Vấn đề 1: Watch Conflict

```typescript
// Watch 1: baseUrl → auto-detect provider
watch(baseUrl, (newBaseUrl) => {
  llmProvider.value = detectProviderFromUrl(newBaseUrl) // ← Set provider
})

// Watch 2: llmProvider → reset fields
watch(llmProvider, (newProvider) => {
  modelName.value = ''
  apiKey.value = '' // ← Reset API key! ❌
})

// Watch 3: [baseUrl, apiKey] → fetch models
watch([baseUrl, apiKey], ([url, key]) => {
  if (url && key) { // ← key đã bị reset = '' ❌
    fetchModels()
  }
})
```

**Flow lỗi:**
```
1. User nhập baseUrl: https://api.openai.com/v1
2. Watch 1 trigger → llmProvider = 'OpenAI'
3. Watch 2 trigger → apiKey = '' (RESET!)
4. User nhập apiKey: sk-...
5. Watch 3 trigger → Nhưng đã quá muộn, logic bị lỗi
```

### Vấn đề 2: Debounce không cleanup

```typescript
// ❌ BAD: Multiple timeouts không được clear
watch([baseUrl, apiKey], () => {
  setTimeout(() => {
    fetchModels() // Có thể gọi nhiều lần!
  }, 500)
})
```

## ✅ Giải pháp

### Fix 1: Thêm flag `isAutoDetecting`

```typescript
const isAutoDetecting = ref(false)

// Watch 1: Set flag khi auto-detect
watch(baseUrl, (newBaseUrl) => {
  if (newBaseUrl && !isSettingFromModal.value) {
    isAutoDetecting.value = true // ← Set flag
    llmProvider.value = detectProviderFromUrl(newBaseUrl)
    nextTick(() => {
      isAutoDetecting.value = false // ← Reset flag
    })
  }
})

// Watch 2: Skip nếu đang auto-detect
watch(llmProvider, (newProvider) => {
  if (isSettingFromModal.value) return
  if (isAutoDetecting.value) return // ← Skip! ✅
  
  // Chỉ reset khi user MANUALLY change provider
  modelName.value = ''
  apiKey.value = ''
})
```

### Fix 2: Proper debounce cleanup

```typescript
let fetchModelsTimeout: ReturnType<typeof setTimeout> | null = null

watch([baseUrl, apiKey], ([newBaseUrl, newApiKey]) => {
  // Clear previous timeout ✅
  if (fetchModelsTimeout) {
    clearTimeout(fetchModelsTimeout)
  }
  
  if (newBaseUrl && newApiKey && !isSettingFromModal.value) {
    fetchModelsTimeout = setTimeout(() => {
      fetchAvailableModels()
      fetchModelsTimeout = null
    }, 500)
  }
})
```

## 📊 Flow sau khi fix

### Scenario: User nhập Base URL rồi API Key

```
1. User nhập baseUrl: https://api.openai.com/v1
   → Watch baseUrl trigger
   → isAutoDetecting = true
   → llmProvider = 'OpenAI'
   → Watch llmProvider trigger
   → Check isAutoDetecting = true → SKIP ✅
   → nextTick → isAutoDetecting = false

2. User nhập apiKey: sk-...
   → Watch [baseUrl, apiKey] trigger
   → Clear previous timeout
   → Set new timeout 500ms
   → After 500ms → fetchAvailableModels() ✅
   → ✅ Đã tải 15 models
```

### Scenario: User nhập API Key rồi Base URL

```
1. User nhập apiKey: sk-...
   → Watch [baseUrl, apiKey] trigger
   → baseUrl = '' → Skip

2. User nhập baseUrl: https://api.openai.com/v1
   → Watch baseUrl trigger
   → llmProvider = 'OpenAI' (không reset apiKey ✅)
   → Watch [baseUrl, apiKey] trigger
   → Both có giá trị → fetchAvailableModels() ✅
   → ✅ Đã tải 15 models
```

## 🎯 Key Changes

### 1. Added `isAutoDetecting` flag
```typescript
const isAutoDetecting = ref(false)
```

### 2. Set flag in baseUrl watch
```typescript
watch(baseUrl, (newBaseUrl) => {
  isAutoDetecting.value = true
  llmProvider.value = detectProviderFromUrl(newBaseUrl)
  nextTick(() => {
    isAutoDetecting.value = false
  })
})
```

### 3. Skip reset when auto-detecting
```typescript
watch(llmProvider, (newProvider) => {
  if (isAutoDetecting.value) return // ← NEW
  // ... reset logic
})
```

### 4. Proper timeout cleanup
```typescript
let fetchModelsTimeout: ReturnType<typeof setTimeout> | null = null

watch([baseUrl, apiKey], () => {
  if (fetchModelsTimeout) {
    clearTimeout(fetchModelsTimeout) // ← NEW
  }
  // ... fetch logic
})
```

## ✅ Testing

### Test Case 1: Base URL → API Key
```
✅ Provider auto-detected
✅ API Key không bị reset
✅ Models được fetch
```

### Test Case 2: API Key → Base URL
```
✅ Provider auto-detected
✅ API Key giữ nguyên
✅ Models được fetch
```

### Test Case 3: Edit existing model
```
✅ Không trigger auto-detect (isSettingFromModal)
✅ Không fetch models khi load data
✅ Chỉ fetch khi user thay đổi
```

### Test Case 4: Rapid typing
```
✅ Timeout được clear
✅ Chỉ gọi API 1 lần (sau 500ms)
✅ Không spam API
```

## 📝 Lessons Learned

### 1. Watch dependencies can conflict
- Cần cẩn thận khi có nhiều watch cùng modify state
- Dùng flags để prevent cascading updates

### 2. Debounce cần cleanup
- Luôn clear timeout trước khi set mới
- Tránh memory leaks và duplicate calls

### 3. Vue reactivity timing
- Dùng `nextTick()` để đảm bảo timing đúng
- Flags cần được reset sau khi Vue update xong

---

**Fixed**: 2025-12-04 15:08  
**Status**: ✅ RESOLVED
