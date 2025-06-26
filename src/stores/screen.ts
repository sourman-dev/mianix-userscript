import { defineStore } from 'pinia'
import { SCREENS } from '@/constants'
import CharacterList from '@/components/character_cards/Index.vue'
import CharacterTranslate from '@/components/character_cards/Translate.vue'
import ChatScreen from '@/components/chat_screen/ChatScreen.vue'
import LlmModelsList from '@/components/llm_models/Index.vue'
import PresetConfig from '@/components/PresetConfig.vue'

export const useScreenStore = defineStore('screen', {
  state: () => ({
    currentScreen: localStorage.getItem('currentScreen') || SCREENS.CHARACTER_LIST,
    screenPayload: null as any,
  }),
  
  actions: {
    setScreen(screen: string, payload: any = null) {
      this.currentScreen = screen
      this.screenPayload = payload
    }
  },
  getters: {
    currentComponent: (state) => {
      switch (state.currentScreen) {
        case SCREENS.CHARACTER_LIST:
          return CharacterList;
        case SCREENS.CHARACTER_TRANSLATE:
          return CharacterTranslate;
        case SCREENS.CHAT:
          return ChatScreen;
        case SCREENS.MODELS_LIST:
          return LlmModelsList;
        case SCREENS.PRESETS_CONFIG:
          return PresetConfig;
        default:
          return CharacterList;
      }
    }
  },
  persist: true
})