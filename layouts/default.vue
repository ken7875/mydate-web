<template>
  <div class="w-full relative bg-bg">
    <header class="h-[80px] flex px-[20px] z-[10] py-[10px] bg-banner-bg sticky top-0 w-full">
      <nav>
        <h1 class="w-[70%] h-full">
          <img src="@/assets/images/topbar-logo/bloom-topbar-1x.webp" alt="logo" class="object-fit" />
        </h1>
      </nav>
    </header>
    <main class="h-[calc(100dvh-80px*2)]">
      <slot></slot>
    </main>
    <footer class="flex justify-around items-center w-full list-none h-20 z-10 sticky bottom-0 bg-banner-bg">
      <li class="cursor-pointer">
        <NuxtLink to="/meet" class="flex flex-col">
          <ClientOnly>
            <font-awesome-icon :icon="['far', 'compass']" class="text-[2rem] mb-2" />
          </ClientOnly>
          <span>配對</span>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/friends" class="flex flex-col">
          <ClientOnly>
            <font-awesome-icon :icon="['far', 'comments']" class="text-[2rem] mb-2" />
          </ClientOnly>
          <span>聊天</span>
        </NuxtLink>
      </li>
      <li class="w-[20%] flex justify-center items-center">
        <NuxtLink to="/streamer">
          <ClientOnly>
            <div class="rounded-[50%] bg-primary w-[60px] h-[60px] flex justify-center items-center">
              <font-awesome-icon :icon="['fas', 'video']" class="text-[2rem] text-white" />
            </div>
          </ClientOnly>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/live" class="flex flex-col">
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'tv']" class="text-[2rem] mb-2" />
          </ClientOnly>
          <span>直播室</span>
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/userInfo" class="flex flex-col">
          <ClientOnly>
            <font-awesome-icon :icon="['far', 'user']" class="text-[2rem] mb-2" />
          </ClientOnly>
          <span>我的</span>
        </NuxtLink>
      </li>
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
import type { WsPayload } from '~/composables/useWsChannel';

const authStore = useAuth();
const notificationStore = useNotification();
const friendStore = useFriends();
const streamStore = useStream();
const route = useRoute();

const queryClient = useQueryClient();
// 於server side渲染
onServerPrefetch(async () => {
  await queryClient.prefetchQuery({
    queryKey: ['userInfo'],
    queryFn: getUserInfo
  });
});

const { updateQuery } = useMessageQuery();

// handler 必須是具名函式（非匿名箭頭函式），unsubscribe 需要相同的函式參照
const globalMessageHandler = (payload: WsPayload) => notificationStore.websocketGlobalMessage(payload.data);
const inviteFriendHandler = (payload: WsPayload) => friendStore.getNewFriendInvite(payload.data);
const setFriendStatusHandler = () => friendStore.getAllFriendsHandler({ page: 1, pageSize: 15 });
const addRoomHandler = (payload: WsPayload) => streamStore.addRoom(payload.data); // TODO 優化為有訂閱該主播再全域通知，之後將其移動到chatroom
const deleteRoomHandler = (payload: WsPayload) => streamStore.deleteRoom(payload.data); // TODO 同上

const chatRoomMessageHandler = (payload: WsPayload) => {
  // 若當前在 chatroom 頁面，由 chatroom page 自己的 handler 處理
  if (route.path === '/chatroom') return;

  const msg = payload.data?.message;
  if (!msg) return;
  updateQuery({ newMessage: msg, senderId: msg.senderId, receiverId: msg.receiverId });
};

useWsChannel([
  { type: WsChannel.Global, handler: globalMessageHandler },
  { type: WsChannel.InviteFriend, handler: inviteFriendHandler },
  { type: WsChannel.SetFriendStatus, handler: setFriendStatusHandler },
  { type: WsChannel.AddRoom, handler: addRoomHandler },
  { type: WsChannel.DeleteRoom, handler: deleteRoomHandler },
  { type: WsChannel.ChatRoom, handler: chatRoomMessageHandler }
]);

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
