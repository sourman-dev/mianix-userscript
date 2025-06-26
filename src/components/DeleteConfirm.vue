
<template>
    <ConfirmDialog></ConfirmDialog>
    <div class="card flex flex-wrap gap-2 justify-center">
        <Button @click="handleConfirm()" label="Delete" severity="danger" outlined></Button>
    </div>
</template>

<script setup>
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();

const handleConfirm = () => {
    confirm.require({
        message: 'Do you want to delete this record?',
        header: 'Danger Zone',
        icon: 'pi pi-info-circle',
        rejectLabel: 'Cancel',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Delete',
            severity: 'danger'
        },
        accept: () => {
            emit('confirm');
        },
        reject: () => {
            emit('reject');
        }
    });
};
</script>
