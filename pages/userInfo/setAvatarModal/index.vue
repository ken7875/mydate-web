<template>
  <Modal v-model:isOpen="isOpen">
    <template #default>
      <div class="flex flex-col items-center gap-3">
        <ClientOnly>
          <input id="avatar" type="file" class="hidden" @change="changeAvatar" />
          <label class="block w-[150px] h-[150px] border-2 rounded-[50%] overflow-hidden" for="avatar">
            <img
              crossorigin="anonymous"
              :src="avatarPreviewUrl"
              @error="getDefaultAvatar"
              class="w-full h-full object-cover"
            />
          </label>
        </ClientOnly>
        <BaseButton class="button button__outline-primary w-full mb-3" @click="send">送出</BaseButton>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
// import { setAvatars } from '@/api/modules/auth';
import { useMessageStore } from '~/store/message';
import getDefaultAvatar from '@/utils/getDefaultAvatar';

const messageStore = useMessageStore();
const { userInfoRes } = useUserInfoQuery();
const isOpen = defineModel('isOpen', { required: true, default: false });

// const getDefaultImg = (event: Event) => ((event.target as HTMLImageElement).src = '/images/default.jpg'); // 设置为默认图片

// 用來給 img 顯示預覽
const publicPath = computed(() => useRuntimeConfig().public.publicPath);
const avatarPreviewUrl = ref<string>(
  userInfoRes.value?.data && userInfoRes.value.data.avatars.length > 0
    ? publicPath.value + userInfoRes.value.data.avatars?.at(-1)
    : '/images/default.jpg'
);

const avatars = ref<File[]>([]);

const fileInvalid = (file: File) => {
  if (!file) return true;

  if (file.size > 2 * 1024 * 1024) {
    return true;
  }

  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
    return true;
  }

  return false;
};
const changeAvatar = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  const file = files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const isInvalid = fileInvalid(file);
    if (isInvalid) return;

    // console.log('檔案大小（MB）：', (file.size / (1024 * 1024)).toFixed(2), 'MB');

    avatars.value.push(file);
    // 將讀取出的 Base64 URL 存給預覽
    avatarPreviewUrl.value = event.target?.result as string;
  };
};

const { avatarsMutateHandler } = useUserInfoQuery();
const send = async () => {
  try {
    const formData = new FormData();
    formData.append('photos', avatars.value[0]);

    // await setAvatars(formData);
    await avatarsMutateHandler(formData);
    messageStore.openMessage({
      title: '訊息',
      content: '頭像設定成功',
      hasCancel: false
    });
    isOpen.value = false;
  } catch (error) {
    console.log('set avatar fail', error);
    if (avatars.value.length < 1) {
      messageStore.openMessage({
        title: '訊息',
        content: '請加入新頭像',
        hasCancel: false
      });
    } else {
      messageStore.openMessage({
        title: '訊息',
        content: '設定失敗',
        hasCancel: false
      });
    }
  }
};
</script>
