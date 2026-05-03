<template>
  <div class="full-screen-container">
    <!-- 裁切畫面（覆蓋 Modal 內容） -->
    <AvatarCropper v-if="showCropper" :image-src="cropperSrc" @confirm="handleCropConfirm" @cancel="handleCropCancel" />

    <!-- 主要照片管理 UI -->
    <div v-else class="flex flex-col gap-4">
      <h3 class="text-lg font-bold text-center">設定大頭照</h3>
      <p class="text-sm text-gray-500 text-center">可上傳 1~3 張，拖曳可調整順序</p>

      <!-- 照片格子（有照片的格位可拖曳，空格位固定不動） -->
      <ClientOnly>
        <Draggable
          v-model="avatarSlots"
          item-key="id"
          :animation="200"
          :delay="200"
          :delay-on-touch-only="true"
          class="grid grid-cols-3 gap-3"
          handle=".handle"
          chosen-class="avatar-chosen"
          ghost-class="avatar-ghost"
          @end="handleDragEnd"
        >
          <template #item="{ element, index }">
            <div :class="[{ handle: !!element.previewUrl }]">
              <AvatarSlot
                :preview-url="element.previewUrl || null"
                :index="index"
                :is-first="index === 0"
                :disabled="isSlotDisabled(index)"
                @add="handleSlotAdd(index)"
                @remove="handleSlotRemove(index)"
              />
            </div>
          </template>
        </Draggable>
      </ClientOnly>

      <!-- 送出按鈕 -->
      <BaseButton class="button button__primary w-full" :disabled="isUploading" @click="handleSubmit">
        {{ isUploading ? '上傳中...' : '送出' }}
      </BaseButton>
    </div>
  </div>
  <!-- 隱藏的 file input -->
  <input ref="fileInputRef" type="file" class="hidden" :accept="ACCEPTED_EXTENSIONS" @change="handleFileChange" />
</template>

<script setup lang="ts">
import { useMessage } from '~/store/message';
import AvatarSlot from './components/AvatarSlot.vue';
import Draggable from 'vuedraggable';
import type { SortableEvent } from 'sortablejs';
import {
  MAX_PHOTOS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ACCEPTED_MIME_TYPES,
  ACCEPTED_EXTENSIONS
} from './constants';

interface AvatarSlotData {
  id: string; // 用於 draggable 的 key
  file: File | null;
  previewUrl: string;
  isExisting: boolean; // true = 已在伺服器上的照片
}

const AvatarCropper = defineAsyncComponent(() => import('./components/AvatarCropper.vue'));

const router = useRouter();

const messageStore = useMessage();
const { userInfoRes, avatarsMutateHandler, avatarsOrderMutateHandler } = useUserInfoQuery();

// ─── 狀態 ───────────────────────────────────────────────────────────────────

// 固定 3 格，有照片的 slot 可拖曳，空格位靜態不動
const avatarSlots = ref<AvatarSlotData[]>([]);
const avatarsOrders = ref<number[]>([0, 1, 2]);
// 上傳狀態
const isUploading = ref(false);

// 裁切器狀態
const showCropper = ref(false);
const cropperSrc = ref('');
const pendingSlotIndex = ref<number>(-1);
const pendingObjectUrl = ref<string>(''); // 待裁切用的 Object URL（裁切完需 revoke）

// file input ref
const fileInputRef = ref<HTMLInputElement | null>(null);
const activeSlotIndex = ref<number>(-1); // 目前要新增照片的 slot index

// ─── 初始化 ─────────────────────────────────────────────────────────────────

const initSlots = () => {
  const existingAvatars = userInfoRes.value?.data?.avatars ?? [];
  const result: AvatarSlotData[] = [];

  for (let i = 0; i < MAX_PHOTOS; i++) {
    const avatarPath = existingAvatars[i];
    if (avatarPath) {
      result.push({
        id: `existing-${i}-${Date.now()}`,
        file: null,
        previewUrl: useAvatarUrl(avatarPath),
        isExisting: true
      });
    } else {
      result.push({
        id: `empty-${i}-${Date.now()}`,
        file: null,
        previewUrl: '',
        isExisting: false
      });
    }
  }

  avatarSlots.value = result;
};

initSlots();

// ─── 依序上傳控制 ─────────────────────────────────────────────────────────────

const isSlotDisabled = (index: number): boolean => {
  if (index === 0) return false;
  const prevSlot = avatarSlots.value[index - 1];
  if (!prevSlot) return true;
  return !prevSlot.file && !prevSlot.isExisting;
};

// ─── 驗證 ────────────────────────────────────────────────────────────────────

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: '不支援的圖片格式，請上傳 JPG、PNG 或 WebP' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `圖片大小不可超過 ${MAX_FILE_SIZE_MB}MB` };
  }
  return { valid: true };
};

const hasValidPhotos = computed(() => avatarSlots.value.some((slot) => slot.file || slot.isExisting));

// ─── 新增照片流程 ──────────────────────────────────────────────────────────────

const handleSlotAdd = (index: number) => {
  if (isSlotDisabled(index)) return;
  activeSlotIndex.value = index;
  fileInputRef.value?.click();
};

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  // 清空 input 以確保可重複選同一檔案
  input.value = '';
  if (!file) return;

  const { valid, error } = validateFile(file);
  if (!valid) {
    messageStore.openMessage({ title: '格式錯誤', content: error!, hasCancel: false });
    return;
  }

  // 建立 Object URL 傳給裁切元件
  const objectUrl = URL.createObjectURL(file);
  pendingObjectUrl.value = objectUrl;
  pendingSlotIndex.value = activeSlotIndex.value;
  cropperSrc.value = objectUrl;
  showCropper.value = true;
};

// ─── 裁切完成 ────────────────────────────────────────────────────────────────

const handleCropConfirm = (croppedFile: File) => {
  // revoke 裁切用的 Object URL
  if (pendingObjectUrl.value) {
    URL.revokeObjectURL(pendingObjectUrl.value);
    pendingObjectUrl.value = '';
  }

  const previewUrl = URL.createObjectURL(croppedFile);
  const slotIndex = pendingSlotIndex.value;

  const oldSlot = avatarSlots.value[slotIndex];
  if (oldSlot && !oldSlot.isExisting && oldSlot.previewUrl) {
    URL.revokeObjectURL(oldSlot.previewUrl);
  }

  avatarSlots.value[slotIndex] = {
    id: oldSlot?.id ?? `new-${Date.now()}`,
    file: croppedFile,
    previewUrl,
    isExisting: false
  };

  showCropper.value = false;
  cropperSrc.value = '';
  pendingSlotIndex.value = -1;
};

const handleCropCancel = () => {
  if (pendingObjectUrl.value) {
    URL.revokeObjectURL(pendingObjectUrl.value);
    pendingObjectUrl.value = '';
  }
  showCropper.value = false;
  cropperSrc.value = '';
  pendingSlotIndex.value = -1;
};

// ─── 刪除照片（刪除後靠前補位） ─────────────────────────────────────────────

const handleSlotRemove = (index: number) => {
  const slot = avatarSlots.value[index];
  if (!slot || (!slot.file && !slot.isExisting)) return;

  if (!slot.isExisting && slot.previewUrl) {
    URL.revokeObjectURL(slot.previewUrl);
  }

  // 移除後靠前補位，末尾補一個空格
  avatarSlots.value.splice(index, 1);
  avatarSlots.value.push({
    id: `empty-${Date.now()}`,
    file: null,
    previewUrl: '',
    isExisting: false
  });
};

// ─── 拖曳排序 ────────────────────────────────────────────────────────────────

const changeOrder = (newIndex: number, oldIndex: number) => {
  if (oldIndex !== newIndex) {
    [avatarsOrders.value[oldIndex], avatarsOrders.value[newIndex]] = [
      avatarsOrders.value[newIndex],
      avatarsOrders.value[oldIndex]
    ];
  }
};
const handleDragEnd = (event: SortableEvent) => {
  changeOrder(event.newIndex ?? 0, event.oldIndex ?? 0);
  // 確保有照片的 slot 永遠在前，空格補後（防止拖曳後順序錯亂）
  const filled = avatarSlots.value.filter((s) => s.file || s.isExisting);
  const empty = avatarSlots.value.filter((s) => !s.file && !s.isExisting);
  avatarSlots.value = [...filled, ...empty];
};

// ─── 送出 ─────────────────────────────────────────────────────────────────────

const handleSubmit = async () => {
  const isOrderChanged = avatarsOrders.value.some((item, index) => item !== index);
  const isAvatarsChange = avatarSlots.value.some((item) => item.file !== null);
  if (!isAvatarsChange && !isOrderChanged) {
    router.push('/userInfo');
    return;
  }

  if (!userInfoRes.value?.data?.uuid) return;

  if (!hasValidPhotos.value) {
    messageStore.openMessage({
      title: '訊息',
      content: '請至少上傳一張照片',
      hasCancel: false
    });
    return;
  }

  isUploading.value = true;

  try {
    const uuid = userInfoRes.value.data.uuid;

    if (isOrderChanged) {
      await avatarsOrderMutateHandler({ uuid, order: avatarsOrders.value });
    }

    if (isAvatarsChange) {
      const formData = new FormData();
      const photoKeys = ['photo1', 'photo2', 'photo3'] as const;

      avatarSlots.value.forEach((slot, i) => {
        if (i >= MAX_PHOTOS) return;
        if (slot.file) {
          formData.append(photoKeys[i], slot.file);
        } else if (slot.isExisting) {
          formData.append(photoKeys[i], slot.previewUrl);
        }
      });
      await avatarsMutateHandler({ uuid, avatars: formData });
    }

    messageStore.openMessage({
      title: '訊息',
      content: '頭像設定成功',
      hasCancel: false
    });

    router.push('/userInfo');
  } catch (error) {
    console.error('set avatar fail', error);

    const errorCode = (error as { statusCode?: number })?.statusCode;
    let errorMessage = '設定失敗';

    if (errorCode === 400) {
      errorMessage = '請至少上傳一張照片，或圖片格式不支援';
    }

    messageStore.openMessage({
      title: '錯誤',
      content: errorMessage,
      hasCancel: false
    });
  } finally {
    isUploading.value = false;
  }
};

// ─── 清理 Object URL ──────────────────────────────────────────────────────────

onBeforeUnmount(() => {
  avatarSlots.value.forEach((slot) => {
    if (!slot.isExisting && slot.previewUrl) {
      URL.revokeObjectURL(slot.previewUrl);
    }
  });
  if (pendingObjectUrl.value) {
    URL.revokeObjectURL(pendingObjectUrl.value);
  }
});
</script>

<style>
/* 正在被拖曳的元素：縮放放大＋加陰影 */
.avatar-chosen {
  transform: scale(1.06);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  opacity: 0.9;
  z-index: 10;
}
/* 放置占位符：半透明虛線框 */
.avatar-ghost {
  opacity: 0.35;
  outline: 2px dashed #9ca3af;
  border-radius: 0.5rem;
}
</style>
