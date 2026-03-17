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
    <footer class="flex justify-around w-full h-[80px] z-[10] sticky bottom-0 bg-banner-bg">
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
import type { WsPayload } from '~/composables/useWsChannel';

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

const { updateQuery } = useMessageQuery();

// handler 必須是具名函式（非匿名箭頭函式），unsubscribe 需要相同的函式參照
const globalMessageHandler = (payload: WsPayload) => notificationStore.websocketGlobalMessage(payload.data);
const inviteFriendHandler = (payload: WsPayload) => friendStore.getNewFriendInvite(payload.data);
const setFriendStatusHandler = () => friendStore.getAllFriendsHandler({ page: 1, pageSize: 15 });
const addRoomHandler = (payload: WsPayload) => streamStore.addRoom(payload.data); // TODO 優化為有訂閱該主播再全域通知，之後將其移動到chatroom
const deleteRoomHandler = (payload: WsPayload) => streamStore.deleteRoom(payload.data); // TODO 同上

const chatRoomMessageHandler = (payload: WsPayload) => {
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
