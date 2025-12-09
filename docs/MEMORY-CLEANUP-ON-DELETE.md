# Memory Cleanup on Delete - Implementation

## 🎯 Problem
When deleting messages, dialogues, or characters, their associated memories were not deleted, causing:
- **Memory leaks** in IndexedDB
- **Browser crashes** on mobile devices due to excessive storage
- **Orphaned data** that can never be accessed again

## ✅ Solution

### Created Memory Cleanup Helpers
New file: `src/utils/memory-cleanup.ts`

```typescript
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
```

## 📊 Integration Points

### 1. Delete Dialogue (ChatScreen.vue)
```typescript
const handleRemoveDialogue = () => {
  confirmDelete(info, {
    onConfirm: (info) => {
      // 🗑️ Xóa memories trước (giải phóng bộ nhớ)
      const deletedMemories = deleteMemoriesForCharacter(info.id);
      console.log(`🗑️ Deleted ${deletedMemories} memories`);
      
      // Xóa messages và dialogue
      db.DialogueMessages.removeMany({ dialogueId: info.id });
      db.Dialogues.removeOne({ id: info.id });
      
      // Navigate back
      screenStore.setScreen(SCREENS.CHARACTER_LIST);
    }
  });
};
```

### 2. Delete Character (Index.vue)
```typescript
async function handleDelete(card: CharacterCard) {
  confirmDelete(card, {
    onConfirm: async () => {
      // 🗑️ Xóa memories trước (giải phóng bộ nhớ)
      const deletedMemories = deleteMemoriesForCharacter(card.id);
      console.log(`🗑️ Deleted ${deletedMemories} memories`);
      
      // Xóa character data
      db.CharacterCards.removeOne({ id: card.id });
      db.Storage.removeOne({ id: card.id });
      db.Dialogues.removeOne({ id: card.id });
      db.DialogueMessages.removeMany({ dialogueId: card.id });
    }
  });
}
```

### 3. Delete Message (Future - TODO)
```typescript
if (buttonName === 'delete') {
  // 🗑️ Xóa memories của message này
  deleteMemoriesForMessage(messageId);
  
  // Xóa message
  dialogueStore.deleteMessage(messageId);
}
```

## 🔄 Cleanup Flow

### Delete Dialogue
```
User clicks "Delete Dialogue"
  ↓
Confirm dialog
  ↓
Find all memories with characterId
  ↓
Delete memories (e.g., 150 memories) 🗑️
  ↓
Delete all messages
  ↓
Delete dialogue
  ↓
Navigate to character list
```

### Delete Character
```
User clicks "Delete Character"
  ↓
Confirm dialog
  ↓
Find all memories with characterId
  ↓
Delete memories (e.g., 150 memories) 🗑️
  ↓
Delete character card
  ↓
Delete storage (image)
  ↓
Delete dialogue
  ↓
Delete all messages
```

### Delete Message (Future)
```
User clicks "Delete Message"
  ↓
Find memories with relatedMessageId
  ↓
Delete memories (e.g., 2-3 memories) 🗑️
  ↓
Delete message
```

## 📈 Impact

### Before
```
Character with 100 messages
  → 150 memories created
  → Delete character
  → 150 orphaned memories remain ❌
  → IndexedDB grows indefinitely
  → Mobile browser crashes
```

### After
```
Character with 100 messages
  → 150 memories created
  → Delete character
  → 150 memories deleted ✅
  → IndexedDB stays clean
  → No memory leaks
```

## 🧪 Testing Scenarios

### Test 1: Delete Dialogue
```
1. Chat with character → 50 memories created
2. Delete dialogue
3. Check console: "🗑️ Deleted 50 memories"
4. Verify memories gone from IndexedDB
```

### Test 2: Delete Character
```
1. Create character with long conversation
2. Check memory count (e.g., 100)
3. Delete character
4. Check console: "🗑️ Deleted 100 memories"
5. Verify all data cleaned up
```

### Test 3: Multiple Characters
```
1. Character A: 50 memories
2. Character B: 30 memories
3. Delete Character A
4. Verify only A's memories deleted (50)
5. Verify B's memories intact (30)
```

## 💾 Storage Savings

### Example Scenario
```
1 Memory ≈ 2KB (with embedding vector)
100 messages × 1.5 memories/message = 150 memories
150 memories × 2KB = 300KB per character

10 characters deleted = 3MB saved ✅
100 characters deleted = 30MB saved ✅
```

## 📝 Files Modified

1. **`src/utils/memory-cleanup.ts`** (NEW)
   - Created helper functions for memory cleanup

2. **`src/components/chat_screen/ChatScreen.vue`**
   - Added memory cleanup to `handleRemoveDialogue`
   - Imported `deleteMemoriesForCharacter`

3. **`src/components/character_cards/Index.vue`**
   - Added memory cleanup to `handleDelete`
   - Imported `deleteMemoriesForCharacter`

## 🔮 Future Enhancements

### 1. Batch Delete Optimization
```typescript
// Instead of loop
memories.forEach(mem => db.Memories.removeOne({ id: mem.id }));

// Use batch delete (if minimongo supports)
db.Memories.removeMany({ 
  id: { $in: memories.map(m => m.id) } 
});
```

### 2. Cleanup Statistics
```typescript
interface CleanupStats {
  memoriesDeleted: number;
  storageFreed: number; // bytes
  timeElapsed: number; // ms
}

function deleteMemoriesForCharacter(characterId: string): CleanupStats {
  const startTime = Date.now();
  // ... cleanup ...
  return {
    memoriesDeleted: count,
    storageFreed: count * 2048, // estimate
    timeElapsed: Date.now() - startTime
  };
}
```

### 3. Undo Delete
```typescript
// Store deleted memories temporarily
const deletedMemories = memories.map(m => ({ ...m }));
localStorage.setItem('lastDeleted', JSON.stringify(deletedMemories));

// Restore if user cancels within 5 seconds
setTimeout(() => {
  localStorage.removeItem('lastDeleted');
}, 5000);
```

### 4. Auto Cleanup Old Memories
```typescript
// Clean up memories older than 30 days
function cleanupOldMemories() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const oldMemories = db.Memories.find({
    lastAccessed: { $lt: thirtyDaysAgo }
  }).fetch();
  
  // Delete old memories
  oldMemories.forEach(mem => {
    db.Memories.removeOne({ id: mem.id });
  });
}
```

## ⚠️ Important Notes

1. **Deletion is permanent** - No undo after confirmation
2. **Cascade delete** - Deleting character deletes everything
3. **Performance** - May take time for characters with many memories
4. **Mobile friendly** - Prevents browser crashes from storage overflow

---

**Implemented**: 2025-12-04 23:17  
**Status**: ✅ COMPLETE  
**Impact**: Prevents memory leaks and browser crashes 🚀
