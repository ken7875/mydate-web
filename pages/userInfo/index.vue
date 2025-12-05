<template>
  <div class="full-screen-container">
    <div class="my-5 flex flex-col items-center gap-3">
      <img
        crossorigin="anonymous"
        :src="avatarPreviewUrl"
        @error="getDefaultImg"
        @click="setAvatarsToggle = true"
        class="block w-[150px] h-[150px] border-2 rounded-[50%] object-cover"
      />
      <p class="font-bold text-xl">{{ authStore.userInfo?.userName }}</p>
    </div>
    <hr />
    <div class="my-5">
      <BaseButton class="button button__outline-primary w-full mb-3" @click="setUserInfoToggle = true"
        >我的檔案</BaseButton
      >
      <BaseButton class="button button__outline-primary w-full mb-3" @click="filterModalToggle = true"
        >配對調整</BaseButton
      >
      <BaseButton class="button button__outline-primary w-full" @click="logoutHandler">登出</BaseButton>
    </div>
    <hr />
    <FilterModal v-model:isOpen="filterModalToggle" v-if="filterModalToggle" />
    <SetUserModal v-model:isOpen="setUserInfoToggle" v-if="setUserInfoToggle" />
    <SetAvatarModal v-model:isOpen="setAvatarsToggle" v-if="setAvatarsToggle" />
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/store/auth';
// import { getAvatarsApi } from '@/api/modules/auth';

const FilterModal = defineAsyncComponent(() => import('./filterModal/index.vue'));
const SetUserModal = defineAsyncComponent(() => import('./setUserModal/index.vue'));
const SetAvatarModal = defineAsyncComponent(() => import('./setAvatarModal/index.vue'));

const router = useRouter();
const authStore = useAuth();

// const avatars = await useMyAsyncData('avatars', async () => await getAvatarsApi());
const publicPath = computed(() => useRuntimeConfig().public.publicPath);
// 用來給 img 顯示預覽
// TODO 暫時抓最後一筆
const avatarPreviewUrl = computed<string>(() =>
  authStore.userInfo!.avatars?.length > 0
    ? publicPath.value + authStore.userInfo!.avatars?.at(-1)
    : '/images/default.jpg'
);
const getDefaultImg = (event: Event) => ((event.target as HTMLImageElement).src = '/images/default.jpg'); // 设置为默认图片

const filterModalToggle = ref(false);
const setUserInfoToggle = ref(false);
const setAvatarsToggle = ref(false);

const logoutHandler = () => {
  authStore.logout();
  router.push('/auth/login');
};
</script>
