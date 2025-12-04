# Profile Selection for New Dialogues - Implementation

## 🎯 Objective
Implement profile selection when starting a new chat with a character. Each dialogue is linked to a specific user profile, and the profile's name replaces `{{user}}` placeholders in the character card.

## ✅ Implementation

### 1. Updated Database Schema

#### Added `profileId` to DialogType
```typescript
export type DialogType = {
  id: string;
  createdAt: number;
  currentNodeId: string;
  profileId?: string; // ← NEW: Links dialogue to user profile
  llmOptions: LLMOptions;
};
```

### 2. Updated Character Cards Index

#### New Flow Logic
```typescript
const handleToChat = (characterId: string) => {
  const existingDialogue = db.Dialogues.findOne({ id: characterId });
  
  if (existingDialogue) {
    // ✅ Dialogue exists → Go to chat directly
    dialogueStore.loadDialogue(characterId);
    useScreen.setScreen(SCREENS.CHAT, { id: characterId });
  } else {
    // ❌ No dialogue → Show profile selector
    pendingCharacterId.value = characterId;
    useModal.openModal(MODALS.PROFILE_SELECTOR);
  }
}
```

#### Profile Selection Handler
```typescript
const handleProfileSelected = (profile: UserProfile) => {
  const characterId = pendingCharacterId.value;
  
  // 1. Create dialogue with profileId
  const newDialogue = db.Dialogues.insert({
    id: characterId,
    createdAt: Date.now(),
    currentNodeId: 'root',
    profileId: profile.id, // ← Link to profile
    llmOptions: { ... }
  });
  
  // 2. Get first greeting and replace {{user}}
  let firstGreeting = characterCard.getGreeting();
  firstGreeting = firstGreeting.replace(/\{\{user\}\}/gi, profile.name);
  firstGreeting = firstGreeting.replace(/\{user\}/gi, profile.name);
  
  // 3. Create first message
  db.DialogueMessages.insert({
    id: crypto.randomUUID(),
    dialogueId: newDialogue.id,
    parentId: 'root',
    userInput: '',
    assistantResponse: firstGreeting,
    status: 'completed',
    createdAt: Date.now(),
  });
  
  // 4. Navigate to chat
  dialogueStore.loadDialogue(characterId);
  useScreen.setScreen(SCREENS.CHAT, { id: characterId });
}
```

### 3. Added ProfileSelectorModal to Template
```vue
<template>
  <div>
    <!-- Character cards -->
    <CharacterImport @character-imported="handleCharacterImported" />
    <ProfileSelectorModal @select-profile="handleProfileSelected" />
  </div>
</template>
```

## 🔄 User Flow

### Scenario 1: First Time Chatting with Character
```
1. User clicks "Chat" button on character card
   ↓
2. Check dialogue → NOT FOUND
   ↓
3. Show ProfileSelectorModal
   ↓
4. User selects profile (e.g., "Roger")
   ↓
5. Create dialogue with profileId
   ↓
6. Replace {{user}} with "Roger" in first greeting
   ↓
7. Navigate to chat screen
   ↓
8. Chat starts with personalized greeting
```

### Scenario 2: Returning to Existing Chat
```
1. User clicks "Chat" button on character card
   ↓
2. Check dialogue → FOUND
   ↓
3. Load existing dialogue
   ↓
4. Navigate to chat screen directly
   ↓
5. Continue existing conversation
```

## 📊 Data Structure

### Before (No Profile)
```typescript
Dialogue {
  id: "char-123",
  currentNodeId: "root",
  llmOptions: {...}
}

First Message:
"Hello {{user}}! How are you?" // ← Generic
```

### After (With Profile)
```typescript
Dialogue {
  id: "char-123",
  currentNodeId: "root",
  profileId: "profile-456", // ← Linked to Roger
  llmOptions: {...}
}

First Message:
"Hello Roger! How are you?" // ← Personalized!
```

## 🔧 {{user}} Replacement

### Patterns Replaced
```typescript
// Case-insensitive replacement
firstGreeting = firstGreeting.replace(/\{\{user\}\}/gi, profile.name);
firstGreeting = firstGreeting.replace(/\{user\}/gi, profile.name);
```

### Examples
```
Input: "Hello {{user}}, welcome to my shop!"
Output: "Hello Roger, welcome to my shop!"

Input: "Nice to meet you, {user}!"
Output: "Nice to meet you, Roger!"

Input: "{{USER}} is a brave adventurer"
Output: "Roger is a brave adventurer"
```

## 📝 Files Modified

1. **`src/db/index.ts`**
   - Added `profileId?: string` to `DialogType`

2. **`src/components/character_cards/Index.vue`**
   - Implemented `handleToChat` with dialogue check
   - Added `handleProfileSelected` handler
   - Added `ProfileSelectorModal` component
   - Imported `ProfileSelectorModal`

## ✅ Benefits

### User Experience
- ✅ **Personalized greetings** - Character greets user by name
- ✅ **Profile-specific roleplay** - Each dialogue tied to a profile
- ✅ **Seamless flow** - Existing chats continue without interruption
- ✅ **Clear selection** - Modal shows all available profiles

### Data Integrity
- ✅ **One dialogue per character** - Enforced by using characterId as dialogue ID
- ✅ **Profile linkage** - Each dialogue knows which profile is being used
- ✅ **Persistent association** - Profile stays with dialogue forever

## 🎯 Future Enhancements (TODO)

### 1. Replace {{user}} in All Character Fields
Currently only replaces in `firstGreeting`. Should also replace in:
- `description`
- `personality`
- `scenario`
- `mes_example`

### 2. Display Current Profile in Chat
Show which profile is active in the chat header:
```
Chat with Alice
Using profile: Roger
```

### 3. Allow Profile Switching
Add ability to change profile for existing dialogue:
```
[Settings] → Change Profile → Select new profile → Re-replace {{user}}
```

### 4. Profile-Specific Memory
Filter memories by profileId:
```typescript
const memories = db.Memories.find({ 
  characterId: dialogue.id,
  profileId: dialogue.profileId 
});
```

## 🧪 Testing Checklist

- [x] Click chat on new character → Profile selector shows
- [x] Select profile → Dialogue created with profileId
- [x] {{user}} replaced in first greeting
- [x] Navigate to chat successfully
- [x] Click chat on existing character → Go directly to chat
- [ ] Test with multiple profiles
- [ ] Test {{user}} replacement in all character fields
- [ ] Test profile display in chat UI

---

**Implemented**: 2025-12-04 20:22  
**Status**: ✅ CORE COMPLETE, 🔄 ENHANCEMENTS PENDING
