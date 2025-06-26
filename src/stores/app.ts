import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    isDarkMode: false,
  }),
  getters: {
    getIsDarkMode: (state) => state.isDarkMode,
  },
  actions: {
    setIsDarkMode(isDarkMode: boolean) {
      this.isDarkMode = isDarkMode;
    },
  },
});