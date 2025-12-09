<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Characters
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Manage your roleplay characters
        </p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-file-arrow-up" @click="useModal.openModal(MODALS.CHARACTER_IMPORT)" severity="info"
          size="small" label="Import Character" />
      </div>
    </div>
    <!--Body-->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card v-for="characterCard in characterCards" :key="characterCard.id" class="w-full">
        <template #header>
          <CharacterAvatar :src="characterCard.getImageFile()" :is-nsfw="characterCard.isNSFW" class="w-full" />
        </template>
        <template #title>
          {{ (characterCard.data as any)?.name || 'Unknown' }}
        </template>
        <template #subtitle>
          <div class="flex items-center gap-1 text-yellow-500">
            <i class="pi pi-sparkles"></i>
            <span>{{ textTruncate((characterCard.data as any)?.personality || (characterCard.data as any)?.firstMes ||
              characterCard.getGreeting() || '', 100, true) }}</span>
          </div>
        </template>
        <template #footer>
          <div class="flex gap-3 mt-1 justify-end">
            <Button icon="pi pi-comment" severity="secondary" outlined rounded aria-label="Chat"
              @click="handleToChat(characterCard.id)" />
            <Button icon="pi pi-language" severity="secondary" outlined rounded
              @click="handleCharacterEdit(characterCard.id)" aria-label="Edit" />
            <Button icon="pi pi-book" severity="info" outlined rounded
              @click="handleWorldbookEdit(characterCard.id)" aria-label="Worldbook" />
            <Button icon="pi pi-arrow-circle-down" severity="success" rounded
              @click="handleCharacterExport(characterCard.id)" aria-label="Export" />
            <Button icon="pi pi-trash" severity="danger" rounded @click="handleDelete(characterCard)"
              aria-label="Delete" />
          </div>
        </template>
      </Card>
    </div>

    <CharacterImport @character-imported="handleCharacterImported" />
    <ProfileSelectorModal :character-id="pendingCharacterId || undefined" @select-profile="handleProfileSelected" />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { useScreenStore } from '@/stores/screen';
import { useModalStore } from '@/stores/modal';
import { MODALS, SCREENS } from '@/constants';
import CharacterImport from '@/components/character_cards/ModalImport.vue';
import ProfileSelectorModal from '@/components/profiles/ProfileSelectorModal.vue';
import CharacterAvatar from '@/components/character_cards/CharacterAvatar.vue';
import Card from 'primevue/card';
import { ref, watchEffect } from 'vue';
import { textTruncate } from '@/utils/common';
import { writeCharacterToPng } from '@/utils/character-parser';
import { useDeleteConfirm } from '@/composables/useDeleteConfirm'
import { Character } from '@/newDb/Character';
import { db, CharacterCard, Dialogue, UserProfile } from '@/db';
import { useDialogueStore } from '@/stores/dialogue';
import dayjs from 'dayjs';
import { adaptText } from '@/utils/msg-process';
import { deleteMemoriesForCharacter } from '@/utils/memory-cleanup'; // 🗑️ Memory cleanup
const useScreen = useScreenStore();
const useModal = useModalStore();
const dialogueStore = useDialogueStore();

const { confirmDelete } = useDeleteConfirm();

const characterCards = ref<CharacterCard[]>([]);

async function handleDelete(card: CharacterCard) {
  confirmDelete(card, {
    message: `Bạn có chắc chắn muốn xóa nhân vật "${(card.data as any)?.name}"?`,
    header: 'Xóa nhân vật',
    onConfirm: async () => {
      // 🗑️ Xóa memories trước (giải phóng bộ nhớ)
      const deletedMemories = deleteMemoriesForCharacter(card.id);
      console.log(`🗑️ Deleted ${deletedMemories} memories for character ${card.id}`);

      // Xóa character data
      db.CharacterCards.removeOne({ id: card.id });
      db.Storage.removeOne({ id: card.id });
      db.Dialogues.removeOne({ id: card.id });
      db.DialogueMessages.removeMany({ dialogueId: card.id });
    }
  })
}

// Xử lý dữ liệu nhân vật khi nhận được từ component ModalImport
const handleCharacterImported = async (parsedData: any, imageFile: File) => {
  const newData = new Character(parsedData)
  const id = db.CharacterCards.insert({
    data: newData.data,
    isUseTranslated: false,
    createdAt: Date.now()
  })
  // console.log(id)
  db.Storage.insert({ id: id, file: imageFile, type: 'image' });
};

const handleCharacterEdit = (id: string) => {
  useScreen.setScreen(SCREENS.CHARACTER_TRANSLATE, { id })
}

const handleWorldbookEdit = (id: string) => {
  useScreen.setScreen(SCREENS.WORLDBOOK_EDITOR, { characterId: id })
}

const handleCharacterExport = async (id: string) => {
  const character = db.CharacterCards.findOne({ id }) as CharacterCard;
  if (character) {
    character.getData();
    const data = character.data as any;
    // console.log('export data: ', data);
    const orginalImage = character.getImageFile();
    let jsonString = JSON.stringify(data, null, 2);
    const keysNeedReplace = [
      {
        find: 'firstMessage',
        replace: 'first_mes',
      }, {
        find: 'alternateGreetings',
        replace: 'alternate_greetings',
      }, {
        find: 'messageExamples',
        replace: 'mes_example',
      }, {
        find: 'creatorNotes',
        replace: 'creator_notes',
      }, {
        find: 'worldBook',
        replace: 'character_book',
      }
    ]
    keysNeedReplace.forEach((item) => {
      jsonString = jsonString.replace(new RegExp(item.find, 'g'), item.replace);
    })
    const newImageBlob = await writeCharacterToPng(orginalImage as File, jsonString);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(newImageBlob);
    const backupAt = dayjs().format('DD-MM-YYYY HH:mm:ss').toString();
    a.download = `${data.name}-${character.isUseTranslated ? 'translated' : 'original'}-backup-${backupAt}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

const pendingCharacterId = ref<string | null>(null);

const handleToChat = (characterId: string) => {
  // 1. Kiểm tra xem cuộc hội thoại (Dialogue) đã tồn tại chưa
  const existingDialogue = db.Dialogues.findOne({ id: characterId }) as Dialogue | null;

  if (existingDialogue) {
    // Dialogue đã tồn tại, load và chuyển đến chat
    console.log(`Found existing dialogue for character ${characterId}`);
    dialogueStore.loadDialogue(characterId);
    useScreen.setScreen(SCREENS.CHAT, { id: characterId });
  } else {
    // Chưa có dialogue, cần chọn profile trước
    console.log(`No dialogue found for character ${characterId}. Need to select profile.`);
    pendingCharacterId.value = characterId;
    useModal.openModal(MODALS.PROFILE_SELECTOR);
  }
}

// Handle khi user chọn profile từ ProfileSelectorModal
const handleProfileSelected = async (profile: UserProfile, greetingIndex: number = -1) => {
  if (!pendingCharacterId.value) return;

  const characterId = pendingCharacterId.value;
  console.log(`Creating dialogue for character ${characterId} with profile ${profile.name}, greetingIndex: ${greetingIndex}`);

  // Tạo first greeting message ID trước
  const firstMessageId = crypto.randomUUID();

  // Tạo dialogue mới với profileId và currentNodeId trỏ đến first message
  db.Dialogues.insert({
    id: characterId,
    createdAt: Date.now(),
    currentNodeId: firstMessageId, // ← Trỏ đến first message
    profileId: profile.id,
    llmOptions: {
      temperature: 0.7,
      maxTokens: 1000,
      contextWindow: 4000,
    }
  });

  // Tạo first greeting message
  const characterCard = db.CharacterCards.findOne({ id: characterId }) as CharacterCard;
  characterCard.getData();

  // Get greeting based on greetingIndex
  let firstGreeting: string;
  if (greetingIndex === -1) {
    // Random greeting (default behavior)
    firstGreeting = characterCard.getGreeting() as string;
  } else {
    // Use specific alternate greeting
    const alternateGreetings = characterCard.data?.alternateGreetings || [];
    firstGreeting = alternateGreetings[greetingIndex] || characterCard.data?.firstMessage || '';
  }

  firstGreeting = adaptText(firstGreeting);

  // Replace {{user}} with profile.name in firstGreeting
  firstGreeting = firstGreeting.replace(/\{\{user\}\}/gi, profile.name);
  firstGreeting = firstGreeting.replace(/\{user\}/gi, profile.name);

  db.DialogueMessages.insert({
    id: firstMessageId, // ← Dùng ID đã tạo
    dialogueId: characterId, // ← Dùng characterId (dialogue ID)
    parentId: 'root',
    userInput: '',
    assistantResponse: firstGreeting,
    status: 'completed',
    createdAt: Date.now(),
  });

  console.log('✅ Created dialogue and message:', {
    dialogueId: characterId,
    messageId: firstMessageId,
    profileId: profile.id,
    firstGreeting: firstGreeting.substring(0, 50) + '...'
  });

  // ⏰ Wait for insert to complete
  await new Promise(resolve => setTimeout(resolve, 50));

  // Load dialogue và chuyển đến chat
  dialogueStore.loadDialogue(characterId);
  useScreen.setScreen(SCREENS.CHAT, { id: characterId });

  // Reset pending
  pendingCharacterId.value = null;
}

watchEffect((onCleanup) => {
  const cursor = db.CharacterCards.find({}, {
    sort: { createdAt: -1 },
  })
  characterCards.value = (cursor.fetch() as CharacterCard[]).map((item) => {
    item.getData();
    return item;
  })
  // const first = characterCards.value[0] as CharacterCard;
  // console.log(first.getImageFile());
  onCleanup(() => cursor.cleanup())
})

// onMounted(async () => {
//   await loadCharacterCards();
// });
</script>