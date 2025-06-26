import { defineStore } from 'pinia'
import { MODALS } from '@/constants'

export const useModalStore = defineStore('modal', {
  state: () => ({
    currentModal: '',
    modalData: null as any
  }),
  
  getters: {
    isModalOpen: (state) => Object.values(MODALS).includes(state.currentModal)
  },
  
  actions: {
    openModal(modal: string, data: any = null) {
      this.currentModal = modal
      this.modalData = data
    },
    
    closeModal() {
      this.currentModal = ''
      this.modalData = null
    }
  }
})