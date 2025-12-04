# Đề xuất: Multi-Model System cho RAG

## 🎯 Vấn đề hiện tại

Hiện tại **1 model default** đang làm **3 việc khác nhau**:

```typescript
const model = db.LLMModels.findOne({ isDefault: true });

// Model này phải:
1. 💬 Response chat          → Cần model mạnh (GPT-4, Claude)
2. 🧠 Trích xuất ký ức       → Cần model nhanh/rẻ (GPT-3.5)
3. 🔢 Tạo embedding vector   → Cần model embedding chuyên dụng
```

### ⚠️ Vấn đề:
- **Embedding SAI**: GPT-4 không phải embedding model!
- **Tốn kém**: Dùng GPT-4 để extract memories = lãng phí
- **Chậm**: Extraction chạy background nhưng vẫn tốn thời gian

---

## 💡 Giải pháp: 3 Model Types

### 1️⃣ **Chat Model** (Response)
- **Mục đích**: Trả lời người dùng
- **Ví dụ**: GPT-4, Claude-3, Gemini-Pro
- **Đặc điểm**: Mạnh, sáng tạo, hiểu context tốt
- **Cost**: Cao ($$$)

### 2️⃣ **Extraction Model** (Phân tích)
- **Mục đích**: Trích xuất ký ức từ hội thoại
- **Ví dụ**: GPT-3.5-turbo, Gemini-Flash, Llama-3-8B
- **Đặc điểm**: Nhanh, rẻ, đủ thông minh
- **Cost**: Thấp ($)

### 3️⃣ **Embedding Model** (Vector)
- **Mục đích**: Chuyển text → vector số
- **Ví dụ**: `text-embedding-3-small`, `nomic-embed-text`
- **Đặc điểm**: Chuyên dụng, rất nhanh, rất rẻ
- **Cost**: Rất thấp (¢)

---

## 🔧 Implementation Plan

### Bước 1: Cập nhật Database Schema

```typescript
// src/db/index.ts

export type ModelType = 'chat' | 'embedding' | 'extraction';

export type LLMModel = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  llmProvider: string;
  isDefault: boolean;
  modelType: ModelType; // 🆕 THÊM MỚI
  createdAt: number;
};
```

### Bước 2: Cập nhật UI Modal

```typescript
// src/components/llm_models/Modal.vue

// Thêm dropdown chọn Model Type
<Select 
  v-model="modelType" 
  :options="modelTypeOptions" 
  optionLabel="label" 
  optionValue="value"
  inputId="modelType" 
  class="w-full" 
/>

const modelTypeOptions = [
  { label: '💬 Chat (Response)', value: 'chat' },
  { label: '🧠 Extraction (Phân tích)', value: 'extraction' },
  { label: '🔢 Embedding (Vector)', value: 'embedding' }
];
```

### Bước 3: Helper Functions

```typescript
// src/utils/model-helpers.ts (NEW FILE)

import { db, LLMModel, ModelType } from '@/db';

export function getModelByType(type: ModelType): LLMModel | null {
  // Tìm model theo type, ưu tiên isDefault
  const defaultModel = db.LLMModels.findOne({ 
    modelType: type, 
    isDefault: true 
  });
  
  if (defaultModel) return defaultModel;
  
  // Fallback: Lấy model đầu tiên có type này
  return db.LLMModels.findOne({ modelType: type });
}

export function getChatModel(): LLMModel | null {
  return getModelByType('chat');
}

export function getExtractionModel(): LLMModel | null {
  // Fallback về chat model nếu không có extraction model
  return getModelByType('extraction') || getChatModel();
}

export function getEmbeddingModel(): LLMModel | null {
  return getModelByType('embedding');
}
```

### Bước 4: Cập nhật Memory Service

```typescript
// src/services/memory-service.ts

import { getChatModel, getExtractionModel, getEmbeddingModel } from '@/utils/model-helpers';

export class MemoryService {
  
  // 1. Tạo Embedding - Dùng EMBEDDING MODEL
  static async generateEmbedding(text: string): Promise<number[]> {
    const embeddingModel = getEmbeddingModel();
    
    if (!embeddingModel) {
      console.error('❌ No embedding model configured!');
      return [];
    }
    
    try {
      const embedUrl = embeddingModel.baseUrl.endsWith('/') 
        ? `${embeddingModel.baseUrl}embeddings` 
        : `${embeddingModel.baseUrl}/embeddings`;
        
      const response = await fetch(embedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${embeddingModel.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: embeddingModel.modelName // Dùng model embedding chuyên dụng
        }),
      });
      
      const data = await response.json();
      return data.data?.[0]?.embedding || [];
    } catch (e) {
      console.error("Embedding generation failed:", e);
      return [];
    }
  }

  // 2. Trích xuất ký ức - Dùng EXTRACTION MODEL
  static async extractMemories(
    characterId: string,
    userMessage: string,
    aiMessage: string
  ) {
    const extractionModel = getExtractionModel();
    
    if (!extractionModel) {
      console.warn('⚠️ No extraction model, skipping memory extraction');
      return;
    }
    
    // ... logic extraction với extractionModel
    const response = await sendOpenAiRequestSync({
      baseURL: extractionModel.baseUrl,
      apiKey: extractionModel.apiKey,
      data: {
        model: extractionModel.modelName, // Dùng model extraction (rẻ hơn)
        // ...
      }
    });
    
    // ... lưu memories
  }

  // 3. Retrieval - Dùng EMBEDDING MODEL
  static async retrieveRelevantMemories(
    characterId: string,
    query: string,
    limit: number = 5
  ): Promise<string> {
    const embeddingModel = getEmbeddingModel();
    
    if (!embeddingModel) {
      console.warn('⚠️ No embedding model, skipping memory retrieval');
      return '';
    }
    
    const queryEmbedding = await this.generateEmbedding(query);
    // ... logic retrieval
  }
}
```

### Bước 5: Cập nhật Dialogue Store

```typescript
// src/stores/dialogue.ts

import { getExtractionModel, getEmbeddingModel } from '@/utils/model-helpers';

export const useDialogueStore = defineStore("dialogue", {
  actions: {
    async prepareContext(userInput: string) {
      if (!this.currentDialogue) return;
      
      // Không cần truyền model nữa, service tự lấy
      this.relevantMemories = await MemoryService.retrieveRelevantMemories(
        this.currentDialogue.id,
        userInput
      );
    },
    
    async handlePostResponseProcess(userInput: string, aiResponse: string) {
      if (!this.currentDialogue) return;
      
      // Không cần truyền model nữa
      MemoryService.extractMemories(
        this.currentDialogue.id,
        userInput,
        aiResponse
      );
    }
  }
});
```

---

## 📊 So sánh Cost

### Trước (1 model cho tất cả):
```
Chat:       GPT-4 ($0.03/1K tokens)
Extraction: GPT-4 ($0.03/1K tokens) ❌ Lãng phí!
Embedding:  GPT-4 (KHÔNG HỖ TRỢ!) ❌ SAI!

→ Total: Rất đắt + Không hoạt động
```

### Sau (3 models chuyên dụng):
```
Chat:       GPT-4         ($0.03/1K tokens)
Extraction: GPT-3.5-turbo ($0.0015/1K tokens) ✅ Rẻ hơn 20x
Embedding:  text-embed-3  ($0.00002/1K tokens) ✅ Rẻ hơn 1500x

→ Total: Tiết kiệm ~90% chi phí cho RAG
```

---

## 🎯 Migration Plan

### Phase 1: Backward Compatible (Tuần 1)
1. ✅ Thêm field `modelType` (optional, default = 'chat')
2. ✅ Tạo helper functions
3. ✅ Cập nhật Memory Service để dùng helpers
4. ✅ Test với 1 model (vẫn hoạt động như cũ)

### Phase 2: UI Update (Tuần 2)
1. ✅ Thêm dropdown Model Type vào Modal
2. ✅ Cập nhật LLMIndex để hiển thị type
3. ✅ Cho phép user tạo nhiều models với types khác nhau

### Phase 3: Full Deployment (Tuần 3)
1. ✅ Tạo 3 models mẫu (chat + extraction + embedding)
2. ✅ Documentation cho user
3. ✅ Monitor performance

---

## 🚀 Quick Start (Sau khi implement)

### Setup 3 Models:

```typescript
// 1. Chat Model (Response)
{
  name: "GPT-4 Chat",
  modelType: "chat",
  modelName: "gpt-4-turbo-preview",
  isDefault: true
}

// 2. Extraction Model (Phân tích)
{
  name: "GPT-3.5 Extraction",
  modelType: "extraction",
  modelName: "gpt-3.5-turbo",
  isDefault: false
}

// 3. Embedding Model (Vector)
{
  name: "OpenAI Embedding",
  modelType: "embedding",
  modelName: "text-embedding-3-small",
  isDefault: false
}
```

---

## ✅ Checklist Implementation

- [ ] Cập nhật `LLMModel` type với `modelType`
- [ ] Tạo `model-helpers.ts` với getter functions
- [ ] Cập nhật `Modal.vue` với Model Type selector
- [ ] Cập nhật `LLMIndex.vue` để hiển thị type
- [ ] Cập nhật `memory-service.ts` để dùng đúng model
- [ ] Cập nhật `dialogue.ts` để không truyền model
- [ ] Migration script cho models cũ
- [ ] Documentation
- [ ] Testing

---

## 📝 Notes

### Về Embedding:
- **Đúng**: Vector embedding là mảng số (float[])
- **Sai**: Dùng GPT-4 để tạo embedding (nó không hỗ trợ!)
- **Đúng**: Dùng model embedding chuyên dụng như `text-embedding-3-small`

### Về API Endpoints:
- Chat: `/v1/chat/completions`
- Embedding: `/v1/embeddings` (khác endpoint!)

### Về Ollama:
- Chat: `llama3`, `mistral`
- Embedding: `nomic-embed-text`, `mxbai-embed-large`

---

**Bạn muốn tôi implement ngay không?** 🚀
