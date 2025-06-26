<template>
  <Button
    :label="label"
    :icon="icon"
    :variant="variant"
    severity="success"
    @click="handleClick"
  />
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Button from 'primevue/button';

const emit = defineEmits(['click']);

const defaultState = {
  label: 'Save',
  icon: 'pi pi-save',
  variant: 'outlined' as const,
};

const successState = {
  label: 'Saved!',
  icon: 'pi pi-check',
  variant: undefined,
};

const label = ref(defaultState.label);
const icon = ref(defaultState.icon);
const variant = ref<string | undefined>(defaultState.variant);
let timeoutId: number | undefined;

const showSuccess = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  label.value = successState.label;
  icon.value = successState.icon;
  variant.value = successState.variant;

  timeoutId = window.setTimeout(() => {
    label.value = defaultState.label;
    icon.value = defaultState.icon;
    variant.value = defaultState.variant;
    timeoutId = undefined;
  }, 2000);
};

const handleClick = (event: MouseEvent) => {
  emit('click', event);
};

defineExpose({
  showSuccess,
});
</script>