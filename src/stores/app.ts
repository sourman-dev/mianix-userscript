import { db } from '@/db';
import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    isReady: false, // Add this line
    isDarkMode: false,
    currentProfile: db.UserProfiles.findOne({})
  }),
  getters: {
    getIsDarkMode: (state) => state.isDarkMode,
  },
  actions: {
    setReady(isReady: boolean) { // Add this action
      this.isReady = isReady;
    },
    setIsDarkMode(isDarkMode: boolean) {
      this.isDarkMode = isDarkMode;
    },
  },
});