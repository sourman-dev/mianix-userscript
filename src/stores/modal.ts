import { defineStore } from 'pinia'
import { MODALS } from '@/constants'

export const useModalStore = defineStore('modal', {
  state: () => ({
    currentModal: '',
    modalData: null as any
  }),
  
  getters: {
    isModalOpen: (state) => {
      return (modalName: string): boolean => {
        console.log('currentModal', state.currentModal)
        if(!state.currentModal) {
          return false
        }
        if(modalName) {
          return modalName === state.currentModal
        }
        return Object.values(MODALS).includes(state.currentModal)
      }
    }
  },
  
  actions: {
    openModal(modal: string, data: any = null) {
      this.currentModal = modal
      this.modalData = data
    },
    
    closeModal() {
      this.currentModal = ''
      this.modalData = null
    },
  }
})