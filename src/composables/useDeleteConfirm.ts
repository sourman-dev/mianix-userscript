import { ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'

export function useDeleteConfirm() {
  const confirm = useConfirm()
  const selectedItem = ref(null)

  const confirmDelete = (item: any, options?: {
    message?: string
    header?: string
    onConfirm?: (item: any) => void
  }) => {
    selectedItem.value = item
    
    confirm.require({
      message: options?.message || `Bạn có chắc chắn muốn xóa "${item.name}"?`,
      header: options?.header || 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Hủy',
      acceptLabel: 'Xóa',
      rejectProps: {
        label: 'Hủy',
        severity: 'secondary',
        outlined: true
      },
      acceptProps: {
        label: 'Xóa',
        severity: 'danger'
      },
      accept: () => {
        if (options?.onConfirm) {
          options.onConfirm(selectedItem.value)
        }
      }
    })
  }

  return {
    selectedItem,
    confirmDelete
  }
}