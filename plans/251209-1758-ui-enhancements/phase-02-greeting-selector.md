# Phase 02: Alternate Greetings Selector

**Parent Plan:** [plan.md](./plan.md)
**Date:** 2025-12-09
**Priority:** P0
**Status:** Pending
**Dependencies:** None (independent of Phase 01)

## Overview

Add dropdown selector for alternate greetings in ProfileSelectorModal. User can select specific greeting or "Random" (default behavior).

## Key Insights from Codebase

1. **ProfileSelectorModal.vue** - Currently only handles profile selection, emits `selectProfile`
2. **Index.vue:180-238** - `handleProfileSelected()` creates dialogue with `characterCard.getGreeting()`
3. **CharacterCard.getGreeting()** (db/index.ts:113-124) - Returns random from `alternateGreetings` or `firstMessage`
4. **alternateGreetings** - Array of strings in CharacterCardData (types/character.d.ts:59)

## Requirements

- [ ] Add dropdown only if `alternate_greetings.length > 0`
- [ ] Options: ["Random", ...alternate_greetings] with text truncation (50 chars + "...")
- [ ] Add readonly Textarea to preview full selected greeting
- [ ] Default selection: -1 (Random) = current behavior
- [ ] Pass selected index to parent for dialogue creation

## Architecture

```
ProfileSelectorModal.vue
     │
     ├── Props: characterId (NEW - to fetch greetings)
     │
     ├── State: selectedGreetingIndex = ref(-1)
     │
     ├── Computed: greetingOptions = [Random, ...truncated greetings]
     │
     ├── Computed: selectedGreetingPreview (full text)
     │
     └── Emit: selectProfile(profile, greetingIndex)

Index.vue (handleProfileSelected)
     │
     └── Use greetingIndex: -1 = random, >=0 = specific index
```

## Implementation Steps

### Step 1: Update ProfileSelectorModal Props and Emits

**File:** `src/components/profiles/ProfileSelectorModal.vue`

Add characterId prop and update emit signature:

```typescript
// BEFORE (lines 17-20)
const emit = defineEmits<{
    selectProfile: [profile: UserProfile]
}>();

// AFTER
interface Props {
  characterId?: string;  // Optional - only needed if character has alternate greetings
}
const props = defineProps<Props>();

const emit = defineEmits<{
    selectProfile: [profile: UserProfile, greetingIndex: number]
}>();
```

### Step 2: Add Imports and State

**File:** `src/components/profiles/ProfileSelectorModal.vue`

```typescript
// Add imports at top
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { ref, computed, watch } from 'vue';
import { db, CharacterCard } from '@/db';

// Add state after existing code
const selectedGreetingIndex = ref<number>(-1);  // -1 = Random

// Compute character and greetings
const character = computed(() => {
  if (!props.characterId) return null;
  return db.CharacterCards.findOne({ id: props.characterId }) as CharacterCard | null;
});

const alternateGreetings = computed(() => {
  if (!character.value) return [];
  const greetings = character.value.data?.alternateGreetings;
  return Array.isArray(greetings) ? greetings : [];
});

const hasAlternateGreetings = computed(() => alternateGreetings.value.length > 0);

// Truncate helper
const truncateText = (text: string, maxLen: number = 50): string => {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
};

// Dropdown options
const greetingOptions = computed(() => {
  const options = [{ label: 'Random', value: -1 }];
  alternateGreetings.value.forEach((greeting, index) => {
    options.push({
      label: `#${index + 1}: ${truncateText(greeting, 50)}`,
      value: index
    });
  });
  return options;
});

// Preview text
const selectedGreetingPreview = computed(() => {
  if (selectedGreetingIndex.value === -1) {
    return '(Random greeting will be selected from available options)';
  }
  return alternateGreetings.value[selectedGreetingIndex.value] || '';
});

// Reset selection when modal opens
watch(() => props.characterId, () => {
  selectedGreetingIndex.value = -1;
});
```

### Step 3: Update selectProfile Function

**File:** `src/components/profiles/ProfileSelectorModal.vue`

```typescript
// BEFORE (lines 22-25)
function selectProfile(profile: UserProfile) {
    emit('selectProfile', profile);
    modalStore.closeModal();
}

// AFTER
function selectProfile(profile: UserProfile) {
    emit('selectProfile', profile, selectedGreetingIndex.value);
    modalStore.closeModal();
}
```

### Step 4: Add Greeting Selector UI

**File:** `src/components/profiles/ProfileSelectorModal.vue`

Add after the profiles grid (before template #footer):

```vue
<!-- Add after </div> of profiles grid, before <template #footer> -->

<!-- Greeting Selector - Only show if character has alternate greetings -->
<div v-if="hasAlternateGreetings" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
  <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Select Greeting
  </h4>
  <Select
    v-model="selectedGreetingIndex"
    :options="greetingOptions"
    optionLabel="label"
    optionValue="value"
    placeholder="Select a greeting"
    class="w-full mb-3"
  />
  <Textarea
    :modelValue="selectedGreetingPreview"
    readonly
    rows="4"
    class="w-full text-sm"
    placeholder="Greeting preview..."
  />
</div>
```

### Step 5: Update Index.vue to Pass characterId and Handle greetingIndex

**File:** `src/components/character_cards/Index.vue`
**Line:** 52 (template)

```vue
<!-- BEFORE (line 52) -->
<ProfileSelectorModal @select-profile="handleProfileSelected" />

<!-- AFTER -->
<ProfileSelectorModal
  :character-id="pendingCharacterId || undefined"
  @select-profile="handleProfileSelected"
/>
```

**File:** `src/components/character_cards/Index.vue`
**Lines:** 180-238 (handleProfileSelected)

```typescript
// BEFORE (line 180)
const handleProfileSelected = async (profile: UserProfile) => {

// AFTER
const handleProfileSelected = async (profile: UserProfile, greetingIndex: number = -1) => {
```

**Lines:** 203-206 (getting greeting)

```typescript
// BEFORE (lines 203-206)
const characterCard = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
characterCard.getData();
let firstGreeting = characterCard.getGreeting() as string;

// AFTER
const characterCard = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
characterCard.getData();
let firstGreeting: string;

if (greetingIndex === -1) {
  // Random selection (existing behavior)
  firstGreeting = characterCard.getGreeting() as string;
} else {
  // Specific greeting selected
  const greetings = characterCard.data?.alternateGreetings;
  firstGreeting = (Array.isArray(greetings) && greetings[greetingIndex])
    ? greetings[greetingIndex]
    : characterCard.getGreeting() as string;  // Fallback to random if index invalid
}
```

## Full Updated ProfileSelectorModal.vue

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { db, UserProfile, CharacterCard } from '@/db';
import { useModalStore } from '@/stores/modal';
import { MODALS } from '@/constants';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

interface Props {
  characterId?: string;
}
const props = defineProps<Props>();

const modalStore = useModalStore();

// Get all profiles
const profiles = computed(() => {
    return db.UserProfiles.find().fetch() as UserProfile[];
});

// Greeting selection state
const selectedGreetingIndex = ref<number>(-1);

// Character and greetings
const character = computed(() => {
  if (!props.characterId) return null;
  return db.CharacterCards.findOne({ id: props.characterId }) as CharacterCard | null;
});

const alternateGreetings = computed(() => {
  if (!character.value) return [];
  const greetings = character.value.data?.alternateGreetings;
  return Array.isArray(greetings) ? greetings : [];
});

const hasAlternateGreetings = computed(() => alternateGreetings.value.length > 0);

const truncateText = (text: string, maxLen: number = 50): string => {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
};

const greetingOptions = computed(() => {
  const options = [{ label: 'Random', value: -1 }];
  alternateGreetings.value.forEach((greeting, index) => {
    options.push({
      label: `#${index + 1}: ${truncateText(greeting, 50)}`,
      value: index
    });
  });
  return options;
});

const selectedGreetingPreview = computed(() => {
  if (selectedGreetingIndex.value === -1) {
    return '(Random greeting will be selected from available options)';
  }
  return alternateGreetings.value[selectedGreetingIndex.value] || '';
});

// Reset selection when characterId changes
watch(() => props.characterId, () => {
  selectedGreetingIndex.value = -1;
});

// Emit with greeting index
const emit = defineEmits<{
    selectProfile: [profile: UserProfile, greetingIndex: number]
}>();

function selectProfile(profile: UserProfile) {
    emit('selectProfile', profile, selectedGreetingIndex.value);
    modalStore.closeModal();
}

function closeModal() {
    modalStore.closeModal();
}
</script>

<template>
    <Dialog :visible="modalStore.isModalOpen(MODALS.PROFILE_SELECTOR)"
        @update:visible="(value) => { if (!value) closeModal() }" @hide="closeModal" modal header="Chon Profile"
        :style="{ width: '60vw' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }" :closable="false">
        <div class="p-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Chon profile de thay the {<!-- -->{ user }} trong character card
            </p>

            <!-- Empty State -->
            <div v-if="profiles.length === 0" class="text-center py-8">
                <div class="text-gray-400 mb-4">
                    <i class="pi pi-user" style="font-size: 2rem"></i>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Ban chua co profile nao. Hay tao profile truoc!
                </p>
                <Button @click="closeModal" label="Dong" severity="secondary" />
            </div>

            <!-- Profiles Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                <Card v-for="profile in profiles" :key="profile.id"
                    class="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-500"
                    @click="selectProfile(profile)">
                    <template #header>
                        <div class="p-4 bg-gradient-to-r from-purple-500 to-pink-500">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <i class="pi pi-user text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <h3 class="font-bold text-white">{{ profile.name }}</h3>
                                </div>
                                <i class="pi pi-chevron-right text-white"></i>
                            </div>
                        </div>
                    </template>

                    <template #content>
                        <div class="space-y-2 text-sm">
                            <p v-if="profile.appearance" class="text-gray-700 dark:text-gray-300 line-clamp-2">
                                {{ profile.appearance }}
                            </p>
                            <p v-if="profile.personality" class="text-gray-600 dark:text-gray-400 text-xs line-clamp-1">
                                {{ profile.personality }}
                            </p>
                        </div>
                    </template>
                </Card>
            </div>

            <!-- Greeting Selector -->
            <div v-if="hasAlternateGreetings" class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Greeting
              </h4>
              <Select
                v-model="selectedGreetingIndex"
                :options="greetingOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select a greeting"
                class="w-full mb-3"
              />
              <Textarea
                :modelValue="selectedGreetingPreview"
                readonly
                rows="4"
                class="w-full text-sm"
                placeholder="Greeting preview..."
              />
            </div>
        </div>

        <template #footer>
            <div class="flex justify-end">
                <Button @click="closeModal" label="Huy" severity="secondary" outlined />
            </div>
        </template>
    </Dialog>
</template>

<style scoped>
.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
```

## Todo Checklist

- [ ] Add Props interface with characterId
- [ ] Update emit signature to include greetingIndex
- [ ] Add Select and Textarea imports
- [ ] Add greeting selection state and computed
- [ ] Add truncateText helper
- [ ] Add greetingOptions computed
- [ ] Add selectedGreetingPreview computed
- [ ] Add watch to reset on characterId change
- [ ] Update selectProfile to emit greetingIndex
- [ ] Add greeting selector UI in template
- [ ] Update Index.vue to pass characterId prop
- [ ] Update handleProfileSelected to accept greetingIndex
- [ ] Update greeting logic to use specific index
- [ ] Test: modal shows selector when alternate_greetings exist
- [ ] Test: "Random" option uses existing behavior
- [ ] Test: specific selection shows in preview
- [ ] Test: correct greeting used in dialogue

## Success Criteria

- [ ] Dropdown only visible if alternate_greetings.length > 0
- [ ] Options show "Random" + truncated greetings
- [ ] Preview textarea shows full selected greeting
- [ ] "Random" selection (-1) uses CharacterCard.getGreeting()
- [ ] Specific index uses alternateGreetings[index]
- [ ] No TypeScript errors

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| No greetings | Low | None | Selector hidden when empty |
| Invalid index | Low | Low | Fallback to getGreeting() |
| Emit signature change | Med | Low | Default param greetingIndex = -1 |

## Security Considerations

- Greeting content from local storage only
- No user input validation needed (read-only preview)
- Index bounds checked before access
