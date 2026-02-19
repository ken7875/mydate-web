<template>
  <div class="w-full relative">
    <header class="h-[80px] flex justify-end px-[20px] z-[10] py-[10px] bg-primary sticky top-0 w-full">
      <nav>
        <NuxtLink to="/userInfo" class="flex items-center">
          <div class="w-[60px] h-[60px] rounded-[50%] overflow-hidden">
            <NuxtImg
              preload
              crossorigin="anonymous"
              format="webp"
              :src="getDefaultAvatar(userInfoRes?.data?.avatars?.at(0) || '')"
              alt="avatar"
              class="w-full h-full object-cover"
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
import { useFriends } from '@/store/friends';
import { useStream } from '~/store/stream';
import { getUserInfo } from '@/api/modules/auth';
import { WsChannel } from '~/enums/websocket';

const authStore = useAuth();
const notificationStore = useNotification();
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

const globalChannels: BroadcastChannel[] = [];

const createNotificationWsListener = () => {
  const channelHandlers: { type: WsChannel; handlers: ((data: any) => void)[] }[] = [
    { type: WsChannel.Global, handlers: [(data) => notificationStore.websocketGlobalMessage(data)] },
    { type: WsChannel.InviteFriend, handlers: [(data) => friendStore.getNewFriendInvite(data)] },
    { type: WsChannel.SetFriendStatus, handlers: [() => friendStore.getAllFriendsHandler({ page: 1, pageSize: 15 })] },
    { type: WsChannel.AddRoom, handlers: [(data) => streamStore.addRoom(data)] }, // TODO 優化為有訂閱該主播再全域通知，之後將其移動到chatroom
    { type: WsChannel.DeleteRoom, handlers: [(data) => streamStore.deleteRoom(data)] } // TODO 同上
  ];

  for (const { type, handlers } of channelHandlers) {
    const ch = new BroadcastChannel(type);
    ch.addEventListener('message', ({ data }) => {
      handlers.forEach((handler) => {
        try {
          handler(data.data);
        } catch (error) {
          console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
        }
      });
    });
    globalChannels.push(ch);
  }
};

onMounted(() => {
  createNotificationWsListener();
});

onBeforeUnmount(() => {
  globalChannels.forEach((ch) => ch.close());
  globalChannels.length = 0;
});

watch(
  () => authStore.token,
  (val) => {
    if (process.client && val) {
      notificationStore.init(val);
    }
  },
  {
    immediate: true
  }
);
</script>
