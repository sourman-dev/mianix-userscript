import { Collection } from "@signaldb/core";
import createIndexedDBAdapter from "@signaldb/indexeddb";
import vueReactivityAdapter from "@signaldb/vue";
import createMonkeyAdapter from "./monkey";
import { CharacterCardData, GlobalWorldbookType } from "@/types/character";
import { mergeObjects } from "@/utils/common";

export type ModelType = 'chat' | 'embedding' | 'extraction';

export type LLMModel = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  llmProvider: string;
  isDefault: boolean;
  modelType: ModelType; // 🆕 Phân loại model: chat, extraction, embedding
  createdAt: number;
};

export type CharacterCardType = {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  isNSFW?: boolean; // Hide NSFW character avatar with APP_LOGO
  createdAt: number;
  linkedGlobalWorldbooks?: string[]; // IDs of global worldbooks to include
};

export type StorageType = {
  id: string;
  file: File;
  type: "image" | "audio";
};

export enum MemoryType {
  FACT = "fact",
  EVENT = "event",
  PREFERENCE = "preference",
  RELATIONSHIP = "relationship",
}

export type MemoryEntryType = {
  id: string;
  characterId: string; // Để phân biệt ký ức của nhân vật nào
  content: string;     // Nội dung ký ức (text)
  type: MemoryType;
  tags: string[];
  importance: number;  // 0-1
  embedding: number[]; // Vector embedding (mảng số float)
  relatedMessageId?: string; // ID của message tạo ra memory này (để xóa khi replay)
  createdAt: number;
  lastAccessed: number;
};

// 2. Class Wrapper
export class MemoryEntry {
  id: string;
  characterId: string;
  content: string;
  type: MemoryType;
  tags: string[];
  importance: number;
  embedding: number[];
  createdAt: number;
  lastAccessed: number;

  constructor(data: MemoryEntryType) {
    this.id = data.id;
    this.characterId = data.characterId;
    this.content = data.content;
    this.type = data.type;
    this.tags = data.tags || [];
    this.importance = data.importance || 0.5;
    this.embedding = data.embedding || [];
    this.createdAt = data.createdAt;
    this.lastAccessed = data.lastAccessed;
  }
}

// 3. Khởi tạo Collection
const Memories = new Collection<MemoryEntryType>({
  name: "Memories",
  reactivity: vueReactivityAdapter,
  persistence: createIndexedDBAdapter("Memories"), // Nên dùng IndexedDB vì Vector khá nặng
  primaryKeyGenerator: () => crypto.randomUUID(),
  transform: (item) => new MemoryEntry(item),
});

export class CharacterCard {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  isNSFW?: boolean;
  createdAt: number;
  constructor(data: any) {
    this.id = data.id;
    this.data = data.data;
    this.dataTranslated = data.dataTranslated || {};
    this.isUseTranslated = data.isUseTranslated || false;
    this.isNSFW = data.isNSFW || false;
    this.createdAt = data.createdAt || Date.now();
    // Storage.insert({ id: this.id, file: data.imageFile, type: "image" });
  }

  

  getData() {
    if (this.isUseTranslated) {
      this.data = mergeObjects(this.data, this.dataTranslated || {});
    }
  }
  getGreeting(): string {
    if (
      this.data.alternateGreetings &&
      this.data.alternateGreetings.length > 0
    ) {
      const randomIndex = Math.floor(
        Math.random() * this.data.alternateGreetings.length
      );
      return this.data.alternateGreetings[randomIndex];
    }
    return this.data.firstMessage ?? "";
  }
  public getImageFile(): File | undefined {
    return Storage.findOne({
      type: "image",
      id: this.id,
    })?.file;
  }
}

export interface ParsedResponse {
  regexResult?: string;
  nextPrompts?: string[];
  compressedContent?: string;
}

export type DialogueMessageType = {
  parsedContent?: ParsedResponse;
  id: string;
  dialogueId: string;
  parentId: string | null;
  userInput: string;
  assistantResponse: string;
  status?: "pending" | "completed" | "failed"; // <-- THÊM FIELD MỚI
  createdAt: number;
};
export type DialogType = {
  id: string;
  createdAt: number;
  currentNodeId: string; // <-- THÊM VÀO: ID của node hiện tại trong cây
  profileId?: string; // ID của user profile được chọn cho dialogue này
  llmOptions: LLMOptions;
};
export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  contextWindow?: number;
  top_p?: number;
  responseLength?: number;
}

export type UserProfileType = {
  id: string;
  name: string; // Tên hiển thị, sẽ thay thế {{user}}

  // Các thuộc tính mô tả để đưa vào prompt
  appearance?: string; // "Một người đàn ông cao lớn với mái tóc đen và đôi mắt nâu."
  personality?: string; // "Tính cách trầm lặng, hay quan sát, nhưng rất quyết đoán."
  background?: string; // "Là một cựu binh, đang tìm kiếm sự bình yên ở thành phố này."

  // Các thuộc tính trạng thái động
  currentStatus?: string; // "Đang cảm thấy mệt mỏi sau một ngày dài."
  inventory?: string[]; // ["Một chiếc chìa khóa cũ", "Bức ảnh mờ"]
  createdAt: number;
};

export class DialogueMessage {
  parsedContent?: ParsedResponse;
  id: string;
  dialogueId: string;
  parentId: string | null;
  userInput: string;
  assistantResponse: string;
  status?: "pending" | "completed" | "failed"; // <-- THÊM PROPERTY
  createdAt: number;

  constructor(data: DialogueMessageType) {
    this.parsedContent = data.parsedContent;
    this.id = data.id;
    this.dialogueId = data.dialogueId;
    this.parentId = data.parentId;
    this.userInput = data.userInput;
    this.assistantResponse = data.assistantResponse;
    this.status = data.status || "pending"; // <-- THÊM VÀO CONSTRUCTOR
    this.createdAt = data.createdAt;
  }
}

export class Dialogue {
  id: string;
  createdAt: number;
  currentNodeId: string; // <-- THÊM VÀO: ID của node hiện tại trong cây
  llmOptions: LLMOptions;
  constructor(data: DialogType) {
    this.id = data.id;
    this.createdAt = data.createdAt;
    // this.messages = data.messages || [];
    this.llmOptions = data.llmOptions;
    this.currentNodeId = data.currentNodeId || "root";
  }
}

export class UserProfile {
  id: string;
  name: string;
  appearance?: string;
  personality?: string;
  background?: string;
  currentStatus?: string;
  inventory?: string[];
  createdAt: number;
  constructor(data: UserProfileType) {
    this.id = data.id;
    this.name = data.name;
    this.appearance = data.appearance;
    this.personality = data.personality;
    this.background = data.background;
    this.currentStatus = data.currentStatus;
    this.inventory = data.inventory;
    this.createdAt = data.createdAt;
  }
}

const UserProfiles = new Collection<UserProfileType>({
  name: "User_Profiles",
  reactivity: vueReactivityAdapter,
  persistence: createMonkeyAdapter("User_Profiles"),
  primaryKeyGenerator: () => crypto.randomUUID(),
  transform: (item) => new UserProfile(item),
});

const DialogueMessages = new Collection<DialogueMessageType>({
  name: "Dialogue_Messages",
  reactivity: vueReactivityAdapter,
  persistence: createIndexedDBAdapter("Dialogue_Messages"),
  primaryKeyGenerator: () => crypto.randomUUID(),
  transform: (item) => new DialogueMessage(item),
});

const Dialogues = new Collection<DialogType>({
  name: "Dialogues",
  reactivity: vueReactivityAdapter,
  persistence: createIndexedDBAdapter("Dialogues"),
  // primaryKeyGenerator: () => crypto.randomUUID(),
  transform: (item) => new Dialogue(item),
});

const Storage = new Collection<StorageType>({
  name: "Storage",
  reactivity: vueReactivityAdapter,
  persistence: createIndexedDBAdapter("Storage"),
  // primaryKeyGenerator: () => crypto.randomUUID(),
});
const CharacterCards = new Collection<CharacterCardType>({
  reactivity: vueReactivityAdapter,
  persistence: createMonkeyAdapter("Character_Cards"),
  primaryKeyGenerator: () => crypto.randomUUID(),
  transform: (item) => new CharacterCard(item),
});
const LLMModels = new Collection<LLMModel>({
  name: "LLM_Models",
  reactivity: vueReactivityAdapter,
  persistence: createMonkeyAdapter("LLM_Models"),
  primaryKeyGenerator: () => crypto.randomUUID(),
});

const GlobalWorldbooks = new Collection<GlobalWorldbookType>({
  name: "Global_Worldbooks",
  reactivity: vueReactivityAdapter,
  persistence: createMonkeyAdapter("Global_Worldbooks"),
  primaryKeyGenerator: () => crypto.randomUUID(),
});

// Initialize default profile for first-time users
// IMPORTANT: Wrap in setTimeout to wait for minimongo to load from storage
setTimeout(() => {
  const existingProfiles = UserProfiles.find().fetch();
  if (existingProfiles.length === 0) {
    console.log('📝 Creating default profile (first time)');
    UserProfiles.insert({
      id: crypto.randomUUID(),
      name: "Roger",
      appearance: "Một người đàn ông cao lớn với mái tóc đen và đôi mắt nâu.",
      personality: "Tính cách trầm lặng, hay quan sát, nhưng rất quyết đoán.",
      background: "Là một cựu binh, đang tìm kiếm sự bình yên ở thành phố này.",
      currentStatus: "Đang cảm thấy mệt mỏi sau một ngày dài.",
      inventory: ["Một chiếc chìa khóa cũ", "Bức ảnh mờ"],
      createdAt: Date.now(),
    });
  } else {
    console.log(`✅ Found ${existingProfiles.length} existing profiles, skipping default creation`);
  }
}, 100); // Wait 100ms for storage to load

export const db = {
  CharacterCards,
  LLMModels,
  Storage,
  DialogueMessages,
  Dialogues,
  UserProfiles,
  Memories,
  GlobalWorldbooks,
};
