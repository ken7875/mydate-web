<template>
  <div class="fixed inset-0 z-1000 flex flex-col">
    <div class="flex-1 overflow-hidden relative">
      <img ref="imageRef" :src="imageSrc" class="w-full h-full" alt="裁切預覽" />
    </div>
    <div class="flex gap-3 p-4 bg-white">
      <BaseButton class="button button__outline-primary flex-1" @click="handleCancel">取消</BaseButton>
      <BaseButton class="button button__primary flex-1" @click="handleConfirm">確認裁切</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT, COMPRESSION_QUALITY } from '../constants';

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

  // https://fengyuanchen.github.io/cropperjs/zh/api/cropper-selection.html#%E5%B1%9E%E6%80%A7
  cropperInstance = new Cropper(imageRef.value, {
    aspectRatio: 2 / 3, // 鎖定裁切框比例為 2:3（寬:高）
    viewMode: 1, // 限制裁切框不得超出圖片邊界
    dragMode: 'move', // 拖曳行為：移動圖片（而非移動裁切框）
    autoCropArea: 0.8, // 初始裁切框佔圖片 80%，留空間讓使用者縮放
    responsive: true, // 視窗縮放時自動重繪
    restore: false, // 視窗縮放後不還原上次裁切框位置
    guides: false, // 不顯示裁切框內的九宮格輔助線
    center: false, // 不顯示裁切框中心的十字準心
    highlight: false, // 不顯示裁切框外的遮罩高亮
    cropBoxMovable: true, // 裁切框可移動
    cropBoxResizable: false, // 裁切框可縮放（比例由 aspectRatio 鎖定）
    toggleDragModeOnDblclick: false // 雙擊不切換拖曳模式
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
      const croppedFile = new File([blob], 'avatar', { type: 'image/jpeg' });
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
