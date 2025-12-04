# Per-ModelType Default Models - Implementation

## 🎯 Vấn đề

Trước đây, hệ thống chỉ cho phép **1 model default cho TẤT CẢ**. Nhưng với Multi-Model System (chat, extraction, embedding), cần **1 default model CHO MỖI type**.

## ✅ Giải pháp

### 1. Updated `toggleDefault` Logic

**Trước:**
```typescript
// Reset TẤT CẢ models khác
db.LLMModels.updateMany({ id: { $ne: _model.id } }, {
  $set: { isDefault: false }
})
```

**Sau:**
```typescript
// Chỉ reset models CÙNG modelType
db.LLMModels.updateMany({ 
  id: { $ne: _model.id },
  modelType: _model.modelType // ← Chỉ models cùng type
}, {
  $set: { isDefault: false }
})
```

### 2. Updated Default Check Logic

**Trước:**
```typescript
// Kiểm tra có default model nào không (global)
if (db.LLMModels.find({ isDefault: true }).count() === 0) {
  // Set first model làm default
}
```

**Sau:**
```typescript
// Kiểm tra có default model cho TYPE này không
const defaultModelOfType = db.LLMModels.findOne({ 
  modelType: _model.modelType,
  isDefault: true 
})

if (!defaultModelOfType) {
  // Set first model of THIS TYPE làm default
  const firstModelOfType = db.LLMModels.findOne({ 
    modelType: _model.modelType 
  })
  // ...
}
```

### 3. Added ModelType Badge in UI

```vue
<span 
  v-if="model.modelType"
  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
  :class="{
    'bg-purple-100 text-purple-800': model.modelType === 'chat',
    'bg-orange-100 text-orange-800': model.modelType === 'extraction',
    'bg-cyan-100 text-cyan-800': model.modelType === 'embedding'
  }"
>
  <span v-if="model.modelType === 'chat'">💬</span>
  <span v-else-if="model.modelType === 'extraction'">🧠</span>
  <span v-else-if="model.modelType === 'embedding'">🔢</span>
  {{ model.modelType }}
</span>
```

## 📊 Kết quả

### Trước (1 Default Global)
```
Models:
- GPT-4 (chat) ✅ DEFAULT
- GPT-3.5 (extraction)
- text-embedding-3-small (embedding)

❌ Vấn đề: Chỉ GPT-4 là default, các type khác không có default!
```

### Sau (1 Default Per Type)
```
Models:
- GPT-4 (chat) ✅ DEFAULT for CHAT
- GPT-3.5 (extraction) ✅ DEFAULT for EXTRACTION
- text-embedding-3-small (embedding) ✅ DEFAULT for EMBEDDING

✅ Mỗi type có default riêng!
```

## 🎨 UI Changes

### Model Card Display
```
┌─────────────────────────────────┐
│ GPT-4                           │
│ gpt-4-turbo-preview             │
│ [OpenAI] [💬 chat]              │ ← Badge mới
│                                 │
│ Default Model: ✅               │
└─────────────────────────────────┘
```

### Badge Colors
- **💬 Chat**: Purple (`bg-purple-100 text-purple-800`)
- **🧠 Extraction**: Orange (`bg-orange-100 text-orange-800`)
- **🔢 Embedding**: Cyan (`bg-cyan-100 text-cyan-800`)

## 🔧 Files Modified

1. **`src/components/llm_models/LLMIndex.vue`**
   - Updated `toggleDefault()` function
   - Added modelType badge to template

2. **`src/components/llm_models/Modal.vue`**
   - Already has modelType selector (done in previous steps)

## 📝 Usage Example

### Scenario: User adds 3 models

```typescript
// 1. Add Chat Model
{
  name: "GPT-4",
  modelType: "chat",
  isDefault: false
}
// → Auto set as default for 'chat' type

// 2. Add Extraction Model
{
  name: "GPT-3.5",
  modelType: "extraction",
  isDefault: false
}
// → Auto set as default for 'extraction' type

// 3. Add Embedding Model
{
  name: "text-embedding-3-small",
  modelType: "embedding",
  isDefault: false
}
// → Auto set as default for 'embedding' type

// Result:
// - 3 default models (1 per type)
// - Each type has its own default
```

### Scenario: User toggles default

```typescript
// User clicks "Set as Default" on GPT-4o (chat)
toggleDefault(gpt4o, true)

// What happens:
// 1. Set GPT-4o.isDefault = true
// 2. Find all models with modelType = 'chat' AND id != gpt4o.id
// 3. Set their isDefault = false
// 4. Models with modelType = 'extraction' or 'embedding' NOT affected ✅
```

## ✅ Benefits

1. **Proper Multi-Model Support**: Each type has its own default
2. **No Conflicts**: Toggling chat default doesn't affect extraction/embedding
3. **Clear UI**: Badges show model type at a glance
4. **Auto-Selection**: First model of each type auto-becomes default

## 🚀 Next Steps

1. ✅ Logic updated
2. ✅ UI updated
3. ⏳ User needs to add embedding model
4. ⏳ Test RAG system with all 3 model types

---

**Implemented**: 2025-12-04 17:14  
**Status**: ✅ COMPLETE
