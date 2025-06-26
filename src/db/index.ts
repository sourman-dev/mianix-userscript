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

export const db = {
  CharacterCards,
  LLMModels,
  Storage,
};
