<template>
  <div class="w-full relative">
    <header class="h-[80px] flex justify-end px-[20px] z-[10] py-[10px] bg-primary sticky top-0 w-full">
      <nav>
        <NuxtLink to="/userInfo" class="flex items-center">
          <div class="w-[60px] h-[60px] rounded-[50%] overflow-hidden">
            <img
              class="w-full h-full mr-5"
              :src="avatarPreviewUrl"
              alt="avatars"
              v-if="userInfoRes?.data?.avatars[0]"
              crossorigin="anonymous"
            />
            <img class="w-full h-full" src="/images/default.jpg" alt="" />
          </div>
        </NuxtLink>
      </nav>
    </header>
    <main class="h-[calc(100vh-80px*2)]">
      <slot></slot>
    </main>
    <footer class="flex justify-around w-full h-[80px] z-[10] sticky bottom-0 bg-primary">
      <div>
        <NuxtLink to="/meet">meet</NuxtLink>
      </div>
      <div>
        <NuxtLink to="/friends">friends</NuxtLink>
      </div>
      <div>
        <NuxtLink to="/live">live</NuxtLink>
      </div>
      <div>
        <NuxtLink to="/streamer">streamer</NuxtLink>
      </div>
      <!-- <div>
        <NuxtLink to="/user">userinfo</NuxtLink>
      </div> -->
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/store/auth';
import { useNotification } from '@/store/notificationWebSocket';
import { useChat } from '@/store/chat';
import { useFriends } from '@/store/friends';
import { useStream } from '~/store/stream';
import { getUserInfo } from '@/api/modules/auth';

const authStore = useAuth();
const notificationStore = useNotification();
const chatStore = useChat();
const friendStore = useFriends();
const streamStore = useStream();

const { userInfoRes } = useUserInfoQuery();

const queryClient = useQueryClient();
// 於server side渲染
onServerPrefetch(async () => {
  await queryClient.prefetchQuery({
    queryKey: ['userInfo'],
    queryFn: getUserInfo
  });
});

const publicPath = computed(() => useRuntimeConfig().public.publicPath);
const avatarPreviewUrl = computed<string>(() => {
  return userInfoRes.value?.data && userInfoRes.value.data.avatars.length > 0
    ? publicPath.value + userInfoRes.value.data.avatars?.at(0)
    : '/images/default.jpg';
});

watch(
  () => authStore.token,
  (val) => {
    if (process.client) {
      if (val) {
        notificationStore.subscribe({
          type: 'global',
          fnAry: [notificationStore.websocketGlobalMessage]
        });
        notificationStore.subscribe({
          type: 'chatRoom',
          fnAry: [chatStore.updateMessageRecord]
        });
        notificationStore.subscribe({
          type: 'inviteFriend',
          fnAry: [friendStore.getNewFriendInvite]
        });
        notificationStore.subscribe({
          type: 'setFriendStatus',
          fnAry: [friendStore.getAllFriendsHandler]
        });
        notificationStore.subscribe({
          type: 'addRoom',
          fnAry: [streamStore.addRoom]
        });
        notificationStore.subscribe({
          type: 'deleteRoom',
          fnAry: [streamStore.deleteRoom]
        });

        notificationStore.init(val);
      }
    }
  },
  {
    immediate: true
  }
);
</script>
