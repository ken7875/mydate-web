<template>
  <div class="w-full lg:max-w-[500px] lg:mx-auto relative bg-bg">
    <header class="h-20 flex px-5 z-10 py-2.5 bg-banner-bg sticky top-0 w-full">
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
        <NuxtLink to="/meet" class="flex flex-col text-gray items-center">
          <ClientOnly>
            <font-awesome-icon :icon="['far', 'compass']" class="text-[1.6rem] mb-1" />
          </ClientOnly>
          <span class="text-xs">配對</span>
        </NuxtLink>
      </li>
      <li>
        <AlertDot :nums="chatStore.totalUnreadCount">
          <NuxtLink to="/friends" class="flex flex-col text-gray items-center">
            <ClientOnly>
              <font-awesome-icon :icon="['far', 'comments']" class="text-[1.6rem] mb-1" />
            </ClientOnly>
            <span class="text-xs">聊天</span>
          </NuxtLink>
        </AlertDot>
      </li>
      <li
        class="w-[20%] flex justify-center items-center"
        @click="
          messageStore.openMessage({
            title: '訊息',
            content: '暫不開放'
          })
        "
      >
        <!-- <NuxtLink to="/streamer"> -->
        <ClientOnly>
          <div class="rounded-[50%] bg-primary w-[60px] h-[60px] flex justify-center items-center">
            <font-awesome-icon :icon="['fas', 'video']" class="text-[1.6rem] text-white" />
          </div>
        </ClientOnly>
        <!-- </NuxtLink> -->
      </li>
      <li
        @click="
          messageStore.openMessage({
            title: '訊息',
            content: '暫不開放'
          })
        "
      >
        <!-- <NuxtLink to="/live" class="flex flex-col text-gray items-center"> -->
        <div class="flex flex-col text-gray items-center">
          <ClientOnly>
            <font-awesome-icon :icon="['fas', 'tv']" class="text-[1.6rem] mb-1" />
          </ClientOnly>
          <span class="text-xs">直播室</span>
        </div>
        <!-- </NuxtLink> -->
      </li>
      <li>
        <NuxtLink to="/userInfo" class="flex flex-col text-gray items-center">
          <ClientOnly>
            <font-awesome-icon :icon="['far', 'user']" class="text-[1.6rem] mb-1" />
          </ClientOnly>
          <span class="text-xs">我的</span>
        </NuxtLink>
      </li>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '@/store/auth';
import { useNotification } from '@/store/notificationWebSocket';
import { useFriends } from '@/store/friends';
import { useChat } from '@/store/chat';
import { useStream } from '@/store/stream';
import { getUserInfo } from '@/api/modules/auth';
import { WsChannel, WSCode } from '@/enums/websocket';
import { getMyDateDB } from '@/utils/indexedDB/myDateDB';
import type { Friends } from '@/api/types/friend';
import type { GetRoomsResponse } from '@/api/types/stream';
import type { WsMessage } from '@/api/types/chat';
import { useMessage } from '~/store/message';

const authStore = useAuth();
const notificationStore = useNotification();
const friendStore = useFriends();
const chatStore = useChat();
const streamStore = useStream();
const messageStore = useMessage();

const route = useRoute();

onMounted(() => {
  getMyDateDB();
});

const queryClient = useQueryClient();
// 於server side渲染
onServerPrefetch(async () => {
  await queryClient.prefetchQuery({
    queryKey: ['userInfo'],
    queryFn: getUserInfo
  });
});

const { updateMessageQuery } = useMessageQuery();

const failMessageHandler = useFailedMessages();

// handler 必須是具名函式（非匿名箭頭函式），unsubscribe 需要相同的函式參照
const globalMessageHandler = (payload: WsPayload<any>) => notificationStore.websocketGlobalMessage(payload.data);
const inviteFriendHandler = (payload: WsPayload<Friends>) => friendStore.getNewFriendInvite(payload.data);
const setFriendStatusHandler = () => friendStore.getAllFriendsHandler({ page: 1, pageSize: 15 });
const addRoomHandler = (payload: WsPayload<GetRoomsResponse>) => streamStore.addRoom(payload.data); // TODO 優化為有訂閱該主播再全域通知，之後將其移動到chatroom
const deleteRoomHandler = (payload: WsPayload<{ uuid: string }>) => streamStore.deleteRoom(payload.data); // TODO 同上

const chatRoomMessageHandler = (payload: WsPayload<WsMessage>) => {
  // 若當前在 chatroom 頁面，由 chatroom page 自己的 handler 處理
  if (route.path === '/chatroom') return;
  // SUCCESS/FAIL 為確認訊息，由下方 handler 處理
  if (payload.code === WSCode.SUCCESS || payload.code === WSCode.FAIL) return;

  const msg = payload.data?.message[0];
  console.log(msg, 'msg');
  if (!msg) return;
  updateMessageQuery({ newMessage: [msg], roomId: msg.roomId });
};

useWsChannel([
  { type: WsChannel.Global, handler: globalMessageHandler },
  { type: WsChannel.InviteFriend, handler: inviteFriendHandler },
  { type: WsChannel.SetFriendStatus, handler: setFriendStatusHandler }, // TODO 每次接收到好友接受邀請訊息就要發一次api，需優化成就地修改
  { type: WsChannel.AddRoom, handler: addRoomHandler },
  { type: WsChannel.DeleteRoom, handler: deleteRoomHandler },
  {
    type: WsChannel.MarkAsRead,
    handler: () => {
      chatStore.getTotalUnreadCount();
    }
  },
  {
    type: WsChannel.ChatRoom,
    handler: [
      chatRoomMessageHandler,
      (data: WsPayload<WsMessage>) => {
        if (route.path === '/chatroom') return;
        const msg = data.data?.message[0];
        if (!msg) return;
        chatStore.incrementTotalUnreadCount();
      },
      async (data: WsPayload<WsMessage>) => {
        const msg = data.data?.message[0];
        if (!msg?.localId || route.path === '/chatroom') return;

        await failMessageHandler.handleWsMessageStatus({ code: data.code, localId: msg.localId, roomId: msg.roomId });
      }
    ]
  }
]);

watch(
  () => authStore.token,
  (val) => {
    if (process.client && val) {
      notificationStore.init(val);
      chatStore.getTotalUnreadCount();
    }

    if (!val) {
      authStore.logout();
    }
  },
  {
    immediate: true
  }
);
</script>
