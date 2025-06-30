import { Collection } from "@signaldb/core";
import createIndexedDBAdapter from "@signaldb/indexeddb";
import vueReactivityAdapter from "@signaldb/vue";
import createMonkeyAdapter from "./monkey";
import { CharacterCardData } from "@/types/character";
import { mergeObjects } from "@/utils/common";

export type LLMModel = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  llmProvider: string;
  isDefault: boolean;
  createdAt: number;
};

export type CharacterCardType = {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  createdAt: number;
};

export type StorageType = {
  id: string;
  file: File;
  type: "image" | "audio";
};

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

if (UserProfiles.find().count() === 0) {
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
}

export const db = {
  CharacterCards,
  LLMModels,
  Storage,
  DialogueMessages,
  Dialogues,
  UserProfiles,
};
