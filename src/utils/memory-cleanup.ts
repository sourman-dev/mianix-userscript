// Helper functions for memory cleanup
import { db } from "@/db";

/**
 * Xóa memories liên quan đến một message cụ thể
 * Dùng khi: Delete message hoặc Replay message
 */
export function deleteMemoriesForMessage(messageId: string): number {
  const memories = db.Memories.find({ relatedMessageId: messageId }).fetch();
  
  if (memories.length > 0) {
    console.log(`🗑️ Deleting ${memories.length} memories for message ${messageId}`);
    memories.forEach(mem => {
      db.Memories.removeOne({ id: mem.id });
    });
  }
  
  return memories.length;
}

/**
 * Xóa TẤT CẢ memories của một character
 * Dùng khi: Delete dialogue hoặc Delete character
 */
export function deleteMemoriesForCharacter(characterId: string): number {
  const memories = db.Memories.find({ characterId }).fetch();
  
  if (memories.length > 0) {
    console.log(`🗑️ Deleting ${memories.length} memories for character ${characterId}`);
    memories.forEach(mem => {
      db.Memories.removeOne({ id: mem.id });
    });
  }
  
  return memories.length;
}
