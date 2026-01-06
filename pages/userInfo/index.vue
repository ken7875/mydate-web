<template>
  <div class="full-screen-container">
    <div class="my-5 flex flex-col items-center gap-3">
      <img
        crossorigin="anonymous"
        :src="getDefaultAvatar(userInfoRes?.data?.avatars?.at(-1))"
        @click="setAvatarsToggle = true"
        class="block w-[150px] h-[150px] border-2 rounded-[50%] object-cover"
      />
      <p class="font-bold text-xl">{{ userInfoRes?.data?.userName }}</p>
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

const FilterModal = defineAsyncComponent(() => import('./filterModal/index.vue'));
const SetUserModal = defineAsyncComponent(() => import('./setUserModal/index.vue'));
const SetAvatarModal = defineAsyncComponent(() => import('./setAvatarModal/index.vue'));

const router = useRouter();
const authStore = useAuth();

const { userInfoRes } = useUserInfoQuery();
// 用來給 img 顯示預覽

const filterModalToggle = ref(false);
const setUserInfoToggle = ref(false);
const setAvatarsToggle = ref(false);

const logoutHandler = () => {
  authStore.logout();
  router.push('/auth/login');
};
</script>
