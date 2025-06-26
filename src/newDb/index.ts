import { CharacterCardData } from "@/types/character";
import Dexie, { type EntityTable } from "dexie";

export class CharacterCard {
  id: string;
  data: Partial<CharacterCardData>;
  dataTranslated?: Partial<CharacterCardData>;
  isUseTranslated: boolean;
  imageFile?: File;
  createdAt: number;

  constructor(
    data: Partial<CharacterCardData>,
    imageFile?: File,
    createdAt?: number
  ) {
    this.id = crypto.randomUUID();
    this.data = data;
    this.isUseTranslated = false;
    this.imageFile = imageFile;
    this.createdAt = createdAt || Date.now();
  }

  getData(): Partial<CharacterCardData> {
    if (this.isUseTranslated) {
      return Object.assign({}, this.data, this.dataTranslated);
    }
    return this.data;
  }
  public getGreeting(): string {
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
}

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

const mianixDb = new Dexie("mianix-db") as Dexie & {
  characterCards: EntityTable<
    CharacterCard,
    "id" // primary key "id" (for the typings only)
  >;
  llmModels: EntityTable<
    LLMModel,
    "id" // primary key "id" (for the typings only)
  >;
};

mianixDb.version(1).stores({
  characterCards: "id, createdAt",
  llmModels: "id, createdAt",
});

mianixDb.version(2).stores({
  characterCards: "id, createdAt",
  llmModels: "id, isDefault, createdAt",
});

mianixDb.characterCards.mapToClass(CharacterCard);

export { mianixDb };
