# Hệ thống RAG (Retrieval-Augmented Generation) Memory

## Tổng quan

Hệ thống này triển khai RAG để tối ưu hóa việc gửi context cho LLM bằng cách:

1. **Chỉ gửi 10 tin nhắn gần nhất** thay vì toàn bộ lịch sử chat
2. **Trích xuất và lưu trữ ký ức quan trọng** từ các cuộc hội thoại
3. **Tìm kiếm và đính kèm ký ức liên quan** dựa trên semantic similarity

## Kiến trúc

### 1. Database Schema (`src/db/index.ts`)

```typescript
export type MemoryEntryType = {
  id: string;
  characterId: string;  // ID của nhân vật
  content: string;      // Nội dung ký ức
  type: MemoryType;     // fact | event | preference | relationship
  tags: string[];       // Tags để phân loại
  importance: number;   // Độ quan trọng (0-1)
  embedding: number[];  // Vector embedding cho semantic search
  createdAt: number;
  lastAccessed: number; // Tracking khi nào ký ức được sử dụng
};
```

### 2. Memory Service (`src/services/memory-service.ts`)

#### 2.1 Tạo Embedding
```typescript
static async generateEmbedding(text: string, modelConfig: LLMModel): Promise<number[]>
```
- Gọi API embedding (OpenAI/Ollama) để chuyển text thành vector
- Sử dụng model `text-embedding-3-small` (OpenAI) hoặc tương đương

#### 2.2 Trích xuất Ký ức
```typescript
static async extractMemories(
  characterId: string,
  userMessage: string,
  aiMessage: string,
  modelConfig: LLMModel
)
```
- Chạy **ngầm sau mỗi lượt chat** (không block UI)
- Sử dụng LLM để phân tích và trích xuất thông tin quan trọng
- Chỉ lưu những thông tin có giá trị dài hạn:
  - Sự thật về người dùng (tên, tuổi, nghề nghiệp)
  - Sự kiện quan trọng
  - Mối quan hệ
  - Quyết định/cam kết

#### 2.3 Tìm kiếm Ký ức
```typescript
static async retrieveRelevantMemories(
  characterId: string,
  query: string,
  modelConfig: LLMModel,
  limit: number = 5
): Promise<string>
```
- Tạo embedding cho query (tin nhắn mới của user)
- Tính cosine similarity với tất cả ký ức
- Lọc những ký ức có score > 0.5
- Trả về top 5 ký ức liên quan nhất

### 3. Dialogue Store (`src/stores/dialogue.ts`)

#### 3.1 Getter mới
```typescript
chatHistoryForPrompt(): string
```
- **Chỉ lấy 10 tin nhắn gần nhất** thay vì toàn bộ
- Giảm token usage và tăng tốc độ xử lý

#### 3.2 Actions mới

**prepareContext(userInput: string)**
- Gọi **trước khi gửi tin nhắn**
- Tìm ký ức liên quan và lưu vào `state.relevantMemories`

**handlePostResponseProcess(userInput: string, aiResponse: string)**
- Gọi **sau khi nhận phản hồi từ AI**
- Chạy ngầm để trích xuất ký ức mới

### 4. Prompt Utils (`src/utils/prompt-utils.ts`)

```typescript
export function buildFinalPrompt(
  // ... các params khác
  relevantMemories?: string  // 🆕 Tham số mới
)
```

Ký ức được chèn vào system prompt:
```xml
<long_term_memory>
**Thông tin quan trọng từ các cuộc trò chuyện trước:**
- Người dùng tên là John, 25 tuổi, làm kỹ sư phần mềm (importance: 0.95)
- Người dùng thích đọc sách khoa học viễn tưởng (importance: 0.70)
</long_term_memory>
```

### 5. Chat Screen (`src/components/chat_screen/ChatScreen.vue`)

#### Flow xử lý tin nhắn mới:

```typescript
handleSendMessage() {
  // BƯỚC 0: Tìm ký ức liên quan
  await dialogueStore.prepareContext(userInput);
  
  // BƯỚC 1: Thêm user input (pending)
  const nodeId = dialogueStore.addInput(userInput);
  
  // BƯỚC 2: Gửi request (với ký ức đính kèm)
  const response = await sendRequestToLLM(userInput);
  
  // BƯỚC 3: Trích xuất ký ức mới (background)
  dialogueStore.handlePostResponseProcess(userInput, response);
}
```

## Lợi ích

### 1. Giảm Token Usage
- **Trước**: Gửi toàn bộ 100+ tin nhắn → 10,000+ tokens
- **Sau**: Gửi 10 tin nhắn + 5 ký ức → ~2,000 tokens
- **Tiết kiệm**: ~80% tokens

### 2. Tăng Tốc độ
- Ít tokens → Phản hồi nhanh hơn
- Context ngắn gọn → LLM xử lý hiệu quả hơn

### 3. Bộ nhớ Dài hạn
- Nhớ thông tin quan trọng từ 100+ tin nhắn trước
- Không bị giới hạn bởi context window

### 4. Semantic Search
- Tìm ký ức dựa trên **ý nghĩa**, không chỉ từ khóa
- Ví dụ: "Tôi thích gì?" → Tìm được "User thích đọc sách sci-fi"

## Cấu hình

### Embedding Model
Mặc định sử dụng `text-embedding-3-small` (OpenAI). Để dùng Ollama:

```typescript
// Trong memory-service.ts, dòng 41
model: "nomic-embed-text" // Hoặc model embedding khác của Ollama
```

### Similarity Threshold
Mặc định: 0.5 (50% tương đồng)

```typescript
// Trong memory-service.ts, dòng 164
.filter(m => m.score > 0.5) // Tăng lên 0.7 nếu muốn strict hơn
```

### Số lượng ký ức trả về
Mặc định: 5 ký ức

```typescript
// Khi gọi retrieveRelevantMemories
await MemoryService.retrieveRelevantMemories(
  characterId,
  query,
  model,
  10 // Tăng lên 10 nếu cần nhiều context hơn
);
```

## Monitoring

### Console Logs
- `✅ Extracted X memories` - Trích xuất thành công
- `✅ Retrieved X relevant memories` - Tìm thấy ký ức liên quan
- `📝 No important memories` - Không có gì đáng lưu
- `⚠️ Failed to generate embedding` - Lỗi tạo embedding

### Database
Kiểm tra collection `Memories` trong IndexedDB để xem các ký ức đã lưu.

## Troubleshooting

### Không tạo được embedding
- Kiểm tra API key và base URL
- Đảm bảo endpoint `/embeddings` hoạt động
- Thử với model embedding khác

### Không trích xuất được ký ức
- Kiểm tra response từ LLM có đúng format JSON không
- Tăng temperature xuống 0.1 để response ổn định hơn
- Xem console log để debug

### Ký ức không liên quan
- Tăng similarity threshold lên 0.7-0.8
- Giảm số lượng ký ức trả về xuống 3
- Cải thiện prompt trích xuất để chỉ lưu thông tin quan trọng

## Tương lai

### Cải tiến có thể thêm:
1. **Memory Consolidation**: Gộp các ký ức tương tự
2. **Importance Decay**: Giảm importance theo thời gian
3. **Memory Pruning**: Xóa ký ức ít quan trọng khi quá nhiều
4. **Multi-modal Memory**: Lưu cả hình ảnh, âm thanh
5. **Memory Graph**: Liên kết các ký ức với nhau
