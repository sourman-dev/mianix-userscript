# Phase 01: NSFW Toggle Implementation

**Parent Plan:** [plan.md](./plan.md)
**Date:** 2025-12-09
**Priority:** P0
**Status:** Pending
**Dependencies:** None

## Overview

Add NSFW toggle to Translate.vue that masks character avatar with APP_LOGO when enabled.

## Key Insights from Codebase

1. **CharacterCardType** (db/index.ts:22-29) - Has `isUseTranslated: boolean`, similar pattern for `isNSFW`
2. **CharacterAvatar.vue** (line 31) - Already imports APP_LOGO, uses it as fallback
3. **Translate.vue** (line 19) - Existing ToggleSwitch pattern for `isUseTranslated`
4. **LLM calls** (lines 162-179) - Uses `sendOpenAiRequestStream()` with OpenAI-compatible API - VERIFIED CORRECT

## Requirements

- [x] Verify LLM proxy/API usage (CONFIRMED: uses sendOpenAiRequestStream)
- [ ] Add `isNSFW?: boolean` to CharacterCardType
- [ ] Add ToggleSwitch below "Use Translated Data" toggle
- [ ] Save isNSFW when saveButton1 clicked
- [ ] CharacterAvatar shows APP_LOGO when isNSFW=true

## Architecture

```
Translate.vue                    CharacterAvatar.vue
     │                                  │
[ToggleSwitch isNSFW]           [props: src, isNSFW]
     │                                  │
handleGeneralInfoSave() ──────> isNSFW ? APP_LOGO : imageUrl
     │
db.CharacterCards.updateOne({ isNSFW })
```

## Implementation Steps

### Step 1: Update CharacterCardType Schema

**File:** `src/db/index.ts`
**Lines:** 22-29

```typescript
// BEFORE (line 22-29)
export type CharacterCardType = {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  createdAt: number;
  linkedGlobalWorldbooks?: string[];
};

// AFTER
export type CharacterCardType = {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  isNSFW?: boolean;  // NEW: mask avatar with APP_LOGO when true
  createdAt: number;
  linkedGlobalWorldbooks?: string[];
};
```

### Step 2: Update CharacterCard Class

**File:** `src/db/index.ts`
**Lines:** 91-103

```typescript
// BEFORE (line 91-104)
export class CharacterCard {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  createdAt: number;
  constructor(data: any) {
    this.id = data.id;
    this.data = data.data;
    this.dataTranslated = data.dataTranslated || {};
    this.isUseTranslated = data.isUseTranslated || false;
    this.createdAt = data.createdAt || Date.now();
  }
  // ...
}

// AFTER
export class CharacterCard {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  isNSFW: boolean;  // NEW
  createdAt: number;
  constructor(data: any) {
    this.id = data.id;
    this.data = data.data;
    this.dataTranslated = data.dataTranslated || {};
    this.isUseTranslated = data.isUseTranslated || false;
    this.isNSFW = data.isNSFW || false;  // NEW: default false
    this.createdAt = data.createdAt || Date.now();
  }
  // ...
}
```

### Step 3: Add NSFW Toggle to Translate.vue Template

**File:** `src/components/character_cards/Translate.vue`
**Lines:** 14-23 (General Info section)

```vue
<!-- BEFORE (lines 14-23) -->
<div class="flex flex-wrap items-center gap-6 p-4">
  <CharacterAvatar v-if="character.getImageFile()" :src="character.getImageFile()" :is-circle="false" class="w-32" />
  <div class="flex items-center gap-2">
    <label for="use-translated">Use Translated Data:</label>
    <ToggleSwitch id="use-translated" v-model="character.isUseTranslated" />
  </div>
  <SaveButton ref="saveButton1" @click="handleGeneralInfoSave" class="ml-auto" />
</div>

<!-- AFTER -->
<div class="flex flex-wrap items-center gap-6 p-4">
  <CharacterAvatar v-if="character.getImageFile()" :src="character.getImageFile()" :is-nsfw="character.isNSFW" :is-circle="false" class="w-32" />
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <label for="use-translated">Use Translated Data:</label>
      <ToggleSwitch id="use-translated" v-model="character.isUseTranslated" />
    </div>
    <div class="flex items-center gap-2">
      <label for="is-nsfw">Is NSFW:</label>
      <ToggleSwitch id="is-nsfw" v-model="character.isNSFW" />
    </div>
  </div>
  <SaveButton ref="saveButton1" @click="handleGeneralInfoSave" class="ml-auto" />
</div>
```

### Step 4: Update handleGeneralInfoSave in Translate.vue

**File:** `src/components/character_cards/Translate.vue`
**Lines:** 254-265

```typescript
// BEFORE (lines 254-265)
const handleGeneralInfoSave = async () => {
    const characterId = character.value.id;
    const isUseTranslated = Boolean(character.value.isUseTranslated);

    await db.CharacterCards.updateOne(
      { id: characterId },
      { $set: { isUseTranslated } }
    );

    saveButton1.value?.showSuccess();
};

// AFTER
const handleGeneralInfoSave = async () => {
    const characterId = character.value.id;
    const isUseTranslated = Boolean(character.value.isUseTranslated);
    const isNSFW = Boolean(character.value.isNSFW);

    await db.CharacterCards.updateOne(
      { id: characterId },
      { $set: { isUseTranslated, isNSFW } }
    );

    saveButton1.value?.showSuccess();
};
```

### Step 5: Update CharacterAvatar.vue for NSFW Prop

**File:** `src/components/character_cards/CharacterAvatar.vue`

```vue
<!-- BEFORE (full file) -->
<template>
  <div
    class="relative overflow-hidden"
    :class="{ 'rounded-full': isCircle }"
  >
    <img
      :src="imageUrl"
      alt="Avatar"
      class="w-full h-full object-cover"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onBeforeUnmount } from 'vue';
import { APP_LOGO } from '@/constants';
export default defineComponent({
  name: 'CharacterAvatar',
  props: {
    src: {
      type: File,
      required: false,
      default: null,
    },
    isCircle: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const imageUrl = ref<string>(APP_LOGO);

    const updateImageUrl = (file: File | null) => {
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }

      if (file instanceof File) {
        imageUrl.value = URL.createObjectURL(file);
      } else {
        imageUrl.value = APP_LOGO;
      }
    };

    watch(
      () => props.src,
      (newFile) => {
        updateImageUrl(newFile);
      },
      { immediate: true }
    );

    onBeforeUnmount(() => {
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }
    });

    return {
      imageUrl
    };
  }
});
</script>

<!-- AFTER -->
<template>
  <div
    class="relative overflow-hidden"
    :class="{ 'rounded-full': isCircle }"
  >
    <img
      :src="displayUrl"
      alt="Avatar"
      class="w-full h-full object-cover"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onBeforeUnmount, computed } from 'vue';
import { APP_LOGO } from '@/constants';
export default defineComponent({
  name: 'CharacterAvatar',
  props: {
    src: {
      type: File,
      required: false,
      default: null,
    },
    isCircle: {
      type: Boolean,
      default: false
    },
    isNsfw: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const imageUrl = ref<string>(APP_LOGO);

    const updateImageUrl = (file: File | null) => {
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }

      if (file instanceof File) {
        imageUrl.value = URL.createObjectURL(file);
      } else {
        imageUrl.value = APP_LOGO;
      }
    };

    // Computed: show APP_LOGO if NSFW, otherwise show actual image
    const displayUrl = computed(() => {
      return props.isNsfw ? APP_LOGO : imageUrl.value;
    });

    watch(
      () => props.src,
      (newFile) => {
        updateImageUrl(newFile);
      },
      { immediate: true }
    );

    onBeforeUnmount(() => {
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }
    });

    return {
      displayUrl
    };
  }
});
</script>
```

### Step 6: Update Index.vue CharacterAvatar Usage

**File:** `src/components/character_cards/Index.vue`
**Line:** 22

```vue
<!-- BEFORE (line 22) -->
<CharacterAvatar :src="characterCard.getImageFile()" class="w-full" />

<!-- AFTER -->
<CharacterAvatar :src="characterCard.getImageFile()" :is-nsfw="characterCard.isNSFW" class="w-full" />
```

## Todo Checklist

- [ ] Update CharacterCardType in db/index.ts
- [ ] Update CharacterCard class constructor
- [ ] Add NSFW ToggleSwitch to Translate.vue template
- [ ] Update handleGeneralInfoSave to persist isNSFW
- [ ] Add isNsfw prop to CharacterAvatar.vue
- [ ] Add computed displayUrl in CharacterAvatar
- [ ] Update Index.vue to pass isNSFW prop
- [ ] Test: toggle NSFW, save, verify avatar shows APP_LOGO
- [ ] Test: build succeeds with no TS errors

## Success Criteria

- [ ] NSFW toggle appears below "Use Translated Data"
- [ ] Clicking Save persists isNSFW to database
- [ ] Avatar shows APP_LOGO when isNSFW=true in Translate.vue
- [ ] Avatar shows APP_LOGO when isNSFW=true in Index.vue (character list)
- [ ] No TypeScript errors

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema migration | Low | Low | isNSFW defaults to false |
| Existing cards | None | None | Optional field with default |
| Avatar flicker | Low | Low | computed property ensures reactivity |

## Security Considerations

- NSFW flag stored locally in IndexedDB only
- No transmission to external services
- Default false = safe by default
