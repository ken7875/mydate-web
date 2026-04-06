<template>
  <div class="fixed inset-0 z-[1000] flex flex-col bg-black">
    <div class="flex-1 overflow-hidden relative">
      <ClientOnly>
        <img ref="imageRef" :src="imageSrc" class="max-w-full" alt="裁切預覽" />
      </ClientOnly>
    </div>
    <div class="flex gap-3 p-4 bg-black">
      <BaseButton class="button button__outline-primary flex-1" @click="handleCancel">取消</BaseButton>
      <BaseButton class="button button__primary flex-1" @click="handleConfirm">確認裁切</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT, COMPRESSION_QUALITY } from './constants';

interface Props {
  imageSrc: string;
}

defineProps<Props>();

const emit = defineEmits<{
  confirm: [croppedFile: File];
  cancel: [];
}>();

const imageRef = ref<HTMLImageElement | null>(null);
let cropperInstance: Cropper | null = null;

onMounted(() => {
  if (!imageRef.value) return;

  cropperInstance = new Cropper(imageRef.value, {
    aspectRatio: 2 / 3,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 1,
    responsive: true,
    restore: false,
    guides: false,
    center: false,
    highlight: false,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false
  });
});

onBeforeUnmount(() => {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
});

const handleConfirm = () => {
  if (!cropperInstance) return;

  const canvas = cropperInstance.getCroppedCanvas({
    width: OUTPUT_WIDTH,
    height: OUTPUT_HEIGHT,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  });

  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      emit('confirm', croppedFile);
    },
    'image/jpeg',
    COMPRESSION_QUALITY
  );
};

const handleCancel = () => {
  emit('cancel');
};
</script>
