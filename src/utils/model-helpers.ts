// src/utils/model-helpers.ts
import { db, LLMModel, ModelType } from '@/db';

/**
 * Lấy model theo type, ưu tiên model có isDefault = true
 */
export function getModelByType(type: ModelType): LLMModel | null {
  // Tìm model có type và isDefault = true
  const defaultModel = db.LLMModels.findOne({ 
    modelType: type, 
    isDefault: true 
  }) as LLMModel | null;
  
  if (defaultModel) {
    console.log(`✅ Using default ${type} model:`, defaultModel.name);
    return defaultModel;
  }
  
  // Fallback: Lấy model đầu tiên có type này
  const anyModel = db.LLMModels.findOne({ modelType: type }) as LLMModel | null;
  
  if (anyModel) {
    console.log(`⚠️ Using first available ${type} model:`, anyModel.name);
    return anyModel;
  }
  
  console.warn(`❌ No ${type} model found!`);
  return null;
}

/**
 * Lấy Chat Model (dùng cho response người dùng)
 */
export function getChatModel(): LLMModel | null {
  return getModelByType('chat');
}

/**
 * Lấy Extraction Model (dùng cho phân tích và trích xuất ký ức)
 * Fallback về chat model nếu không có extraction model
 */
export function getExtractionModel(): LLMModel | null {
  const extractionModel = getModelByType('extraction');
  
  if (extractionModel) {
    return extractionModel;
  }
  
  // Fallback: Dùng chat model nếu không có extraction model
  console.warn('⚠️ No extraction model, falling back to chat model');
  return getChatModel();
}

/**
 * Lấy Embedding Model (dùng cho tạo vector)
 */
export function getEmbeddingModel(): LLMModel | null {
  return getModelByType('embedding');
}

/**
 * Kiểm tra xem có đủ models cần thiết cho RAG không
 */
export function validateRAGModels(): {
  isValid: boolean;
  missing: ModelType[];
  warnings: string[];
} {
  const missing: ModelType[] = [];
  const warnings: string[] = [];
  
  // Chat model là bắt buộc
  if (!getChatModel()) {
    missing.push('chat');
  }
  
  // Embedding model là bắt buộc cho RAG
  if (!getEmbeddingModel()) {
    missing.push('embedding');
    warnings.push('RAG memory system will not work without embedding model');
  }
  
  // Extraction model không bắt buộc (có thể dùng chat model)
  if (!getModelByType('extraction')) {
    warnings.push('No extraction model found, will use chat model (more expensive)');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings
  };
}
