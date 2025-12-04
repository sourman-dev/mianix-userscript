# Memory Cleanup on Replay - Implementation

## 🎯 Problem
When user clicks "Replay" to regenerate AI response, old memories from the previous response were not deleted, causing duplicate memories for the same conversation turn.

### Before
```
1. User: "Tell me a joke"
   AI (v1): "Why did the chicken cross the road?"
   → Memory: "User asked for joke, AI told chicken joke"

2. User clicks REPLAY
   AI (v2): "Knock knock! Who's there? Banana!"
   → Memory: "User asked for joke, AI told banana joke"

3. Database: 2 memories for SAME turn ❌
```

### After
```
1. User: "Tell me a joke"
   AI (v1): "Why did the chicken cross the road?"
   → Memory: "User asked for joke, AI told chicken joke"

2. User clicks REPLAY
   → Delete old memories for this message
   AI (v2): "Knock knock! Who's there? Banana!"
   → Memory: "User asked for joke, AI told banana joke"

3. Database: 1 memory (latest) ✅
```

## ✅ Solution: Option 1 - Delete Old, Create New

### Implementation Steps

#### 1. Update Memory Schema
Added `relatedMessageId` to track which message created each memory:

```typescript
export type MemoryEntryType = {
  id: string;
  characterId: string;
  content: string;
  type: MemoryType;
  tags: string[];
  importance: number;
  embedding: number[];
  relatedMessageId?: string; // ← NEW: Link to message
  createdAt: number;
  lastAccessed: number;
};
```

#### 2. Update extractMemories Function
Added messageId parameter and cleanup logic:

```typescript
static async extractMemories(
  characterId: string,
  userMessage: string,
  aiMessage: string,
  messageId?: string // ← NEW: Optional for cleanup
) {
  // ... extraction model check ...
  
  // 🗑️ Delete old memories (if replay)
  if (messageId) {
    const oldMemories = db.Memories.find({ 
      relatedMessageId: messageId 
    }).fetch();
    
    if (oldMemories.length > 0) {
      console.log(`🗑️ Deleting ${oldMemories.length} old memories`);
      oldMemories.forEach(mem => {
        db.Memories.removeOne({ id: mem.id });
      });
    }
  }
  
  // ... extract new memories ...
  
  // Save with relatedMessageId
  db.Memories.insert({
    // ... other fields ...
    relatedMessageId: messageId, // ← Link to message
  });
}
```

#### 3. Update Dialogue Store
Pass messageId through the chain:

```typescript
async handlePostResponseProcess(
  userInput: string, 
  aiResponse: string, 
  messageId?: string // ← NEW
) {
  // ... checks ...
  
  MemoryService.extractMemories(
    this.currentDialogue.id,
    userInput,
    aiResponse,
    messageId // ← Pass messageId
  );
}
```

#### 4. Update ChatScreen
Pass messageId in both scenarios:

```typescript
// Normal send
dialogueStore.handlePostResponseProcess(
  newUserInput, 
  aiResponseRaw, 
  pendingNodeId // ← Pass message ID
);

// Replay
dialogueStore.handlePostResponseProcess(
  userInput, 
  aiResponseRaw, 
  messageId // ← Pass message ID
);
```

## 🔄 Flow Diagram

### Normal Send (First Time)
```
User sends message
  ↓
Create message (ID: msg-123)
  ↓
AI responds
  ↓
extractMemories(characterId, userMsg, aiMsg, "msg-123")
  ↓
Check for old memories with relatedMessageId="msg-123"
  → None found (first time)
  ↓
Extract new memories
  ↓
Save with relatedMessageId="msg-123"
```

### Replay (Regenerate)
```
User clicks Replay on msg-123
  ↓
AI responds (new response)
  ↓
extractMemories(characterId, userMsg, aiMsg, "msg-123")
  ↓
Check for old memories with relatedMessageId="msg-123"
  → Found 2 old memories ✓
  ↓
Delete old memories 🗑️
  ↓
Extract new memories from new response
  ↓
Save with relatedMessageId="msg-123"
```

## 📊 Database Changes

### Memory Collection
```typescript
// Before
{
  id: "mem-1",
  characterId: "char-123",
  content: "User asked for joke, AI told chicken joke",
  // ... no link to message
}

// After
{
  id: "mem-1",
  characterId: "char-123",
  content: "User asked for joke, AI told banana joke",
  relatedMessageId: "msg-123", // ← Links to message
  // ...
}
```

## 🎯 Benefits

1. **No Duplicate Memories** - Each message has only one set of memories
2. **Accurate Memory** - Always reflects the latest AI response
3. **Clean Database** - No orphaned or outdated memories
4. **Backward Compatible** - `relatedMessageId` is optional, old memories still work

## 🧪 Testing Scenarios

### Test 1: Normal Send
```
1. Send message → Check memories created with relatedMessageId
2. Verify memory count = expected
```

### Test 2: Replay Once
```
1. Send message → 2 memories created
2. Replay → Old 2 deleted, new 3 created
3. Verify total = 3 (not 5)
```

### Test 3: Multiple Replays
```
1. Send message → 2 memories
2. Replay #1 → 3 memories
3. Replay #2 → 1 memory
4. Replay #3 → 4 memories
5. Verify total = 4 (latest only)
```

### Test 4: Replay Different Messages
```
1. Send msg-1 → 2 memories (relatedMessageId: msg-1)
2. Send msg-2 → 3 memories (relatedMessageId: msg-2)
3. Replay msg-1 → Delete 2, create 1
4. Verify msg-2 memories untouched (still 3)
```

## 📝 Files Modified

1. **`src/db/index.ts`**
   - Added `relatedMessageId?: string` to `MemoryEntryType`

2. **`src/services/memory-service.ts`**
   - Updated `extractMemories` signature
   - Added cleanup logic before extraction
   - Added `relatedMessageId` to insert

3. **`src/stores/dialogue.ts`**
   - Updated `handlePostResponseProcess` signature
   - Pass `messageId` to `extractMemories`

4. **`src/components/chat_screen/ChatScreen.vue`**
   - Pass `pendingNodeId` in normal send
   - Pass `messageId` in replay

## 🔮 Future Enhancements

1. **Batch Delete** - Use `removeMany` instead of loop
2. **Memory Versioning** - Keep history of memory changes
3. **Memory Diff** - Show what changed on replay
4. **Undo Replay** - Restore old memories if user cancels

---

**Implemented**: 2025-12-04 21:15  
**Status**: ✅ COMPLETE  
**Impact**: Prevents duplicate memories on replay ✨
