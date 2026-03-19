<template>
  <div class="relative w-full h-full">
    <div class="h-[10%] w-full shadow sticky top-0 left-0 flex items-center">
      <div class="w-[50px] h-[50px] rounded-[50%] overflow-hidden mr-3">
        <NuxtImg
          preload
          crossorigin="anonymous"
          format="webp"
          :src="getDefaultAvatar(friendInfo?.avatars?.[0])"
          alt="avatar"
          class="w-full h-full object-cover"
        />
      </div>
      <p>{{ friendInfo?.userName }}</p>
    </div>
    <div class="flex flex-col overflow-scroll scrollbar-none w-full h-[90%]">
      <div class="relative flex-1 px-[30px] py-2 overflow-y-auto h-full">
        <template v-if="Number(messageRecordTotal) > 0">
          <VirtualList
            v-model:list="showingData"
            :perLoadNum="pageSize"
            :total="messageRecordTotal || 0"
            :listClass="'mb-5'"
            ref="chatroomDom"
            :maxPageCount="VIRTUALLIST_MAX_PAGE_COUNT"
            @loadNewData="showNewRecordData"
            @loadPrevData="showPrevRecordData"
            :isReverse="true"
          >
            <template v-slot="{ item, index }">
              <div
                class="bg-black opacity-5 text-white rounded-[10px] mx-auto w-fit p-[5px] mb-[3px]"
                v-show="showDate(showingData[index - 1]?.sendTime, item.sendTime)"
              >
                <p class="text-[12px]">
                  {{ moment(item.sendTime).format('MM/DD') }}
                </p>
              </div>
              <div
                :class="[
                  'max-w-[70%] rounded-lg p-3 shadow relative chatBoxHorn',
                  isSelf(item) ? 'bg-primary text-white ml-auto chatBoxHorn__right' : 'bg-secondary chatBoxHorn__left'
                ]"
              >
                <p class="text-sm">{{ item.message }}</p>
                <p :class="[isSelf(item) ? 'text-gray-300' : 'text-gray-500', 'text-xs mt-1 text-right']">
                  {{ moment(item.sendTime).format('HH:mm') }}
                </p>
              </div>
            </template>
          </VirtualList>
        </template>
        <div class="flex justify-center items-end w-full h-full" v-else>
          <p>快點開始你們的話題吧</p>
        </div>
      </div>
      <div
        v-show="isNewMessageTipsShow"
        class="bg-[rgba(0,0,0,0.5)] text-white px-4 py-2 cursor-pointer"
        @click="handleClickMessageTip"
      >
        {{ messageRecordQueryData.at(-1)?.message }}
      </div>
      <div class="p-4 bg-secondary">
        <div class="flex">
          <input
            type="text"
            placeholder="輸入消息..."
            maxlength="5000"
            class="flex-1 p-2 rounded-l-md border border-gray-300 focus:outline-none focus:border-blue-500"
            v-model="waitToSendMessage"
          />
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none"
            @click="sendMessageHandler"
          >
            發送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@/store/chat';
import type { Message, WsMessage } from '@/api/types/chat';
import moment from 'moment';
import { markAsReadApi } from '@/api/modules/chat';
import VirtualList from '@/components/virtualList/index.vue';
import { getFriend } from '@/api/modules/friend';
import type { Friends } from '@/api/types/friend';
import { WsChannel } from '~/enums/websocket';
import { cloneDeep } from 'lodash-es';

const routes = useRoute();
const focusFriend = computed(() => ({
  uuid: routes.query.uuid as string
}));
const pageSize = 20;

const chatStore = useChat();

const { sendMessage } = chatStore;

const { getMessageRecordQuery, updateQuery } = useMessageQuery();

const { data: friendData } = await useMyAsyncData(
  'friend',
  async () => await getFriend({ uuid: focusFriend.value.uuid })
);

const friendInfo = computed(() => friendData?.value?.data?.data);
const { userInfoRes } = useUserInfoQuery();
const chatroomDom = useTemplateRef('chatroomDom');

let messageTipsTimeout: ReturnType<typeof setTimeout> | null = null;
const bottomDistanceCalc = () => {
  if (!chatroomDom.value) return 0;
  const { scrollTop, clientHeight, scrollHeight } = chatroomDom.value.virtualWrap!;
  const toButtonDistance = Math.abs(scrollHeight - clientHeight - scrollTop);

  return toButtonDistance;
};

const scrollToBottom = async () => {
  // 必須等待 nextTick，否則高度會是加入新訊息之前的舊高度
  await nextTick();
  if (chatroomDom.value?.virtualWrap) {
    chatroomDom.value.virtualWrap.scrollTo({
      top: chatroomDom.value.virtualWrap.scrollHeight
      // behavior: 'smooth' // 使用 'smooth' 有平滑滾動效果，若要瞬間到位則用 'auto'
    });
  }
};

// 新訊息提示框
const isNewMessageTipsShow = ref(false);
const toggleNewMessageTipsHandler = () => {
  // 若已經接近底部就直接滑到底
  if (bottomDistanceCalc() < 100) {
    scrollToBottom();
    return;
  }

  if (messageTipsTimeout) {
    clearTimeout(messageTipsTimeout);
  }
  isNewMessageTipsShow.value = true;

  messageTipsTimeout = setTimeout(() => {
    isNewMessageTipsShow.value = false;
  }, 3000);
};

const isSelf = (record: Message) => record.senderId === userInfoRes.value?.data?.uuid;

const updateMessageRecord = (body: { user?: Friends; message: Message[] }) => {
  updateQuery({
    newMessage: body.message,
    senderId: body.message[0].senderId,
    receiverId: body.message[0].receiverId
  });
};
const waitToSendMessage = ref('');
const sendMessageHandler = () => {
  if (!waitToSendMessage.value) return;
  const newMessage = {
    receiverId: focusFriend.value.uuid as string,
    senderId: userInfoRes.value?.data?.uuid as string,
    message: waitToSendMessage.value,
    sendTime: Date.now()
  };

  sendMessage([newMessage]);

  if (userInfoRes.value?.data) {
    // 樂觀更新
    const lastShowingIdx = showingData.value.at(-1)?.idx;
    const lastRecordIdx = messageRecordQueryData.value.at(-1)?.idx;
    const isViewingLatest = lastShowingIdx === lastRecordIdx;

    const prevLen = messageRecordQueryData.value.length;
    updateMessageRecord({ message: [newMessage] });

    if (isViewingLatest) {
      showingData.value.push(...messageRecordQueryData.value.slice(prevLen));
    }
    scrollToBottom();
  }

  waitToSendMessage.value = '';
};

const handleClickMessageTip = () => {
  if (messageTipsTimeout) {
    clearTimeout(messageTipsTimeout);
  }
  isNewMessageTipsShow.value = false;

  scrollToBottom();
};
const showDate = (start: number, end: number) => {
  if (!start) {
    return false;
  }

  const startDay = moment(start).day();
  const endDay = moment(end).day();

  return endDay - startDay > 0;
};

onBeforeRouteLeave(() => {
  markAsReadApi({
    senderId: focusFriend.value.uuid as string,
    sendTime: Math.ceil(Date.now() / 1000)
  });
});

// virtual list
const VIRTUALLIST_MAX_PAGE_COUNT = 4;

const { data: messageRecordRes, fetchNextPage } = getMessageRecordQuery({
  senderId: userInfoRes.value?.data?.uuid as string,
  receiverId: focusFriend.value.uuid as string,
  pageSize
});
const messageRecordTotal = computed(() => messageRecordRes.value?.total);

const showingData = ref<(Message & { idx: string })[]>([]);

const messageRecordQueryData = computed<(Message & { idx: string })[]>(() => messageRecordRes.value?.messages || []);

const showNewRecordData = async ({ page, pageSize }: { page: number; pageSize: number }) => {
  const cloneData = messageRecordQueryData.value.slice(pageSize * (page - 1), pageSize * (page + 1));

  showingData.value.push(...cloneData);
};

const unWatch = watch(
  messageRecordQueryData,
  (val) => {
    if (showingData.value.length === 0) {
      showingData.value = cloneDeep(val);
    } else {
      unWatch();
    }
  },
  {
    immediate: true
  }
);

const debounceFetchNextPage = useDebounceFn(fetchNextPage, 10);
const showPrevRecordData = async ({ pageSize }: { page: number; pageSize: number }) => {
  await debounceFetchNextPage(); // 取得先前紀錄
  const cloneData = cloneDeep(messageRecordQueryData.value.slice(0, pageSize));
  showingData.value.unshift(...cloneData);
};

const chatRoomHandler = (body: WsPayload<WsMessage>) => {
  if (routes.query?.uuid !== body.data.user?.uuid) return;

  try {
    const lastShowingIdx = showingData.value.at(-1)?.idx;
    const lastRecordIdx = messageRecordQueryData.value.at(-1)?.idx;
    const isViewingLatest = lastShowingIdx === lastRecordIdx;

    const prevLen = messageRecordQueryData.value.length;
    updateMessageRecord({ message: body.data.message });

    if (isViewingLatest) {
      showingData.value.push(...messageRecordQueryData.value.slice(prevLen));
    }

    toggleNewMessageTipsHandler();
  } catch (error) {
    console.error(`Error in BroadcastChannel handler for type ${WsChannel.ChatRoom}:`, error);
  }
};

useWsChannel([{ type: WsChannel.ChatRoom, handler: chatRoomHandler }]);

// watch(
//   messageRecordQueryData,
//   (val) => {
//     if (val.length > 0) {
//       scrollToBottom();
//     }
//   },
//   { immediate: true, flush: 'post', once: true }
// );
</script>
