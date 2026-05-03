<template>
  <div class="w-full h-full overflow-scroll">
    <nav class="px-3 py-2 mb-3 h-[60px] shadow-[0_4px_6px_-1px_rgba(209,213,219,1)]">
      <BaseInput v-model="searchingString" placeholder="請輸入用戶名稱" @input="searchFriendHandler">
        <template #suffix>
          <!-- <client-only>
            <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
          </client-only> -->
        </template>
      </BaseInput>
    </nav>
    <template v-if="totalFriends > 0">
      <div class="h-[calc(100%-60px-12px)]">
        <VirtualList
          :totalData="showingFriendList"
          :perLoadNum="10"
          :total="totalFriends"
          :fetchNewHandler="showNewFriendsData"
        >
          <template v-slot="{ item }">
            <div
              :class="['flex w-full h-22 cursor-pointer p-[5px] border-b border-gray-300']"
              @click="checkChatRoom(item)"
            >
              <div class="w-[65px] h-[65px] rounded-[50%] overflow-hidden">
                <NuxtImg
                  preload
                  crossorigin="anonymous"
                  format="webp"
                  width="65"
                  height="65"
                  :placeholder="[65, 65, 100]"
                  :src="useAvatarUrl(item.avatars[0])"
                  alt="avatar"
                  class="w-full h-full object-cover"
                />
                <!-- <img src="/images/testUser1.jpg" class="w-full h-full object-cover" alt="" /> -->
              </div>
              <div class="w-[calc(100%-65px)] px-[5px]" @contextmenu.prevent="openUserOperateMenu">
                <div class="flex justify-between items-center w-ful mb-[3px]">
                  <span v-if="isDev">{{ item.idx }}</span>
                  <p class="font-bold leading-normal">{{ item.userName }}</p>
                  <p class="text-sm leading-normal">下午 2:56</p>
                </div>
                <div class="flex justify-between items-center w-full">
                  <div class="w-[80%]">
                    <p
                      class="break-all"
                      v-textSlice:[20]="previewMessageText({ roomId: item.roomId, friendName: item.userName })"
                    ></p>
                  </div>
                  <div class="w-[20%] flex justify-center items-center" v-if="unReadCount[item.roomId]?.count">
                    <div
                      class="bg-primary leading-1 rounded-[50%] flex justify-center items-center min-w-[30px] h-[30px] px-[3px]"
                    >
                      <span class="font-semibold text-[14px]">{{ unReadCount[item.roomId]?.count || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </VirtualList>
      </div>
      <div v-show="showingFriendList.length === 0" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <p class="text-center">"{{ searchingString }}"</p>
        <p>找不到符合資料</p>
      </div>
    </template>
    <template v-else> 快去認識新朋友吧 </template>
  </div>
</template>

<script setup lang="ts">
// import { markAsReadApi } from '@/api/modules/chat';
import { useFriends } from '@/store/friends';
import { useChat } from '@/store/chat';
import { storeToRefs } from 'pinia';
import type { Friends } from '@/api/types/friend';
import type { WsMessage } from '~/api/types/chat';
import type { ShowingFriendList } from './types';
import { WsChannel } from '~/enums/websocket';

defineOptions({
  name: 'friends'
});
const isDev = import.meta.dev;
const router = useRouter();
const friendsStore = useFriends();
const { totalFriends } = storeToRefs(friendsStore);

const chatStore = useChat();
const { unReadCount } = storeToRefs(chatStore);
const { getAllFriendsHandler } = friendsStore;

const { userInfoRes } = useUserInfoQuery();

const { data: initialFriends } = await useMyAsyncData('friends', () =>
  getAllFriendsHandler({
    page: 1,
    pageSize: 10
  })
);

const endPage = ref(1);
const showingFriendList = ref<ShowingFriendList>([...(initialFriends.value || [])]);

const fetchUnReadCountForFriends = (friends: ShowingFriendList) => {
  const roomIds = friends.map((f) => f.roomId);
  if (roomIds.length > 0) chatStore.getUnReadCountHandler(roomIds);
};

fetchUnReadCountForFriends(showingFriendList.value);

const showNewFriendsData = async () => {
  endPage.value++;
  const data = await getAllFriendsHandler({ page: endPage.value, pageSize: 10 });

  if (data) {
    showingFriendList.value.push(...data);
    fetchUnReadCountForFriends(data);
  }
};

// 置頂新訊息
const isFirstPageVisible = computed(() => showingFriendList.value[0].page === 1);
const addNewMessage = ({ user, roomId }: { user: Friends; roomId: number }) => {
  const userIndex = showingFriendList.value[0].index - 1;
  console.log(user, 'user');
  showingFriendList.value.unshift({
    ...user,
    index: userIndex,
    page: 1,
    roomId,
    idx: `1-${userIndex}`
  });
  console.log(showingFriendList.value, 'unshift');
};

const updateFriendsList = ({ data }: WsPayload<WsMessage>) => {
  const { user, roomId } = data;
  const friendIndex = showingFriendList.value.findIndex((friend) => friend.roomId === roomId);
  const isFirstUser = isFirstPageVisible.value && friendIndex === 0;
  console.log(friendIndex, 'friendIndex');

  if (isFirstUser) return;

  if (friendIndex !== -1) {
    showingFriendList.value.splice(friendIndex, 1);
    console.log(showingFriendList.value, 'splice');
  }

  if (isFirstPageVisible.value) {
    addNewMessage({ user, roomId });
  }
};

const { data: previewMessagesObj } = await useMyAsyncData('getAllFriendsPreviewMessage', () =>
  chatStore.getAllFriendsPreviewMessage()
);

const previewMessageText = ({ roomId, friendName }: { roomId: number; friendName: string }) => {
  const type = previewMessagesObj.value?.[roomId]?.type;
  switch (type) {
    case 'text':
      return previewMessagesObj.value?.[roomId]?.message;

    case 'image':
      return previewMessagesObj.value?.[roomId]?.senderId === userInfoRes.value?.data?.uuid
        ? '圖片已傳送'
        : `${friendName}向您傳送圖片`;

    default:
      return '';
  }
};

const updatePreviewMessage = ({ data }: WsPayload<WsMessage>) => {
  if (!data.message.length || !previewMessagesObj.value) return;

  const latestMessage = data.message[0];
  previewMessagesObj.value[data.roomId] = {
    ...latestMessage
  };
};

const handleUnReadCountUpdate = ({ data }: WsPayload<WsMessage>) => {
  chatStore.incrementUnReadCount(data.roomId);
};

const checkChatRoom = (friend: Friends) => {
  if (previewMessagesObj.value?.[friend.roomId]) {
    chatStore.setReadCounterHandler({
      roomId: Number(friend.roomId),
      friendId: friend.uuid
    });
  }

  router.push({
    path: 'chatroom',
    query: {
      uuid: friend.uuid,
      roomId: friend.roomId
    }
  });
};

const openUserOperateMenu = () => {
  console.log('開啟操作好友選單');
};

// const chatRoomHandler = (data: any) => {
//   [updateFriendsList, handleUnReadCountUpdate, updatePreviewMessage].forEach((handler) => {
//     try {
//       handler(data);
//     } catch (error) {
//       console.error(`Error in BroadcastChannel handler for type ${WsChannel.ChatRoom}:`, error);
//     }
//   });
// };

useWsChannel([
  { type: WsChannel.ChatRoom, handler: [updateFriendsList, updatePreviewMessage, handleUnReadCountUpdate] }
]);

const searchingString = ref('');
const searchFriendHandler = useDebounceFn(async () => {
  const data = await getAllFriendsHandler({
    page: 1,
    pageSize: 25,
    userName: searchingString.value
  });
  if (data) {
    showingFriendList.value = data;
  }
}, 300);
</script>
