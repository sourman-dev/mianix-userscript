# User Profile in AI Prompts - Implementation

## 🎯 Objective
Include full user profile information in AI prompts, not just the name. This allows AI to understand user's appearance, personality, background, current status, and inventory without manually adding them to character cards.

## 📋 Profile Fields

### UserProfile Structure
```typescript
{
  name: string;              // Required - User's name
  appearance?: string;       // Optional - Physical description
  personality?: string;      // Optional - Character traits
  background?: string;       // Optional - Backstory
  currentStatus?: string;    // Optional - Current situation
  inventory?: string[];      // Optional - Items user has
}
```

## ✅ Implementation

### 1. Updated buildFinalPrompt Signature
```typescript
// BEFORE
userProfile: { name: string }

// AFTER
userProfile: { 
  name: string;
  appearance?: string;
  personality?: string;
  background?: string;
  currentStatus?: string;
  inventory?: string[];
}
```

### 2. Added Profile Section Builder
```typescript
const buildUserProfileSection = () => {
  const sections = [];
  
  // Only add non-empty fields
  if (userProfile.appearance?.trim()) {
    sections.push(`**Ngoại hình:** ${userProfile.appearance}`);
  }
  if (userProfile.personality?.trim()) {
    sections.push(`**Tính cách:** ${userProfile.personality}`);
  }
  if (userProfile.background?.trim()) {
    sections.push(`**Lý lịch:** ${userProfile.background}`);
  }
  if (userProfile.currentStatus?.trim()) {
    sections.push(`**Trạng thái hiện tại:** ${userProfile.currentStatus}`);
  }
  if (userProfile.inventory && userProfile.inventory.length > 0) {
    sections.push(`**Đồ đạc:** ${userProfile.inventory.join(', ')}`);
  }
  
  // Return empty if no fields
  if (sections.length === 0) return '';
  
  return `
  <user_profile name="${userProfile.name}">
  ${sections.join('\n  ')}
  </user_profile>
  `;
};
```

### 3. Updated ChatScreen to Pass Full Profile
```typescript
// BEFORE
{ name: currentUser.value?.name || 'Anonymous' }

// AFTER
currentUser.value || { name: 'Anonymous' }
```

## 📊 Prompt Structure

### Complete System Prompt
```xml
<system>
  <!-- Multi-mode instructions -->
  
  <!-- Long-term memories (if any) -->
  <long_term_memory>
  **Thông tin quan trọng từ các cuộc trò chuyện trước:**
  - User likes coffee
  - User is a developer
  </long_term_memory>
  
  <!-- User profile (NEW!) -->
  <user_profile name="Sofia">
  **Ngoại hình:** Một cô gái trẻ với mái tóc dài màu nâu
  **Tính cách:** Tò mò, thích phiêu lưu, hơi bốc đồng
  **Lý lịch:** Là một phù thủy mới vào nghề
  **Trạng thái hiện tại:** Đang tìm kiếm nguyên liệu cho phép thuật
  **Đồ đạc:** Cây gậy phép, Bình thuốc hồi máu, Bản đồ cổ
  </user_profile>
  
  <!-- Character description -->
  <character_description>
  Alice is a wise wizard...
  </character_description>
  
  <!-- Character personality -->
  <character_personality>
  Calm, patient, knowledgeable...
  </character_personality>
  
  <!-- Scenario -->
  <scenario>
  You meet in a magical forest...
  </scenario>
</system>
```

## 🎯 Benefits

### Before (Manual Copy-Paste)
```
1. Create profile "Sofia"
2. Import character card
3. Manually copy profile info to character description
4. Repeat for every new character ❌
```

### After (Automatic)
```
1. Create profile "Sofia" once
2. Import any character card
3. Profile info automatically in prompt ✅
4. Works for all characters!
```

## 📝 Examples

### Example 1: Full Profile
```typescript
Profile: {
  name: "Sofia",
  appearance: "Một cô gái trẻ với mái tóc dài màu nâu",
  personality: "Tò mò, thích phiêu lưu",
  background: "Là một phù thủy mới vào nghề",
  currentStatus: "Đang tìm kiếm nguyên liệu",
  inventory: ["Cây gậy phép", "Bình thuốc hồi máu"]
}

Prompt includes:
<user_profile name="Sofia">
**Ngoại hình:** Một cô gái trẻ với mái tóc dài màu nâu
**Tính cách:** Tò mò, thích phiêu lưu
**Lý lịch:** Là một phù thủy mới vào nghề
**Trạng thái hiện tại:** Đang tìm kiếm nguyên liệu
**Đồ đạc:** Cây gậy phép, Bình thuốc hồi máu
</user_profile>
```

### Example 2: Minimal Profile (Name Only)
```typescript
Profile: {
  name: "Roger"
  // No other fields
}

Prompt includes:
(No user_profile section - only name used for {{user}} replacement)
```

### Example 3: Partial Profile
```typescript
Profile: {
  name: "Alex",
  personality: "Brave and loyal",
  inventory: ["Sword", "Shield"]
  // No appearance, background, currentStatus
}

Prompt includes:
<user_profile name="Alex">
**Tính cách:** Brave and loyal
**Đồ đạc:** Sword, Shield
</user_profile>
```

## 🧪 Testing Scenarios

### Test 1: Full Profile
```
1. Create profile with all fields filled
2. Start chat
3. Check system prompt contains all profile info ✅
```

### Test 2: Empty Fields
```
1. Create profile with only name
2. Start chat
3. Check no <user_profile> section in prompt ✅
```

### Test 3: Partial Fields
```
1. Create profile with name + personality only
2. Start chat
3. Check only personality appears in prompt ✅
```

### Test 4: AI Understanding
```
1. Profile: "Đang bị thương, cần nghỉ ngơi"
2. Ask AI: "Tôi có nên đi phiêu lưu không?"
3. AI should consider user's injured status ✅
```

## 🎭 Use Cases

### RPG Scenarios
```
Profile:
- Appearance: Knight in shining armor
- Inventory: Holy sword, Shield of light
- Current Status: Wounded from last battle

AI will:
- Describe user as knight
- Reference user's equipment
- Consider user's wounded state
```

### Story Continuation
```
Profile:
- Background: Lost memories, searching for identity
- Personality: Cautious, observant
- Current Status: Just woke up in strange place

AI will:
- Maintain amnesia storyline
- Reflect cautious personality
- Continue from current situation
```

### Character Consistency
```
Same profile across multiple characters:
- Character A (Merchant) knows user is a wizard
- Character B (Guard) knows user has magic staff
- Character C (Innkeeper) knows user is tired

All from same profile! No manual copying!
```

## 📝 Files Modified

1. **`src/utils/prompt-utils.ts`**
   - Updated `buildFinalPrompt` signature
   - Added `buildUserProfileSection` function
   - Inserted profile section in system prompt

2. **`src/components/chat_screen/ChatScreen.vue`**
   - Changed to pass full `currentUser.value` object
   - Instead of just `{ name: ... }`

## 🔮 Future Enhancements

### 1. Dynamic Profile Updates
```typescript
// Update profile mid-conversation
function updateProfileStatus(newStatus: string) {
  currentUser.value.currentStatus = newStatus;
  // Prompt automatically includes new status
}
```

### 2. Profile Templates
```typescript
const templates = {
  warrior: {
    appearance: "Strong, muscular build",
    inventory: ["Sword", "Shield", "Armor"]
  },
  mage: {
    appearance: "Robed figure with staff",
    inventory: ["Magic staff", "Spell book"]
  }
};
```

### 3. Conditional Sections
```typescript
// Show different profile aspects based on character type
if (character.type === 'combat') {
  // Show inventory prominently
} else if (character.type === 'social') {
  // Show personality prominently
}
```

### 4. Profile History
```typescript
// Track profile changes over time
{
  currentStatus: "Fully healed", // Current
  statusHistory: [
    { time: 1234, status: "Wounded" },
    { time: 5678, status: "Recovering" }
  ]
}
```

## ⚠️ Important Notes

1. **Empty Check**: Only non-empty fields are included
2. **Trim Whitespace**: `?.trim()` ensures no empty strings
3. **Array Check**: Inventory checked for `length > 0`
4. **Fallback**: If no fields, no `<user_profile>` section
5. **Name Always Used**: Even if no profile section, name still replaces `{{user}}`

---

**Implemented**: 2025-12-04 23:53  
**Status**: ✅ COMPLETE  
**Impact**: AI now understands full user context automatically! 🎭✨
