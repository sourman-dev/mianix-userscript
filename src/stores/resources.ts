import { getLLMProviders, getPresetResouce } from '@/utils/common';
import { defineStore } from 'pinia';

export interface LLMProviderNameBaseUrl {
  name: string;
  baseUrl: string;
  models: string[];
}


// export interface LLMProviderRemote extends LLMProviderNameBaseUrl {
//     modelName: string;
//     apiKey: string;
// }

export const useResourcesStore = defineStore('resources', {
  state: () => ({
    llmProviders: [],
    translatePrompt: '',
    multiModePrompt: '',
    multiModeChainOfThoughtPrompt: '',
    compressorPrompt: '',
    statusPrompt: '',
    outputStructureSoftGuidePrompt: '',
    outputFormatPrompt: '',
    extractorCharacterPrompt: '',
  }),
  getters: {
    llmProviders_NameAndBaseUrl: (state): LLMProviderNameBaseUrl[] => {
      return (state.llmProviders as any[]).map((provider) => ({
        name: provider.name,
        baseUrl: provider.baseUrl,
        models: provider.models.map((model: any) => model.name),
      })) as LLMProviderNameBaseUrl[];
    },
  },
  actions: {
    async fetchResources() {
      const llmProviders = await getLLMProviders();
      this.llmProviders = llmProviders.providers;
      this.translatePrompt = await getPresetResouce('TRANSLATE_PROMPT.txt', 'text', true);
      this.multiModePrompt = await getPresetResouce('MULTI_MODE_PROMPT.txt', 'text', true);
      this.multiModeChainOfThoughtPrompt = await getPresetResouce('MULTI_MODE_CHAIN_OF_THOUGHT_PROMPT.txt', 'text', true);
      this.compressorPrompt = await getPresetResouce('COMPRESSOR_PROMPT.txt', 'text', true);
      this.statusPrompt = await getPresetResouce('STATUS_PROMPT.txt', 'text', true);
      this.outputStructureSoftGuidePrompt = await getPresetResouce('OUTPUT_STRUCTURE_SOFT_GUIDE_PROMPT.txt', 'text', true);
      this.outputFormatPrompt = await getPresetResouce('OUTPUT_FORMAT_PROMPT.txt', 'text', true);
      this.extractorCharacterPrompt = await getPresetResouce('EXTRACTOR_CHARACTER_PROMPT.txt', 'text', true);
    },
  },
});