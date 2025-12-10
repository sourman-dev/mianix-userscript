// src/services/memory-service.ts
import { db, MemoryType } from "@/db";
import { sendOpenAiRequestFetchSync } from "@/utils/llm-fetch";
import { getEmbeddingModel, getExtractionModel } from "@/utils/model-helpers";

// Hàm tính độ tương đồng Cosine giữa 2 vector
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

export class MemoryService {
  
  // 1. Tạo Embedding (Dùng EMBEDDING MODEL chuyên dụng)
  static async generateEmbedding(text: string): Promise<number[]> {
    const embeddingModel = getEmbeddingModel();
    
    if (!embeddingModel) {
      console.error("❌ No embedding model configured! Please add an embedding model.");
      return [];
    }
    
    try {
      // Xử lý URL endpoint
      let embedUrl = embeddingModel.baseUrl;
      
      // Loại bỏ trailing slash nếu có
      if (embedUrl.endsWith('/')) {
        embedUrl = embedUrl.slice(0, -1);
      }
      
      // Thêm path cho embeddings
      if (!embedUrl.includes('/embeddings')) {
        embedUrl = `${embedUrl}/embeddings`;
      }
        
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
      
      if (!response.ok) {
        console.error("Embedding API error:", response.status, response.statusText);
        return [];
      }
      
      const data = await response.json();
      return data.data?.[0]?.embedding || [];
    } catch (e) {
      console.error("Embedding generation failed:", e);
      return [];
    }
  }

  // 2. Trích xuất ký ức sau mỗi lượt chat (Dùng EXTRACTION MODEL)
  static async extractMemories(
    characterId: string,
    userMessage: string,
    aiMessage: string,
    messageId?: string // ← NEW: Optional message ID for cleanup
  ) {
    const extractionModel = getExtractionModel();
    
    if (!extractionModel) {
      console.warn('⚠️ No extraction model, skipping memory extraction');
      return;
    }
    
    // 🗑️ Delete old memories related to this message (if replay)
    if (messageId) {
      const oldMemories = db.Memories.find({ relatedMessageId: messageId }).fetch();
      if (oldMemories.length > 0) {
        console.log(`🗑️ Deleting ${oldMemories.length} old memories for message ${messageId}`);
        oldMemories.forEach(mem => {
          db.Memories.removeOne({ id: mem.id });
        });
      }
    }
    
    const prompt = `Phân tích đoạn hội thoại sau và trích xuất các thông tin quan trọng cần ghi nhớ về người dùng hoặc sự kiện.

Chỉ trích xuất những thông tin có giá trị lâu dài như:
- Sự thật về người dùng (tên, tuổi, nghề nghiệp, sở thích)
- Sự kiện quan trọng đã xảy ra
- Mối quan hệ giữa các nhân vật
- Quyết định hoặc cam kết của người dùng

KHÔNG trích xuất những thông tin tạm thời như cảm xúc nhất thời, câu hỏi đơn giản.

User: ${userMessage}
AI: ${aiMessage}

Trả về JSON array (KHÔNG dùng markdown):
[{"content": "mô tả ngắn gọn", "type": "fact|event|preference|relationship", "importance": 0.1-1.0}]

Nếu không có thông tin quan trọng nào, trả về: []`;

    try {
      const response = await sendOpenAiRequestFetchSync({
        provider: extractionModel.llmProvider,
        baseURL: extractionModel.baseUrl,
        apiKey: extractionModel.apiKey,
        data: {
          model: extractionModel.modelName, // Dùng extraction model (rẻ hơn)
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          stream: false
        }
      });

      // Xử lý response để lấy JSON
      let jsonText = response.content.trim();
      
      console.log("🔍 Raw Extraction Response:", jsonText); // Debug log

      if (!jsonText) {
        console.warn("⚠️ Empty response from extraction model");
        return;
      }
      
      // Cố gắng tìm JSON array trong text (xử lý trường hợp LLM nói nhảm)
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      } else {
        // Fallback: Loại bỏ markdown code blocks nếu không tìm thấy match rõ ràng
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Parse JSON
      let memories;
      try {
        memories = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError);
        console.error("❌ Invalid JSON Text:", jsonText);
        return;
      }
      
      if (!Array.isArray(memories) || memories.length === 0) {
        console.log("📝 No important memories to extract from this conversation");
        return;
      }
      
      // Lưu từng ký ức
      for (const m of memories) {
        const embedding = await this.generateEmbedding(m.content);
        
        if (embedding.length === 0) {
          console.warn("⚠️ Failed to generate embedding, skipping memory:", m.content);
          continue;
        }
        
        db.Memories.insert({
          id: crypto.randomUUID(),
          characterId,
          content: m.content,
          type: m.type as MemoryType,
          tags: [],
          importance: m.importance,
          embedding,
          relatedMessageId: messageId, // ← Link to message
          createdAt: Date.now(),
          lastAccessed: Date.now()
        });
      }
      
      console.log(`✅ Extracted and saved ${memories.length} memories`);
    } catch (e) {
      console.error("❌ Memory extraction failed:", e);
    }
  }

  // 3. Tìm kiếm ký ức liên quan (Retrieval - Dùng EMBEDDING MODEL)
  static async retrieveRelevantMemories(
    characterId: string,
    query: string,
    limit: number = 5
  ): Promise<string> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (queryEmbedding.length === 0) {
        console.warn("⚠️ Failed to generate query embedding");
        return "";
      }

      const allMemories = db.Memories.find({ characterId }).fetch();
      
      if (allMemories.length === 0) {
        console.log("📝 No memories found for this character");
        return "";
      }
      
      const scored = allMemories.map(mem => ({
        ...mem,
        score: cosineSimilarity(queryEmbedding, mem.embedding)
      }));

      // Lọc theo ngưỡng (> 0.5) và sắp xếp theo điểm số
      const relevant = scored
        .filter(m => m.score > 0.5) 
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (relevant.length === 0) {
        console.log("📝 No relevant memories found (all below threshold)");
        return "";
      }

      // Cập nhật lastAccessed cho các ký ức được truy xuất
      relevant.forEach(m => {
        db.Memories.updateOne(
          { id: m.id },
          { $set: { lastAccessed: Date.now() } }
        );
      });

      console.log(`✅ Retrieved ${relevant.length} relevant memories`);
      
      // Format thành chuỗi để đưa vào prompt
      return relevant.map(m => `- ${m.content} (importance: ${m.importance.toFixed(2)})`).join("\n");
    } catch (e) {
      console.error("❌ Memory retrieval failed:", e);
      return "";
    }
  }

  // 4. Xóa memories liên quan đến message (khi delete message)
  static deleteMemoriesForMessage(messageId: string): number {
    const memories = db.Memories.find({ relatedMessageId: messageId }).fetch();
    
    if (memories.length > 0) {
      console.log(`🗑️ Deleting ${memories.length} memories for deleted message ${messageId}`);
      memories.forEach(mem => {
        db.Memories.removeOne({ id: mem.id });
      });
    }
    
    return memories.length;
  }
}