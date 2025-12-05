<template>
  <div class="w-full relative">
    <header class="h-[65px] flex justify-end px-[20px] z-[10] py-[10px] bg-amber-200 sticky top-0 w-full">
      <nav>
        <NuxtLink to="/userInfo">
          <ClientOnly>
            {{ authStore.userInfo?.userName }}
          </ClientOnly>
        </NuxtLink>
      </nav>
    </header>
    <main class="h-[calc(100vh-65px*2)]">
      <slot></slot>
    </main>
    <footer class="flex justify-around w-full h-[65px] z-[10] sticky bottom-0 bg-amber-300">
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

const { data: userInfoRes } = await useMyAsyncData('userInfo', async () => await getUserInfo());

if (userInfoRes.value?.data) {
  authStore.setUserInfo(userInfoRes.value.data);
}

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
