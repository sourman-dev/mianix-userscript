<template>
  <div 
    class="relative overflow-hidden"
    :class="{ 'rounded-full': isCircle }"
  >
    <img 
      :src="imageUrl" 
      alt="Avatar"
      class="w-full h-full object-cover"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onBeforeUnmount } from 'vue';
import { APP_LOGO } from '@/constants';
export default defineComponent({
  name: 'CharacterAvatar',
  props: {
    src: {
      type: File,
      required: false,
      default: null,
    },
    isCircle: {
      type: Boolean,
      default: false
    },
    isNsfw: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const imageUrl = ref<string>(APP_LOGO);

    const updateImageUrl = (file: File | null) => {
      // Revoke the old object URL if it's a blob URL
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }

      // If NSFW flag is set, always show APP_LOGO
      if (props.isNsfw) {
        imageUrl.value = APP_LOGO;
        return;
      }

      if (file instanceof File) {
        imageUrl.value = URL.createObjectURL(file);
      } else {
        imageUrl.value = APP_LOGO;
      }
    };

    watch(
      () => props.src,
      (newFile) => {
        updateImageUrl(newFile);
      },
      { immediate: true }
    );

    // Watch isNsfw prop to update image when NSFW toggle changes
    watch(
      () => props.isNsfw,
      () => {
        updateImageUrl(props.src);
      }
    );

    onBeforeUnmount(() => {
      if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl.value);
      }
    });

    return {
      imageUrl
    };
  }
});
</script>