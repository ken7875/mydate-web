<template>
  <div class="w-full h-full overflow-scroll">
    <nav class="px-[12px] py-[8px] mb-[12px] h-[60px] shadow-[0_4px_6px_-1px_rgba(209,213,219,1)]">
      <!-- <client-only>
          <font-awesome-icon :icon="['fas', 'bars']" class="text-[1.2rem] cursor-pointer" />
        </client-only> -->
      <BaseInput v-model="friendsStore.searchingFriend" placeholder="請輸入用戶名稱">
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
                <client-only>
                  <img
                    crossOrigin="anonymous"
                    :src="publicPath + item.avatars?.[0]"
                    alt="friends avatar"
                    class="block w-full h-full"
                    @error="getDefaultImg"
                  />
                </client-only>
              </div>
              <div class="w-[calc(100%-65px)] px-[5px]" @contextmenu.prevent="openUserOperateMenu">
                <div class="flex justify-between items-center w-ful mb-[3px]">
                  {{ item.idx }}
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
        <p class="text-center">"{{ searchingFriend }}"</p>
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
// import { useAuth } from '@/store/auth';
import { storeToRefs } from 'pinia';
import type { Friends } from '@/api/types/friend';
import { useNotification } from '@/store/notificationWebSocket';

const router = useRouter();
const friendsStore = useFriends();
const { friends, searchingFriend, totalFriends } = storeToRefs(friendsStore);

const chatStore = useChat();
const { getAllFriendsHandler } = friendsStore;

const websocketStore = useNotification();
const getUnReadCountHandlerClone = chatStore.getUnReadCountHandler.bind(null, friendsStore.friends);
websocketStore.subscribe({
  type: 'chatRoom',
  fnAry: [getUnReadCountHandlerClone, chatStore.getAllFriendsPreviewMessage]
});

onBeforeUnmount(() => {
  websocketStore.unSubscribe({
    type: 'chatRoom',
    fnAry: [getUnReadCountHandlerClone, chatStore.getAllFriendsPreviewMessage]
  });
});

// 好友大頭照處理
const publicPath = computed(() => useRuntimeConfig().public.publicPath);
const getDefaultImg = (event: Event) => ((event.target as HTMLImageElement).src = '/images/testUser1.jpg'); // 设置为默认图片

await getAllFriendsHandler({
  page: 1,
  pageSize: 10
});

// const { data: friendsData } = await useMyAsyncData('getAllFriendsHandler', async () => {
//   try {
//     const res = await getAllFriendsHandler({
//       page: 1,
//       pageSize: 10
//     });

//     return res;
//   } catch (error) {
//     console.log(error, 'friends error');
//     return error;
//   }
// });

// const showingFriendList = ref(friendsData.value?.data?.data || []);
const showingFriendList = ref<Friends[]>([...friends.value]);
const showNewFriendsData = async ({ page, pageSize }: { page: number; pageSize: number }) => {
  await getAllFriendsHandler({
    page,
    pageSize
  });

  showingFriendList.value.push(...friends.value);
};

const showPrevFriendsData = async ({ page, pageSize }: { page: number; pageSize: number }) => {
  await getAllFriendsHandler({
    page,
    pageSize
  });

  showingFriendList.value.unshift(...friends.value);
};

// await getRequestUsersHandler({
//   page: 1,
//   pageSize: 25
// });

const { data: previewMessagesObj } = await useMyAsyncData('getAllFriendsPreviewMessage', () =>
  chatStore.getAllFriendsPreviewMessage()
);

const { data: unReadCountData } = await useMyAsyncData('getUnReadCountHandler', () =>
  chatStore.getUnReadCountHandler(friends.value)
);
// onNuxtReady(() => {
//   init();
// });

watch(
  () => chatStore.previewMessage,
  (val) => {
    if (previewMessagesObj.value) {
      Object.entries(val).forEach(([key, val]) => {
        previewMessagesObj.value![key] = val;
      });
    }
  }
);

watch(
  () => chatStore.unReadCount,
  (val) => {
    if (previewMessagesObj.value) {
      Object.entries(val).forEach(([key, val]) => {
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
  }

  router.push({
    path: 'chatroom',
    query: {
      ...friend
    }
  });
};

const openUserOperateMenu = () => {
  console.log('開啟操作好友選單');
};
</script>
