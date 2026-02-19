<template>
  <div class="w-full h-full overflow-scroll">
    <nav class="px-[12px] py-[8px] mb-[12px] h-[60px] shadow-[0_4px_6px_-1px_rgba(209,213,219,1)]">
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
          v-model:list="showingFriendList"
          :perLoadNum="10"
          :total="totalFriends"
          @loadNewData="showNewFriendsData"
          @loadPrevData="showPrevFriendsData"
        >
          <template v-slot="{ item }">
            <div
              :class="['flex w-full h-[5.5rem] cursor-pointer p-[5px] border-b-1 border-gray-300']"
              @click="checkChatRoom(item)"
              :data-idx="item.idx"
            >
              <div class="w-[65px] h-[65px] rounded-[50%] overflow-hidden">
                <NuxtImg
                  preload
                  crossorigin="anonymous"
                  format="webp"
                  width="65"
                  height="65"
                  :placeholder="[65, 65, 100]"
                  :src="getDefaultAvatar(item.avatars[0], '/images/testUser1.jpg')"
                  alt="avatar"
                  class="w-full h-full object-cover"
                />
                <!-- <img src="/images/testUser1.jpg" class="w-full h-full object-cover" alt="" /> -->
              </div>
              <div class="w-[calc(100%-65px)] px-[5px]" @contextmenu.prevent="openUserOperateMenu">
                <div class="flex justify-between items-center w-ful mb-[3px]">
                  <span v-if="isDev">{{ item.idx }}</span>
                  <p class="font-bold leading-[1.5]">{{ item.userName }}</p>
                  <p class="text-sm leading-[1.5]">下午 2:56</p>
                </div>
                <div class="flex justify-between items-center w-full">
                  <div class="w-[80%]">
                    <p class="break-all" v-textSlice:[20]="previewMessagesObj?.[item.uuid]?.message || ''"></p>
                  </div>
                  <div class="w-[20%] flex justify-center items-center" v-if="unReadCountData?.[item.uuid]?.count">
                    <div
                      class="bg-primary leading-1 rounded-[50%] flex justify-center items-center min-w-[30px] h-[30px] px-[3px]"
                    >
                      <span class="font-[600] text-[14px]">{{ unReadCountData?.[item.uuid]?.count || 0 }}</span>
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
import { markAsReadApi } from '@/api/modules/chat';
import { useFriends } from '@/store/friends';
import { useChat } from '@/store/chat';
import { storeToRefs } from 'pinia';
import type { Friends } from '@/api/types/friend';
import type { Message } from '~/api/types/chat';
import type { User } from '~/api/types/user';
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
const { getAllFriendsHandler } = friendsStore;

const handleUnReadCountUpdate = (params: { user: User; message: Message[] }) => {
  chatStore.getUnReadCountHandler(params.message.map((item) => item.senderId));
};

const { data: initialFriends } = await useMyAsyncData('friends', () =>
  getAllFriendsHandler({
    page: 1,
    pageSize: 10
  })
);

const currentPage = ref(1);
const showingFriendList = ref<ShowingFriendList>([...(initialFriends.value || [])]);
const showNewFriendsData = async ({ page, pageSize }: { page: number; pageSize: number }) => {
  const data = await getAllFriendsHandler({ page, pageSize });
  if (data) {
    showingFriendList.value.push(...data);
    currentPage.value = page;
  }
};

const showPrevFriendsData = async ({ page, pageSize }: { page: number; pageSize: number }) => {
  const data = await getAllFriendsHandler({ page, pageSize });
  if (data) {
    showingFriendList.value.unshift(...data);
    currentPage.value = page;
  }
};

// 置頂新訊息
const isFirstPageVisible = computed(() => showingFriendList.value[0].page === 1);
const addNewMessage = ({ user }: { user: Friends }) => {
  const userIndex = showingFriendList.value[0].index - 1;
  showingFriendList.value.unshift({
    ...user,
    index: userIndex,
    page: 1,
    idx: `1-${userIndex}`
  });
};

const updateFriendsList = ({ user }: { user: Friends; message: Message }) => {
  const friendIndex = showingFriendList.value.findIndex((friend) => friend.uuid === user.uuid);
  const isFirstUser = isFirstPageVisible.value && friendIndex === 0;

  if (isFirstUser) return;

  showingFriendList.value.splice(friendIndex, 1);
  if (isFirstPageVisible.value) {
    addNewMessage({ user });
  }
};

const { data: previewMessagesObj } = await useMyAsyncData('getAllFriendsPreviewMessage', () =>
  chatStore.getAllFriendsPreviewMessage()
);

const { data: unReadCountData } = await useMyAsyncData('getUnReadCountHandler', () => {
  const friendsId = showingFriendList.value.map((friend) => friend.uuid);
  return chatStore.getUnReadCountHandler(friendsId);
});

watch(
  () => chatStore.previewMessage,
  (previewMessage) => {
    if (previewMessagesObj.value) {
      Object.entries(previewMessage).forEach(([key, val]) => {
        previewMessagesObj.value![key] = val;
      });
    }
  }
);

watch(
  () => chatStore.unReadCount,
  (unReadCount) => {
    if (previewMessagesObj.value) {
      Object.entries(unReadCount).forEach(([key, val]) => {
        unReadCountData.value![key] = val;
      });
    }
  }
);

const checkChatRoom = (friend: Friends) => {
  if (previewMessagesObj.value?.[friend.uuid]?.sendTime) {
    markAsReadApi({
      senderId: friend.uuid,
      sendTime: previewMessagesObj.value?.[friend.uuid]?.sendTime
    });

    unReadCountData.value[friend.uuid] && (unReadCountData.value[friend.uuid].count = 0);
  }

  router.push({
    path: 'chatroom',
    query: {
      uuid: friend.uuid
    }
  });
};

const openUserOperateMenu = () => {
  console.log('開啟操作好友選單');
};

let chatRoomChannel: BroadcastChannel | null = null;

onMounted(() => {
  chatRoomChannel = new BroadcastChannel(WsChannel.ChatRoom);
  chatRoomChannel.addEventListener('message', ({ data }) => {
    [updateFriendsList, handleUnReadCountUpdate, chatStore.getAllFriendsPreviewMessage].forEach((handler) => {
      try {
        handler(data.data);
      } catch (error) {
        console.error(`Error in BroadcastChannel handler for type ${WsChannel.ChatRoom}:`, error);
      }
    });
  });
});

const searchingString = ref('');
const searchFriendHandler = useDebounceFn(async () => {
  const data = await getAllFriendsHandler({
    page: 1,
    pageSize: 25,
    userName: searchingString.value
  });
  if (data) {
    showingFriendList.value = data;
    currentPage.value = 1;
  }
}, 300);

onBeforeUnmount(() => {
  chatRoomChannel?.close();
  chatRoomChannel = null;
});
</script>
