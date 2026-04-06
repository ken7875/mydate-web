<template>
  <div class="relative w-full aspect-[2/3]">
    <!-- 已有照片：顯示預覽與刪除按鈕 -->
    <template v-if="previewUrl">
      <img :src="previewUrl" class="w-full h-full object-cover rounded-lg" alt="照片預覽" />
      <button
        class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white"
        type="button"
        @click.stop="emit('remove', index)"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
      <span v-if="isFirst" class="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
        主照片
      </span>
    </template>

    <!-- 無照片且可用：顯示新增按鈕 -->
    <template v-else-if="!disabled">
      <button
        class="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg text-gray-400 hover:border-primary hover:text-primary transition-colors"
        type="button"
        @click.stop="emit('add')"
      >
        <i class="fa-solid fa-plus text-xl mb-1"></i>
        <span class="text-xs">新增照片</span>
      </button>
    </template>

    <!-- 無照片且禁用：灰色鎖定狀態 -->
    <template v-else>
      <div
        class="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-200 cursor-not-allowed"
      >
        <i class="fa-solid fa-lock text-xl mb-1"></i>
        <span class="text-xs">請先上傳前一張</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  previewUrl: string | null;
  index: number;
  isFirst?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  isFirst: false,
  disabled: false
});

const emit = defineEmits<{
  remove: [index: number];
  add: [];
}>();
</script>
