<template>
  <div class="relative w-full h-full">
    <div class="h-[10%] w-full shadow sticky top-0 left-0 flex items-center">
      <div class="w-[50px] h-[50px] rounded-[50%] overflow-hidden mr-3">
        <ClientOnly>
          <img
            crossOrigin="anonymous"
            :src="publicPath + friendInfo?.avatars?.[0]"
            alt="friends avatar"
            class="block w-full h-full"
            @error="getDefaultAvatar"
          />
        </ClientOnly>
      </div>
      <p>{{ friendInfo?.userName }}</p>
    </div>
    <div class="flex flex-col overflow-scroll scrollbar-none w-full h-[90%]">
      <div class="relative flex-1 px-[30px] py-[8px] overflow-y-auto" v-show="isSuccess">
        <template v-if="Number(messageRecordTotal) > 0">
          <VirtualList
            v-model:list="messageRecordQueryData"
            :perLoadNum="pageSize"
            :total="messageRecordTotal || 0"
            :singleSide="true"
            :loadDown="false"
            :listClass="'mb-5'"
            ref="chatroomDom"
            @loadNewData="showNewRecordData"
          >
            <template v-slot="{ item, index }">
              <div
                class="bg-black opacity-5 text-white rounded-[10px] mx-auto w-fit p-[5px] mb-[3px]"
                v-show="showDate(messageRecordQueryData[index - 1]?.sendTime, item.sendTime)"
              >
                <p class="text-[12px]">
                  {{ moment(item.sendTime).format('MM/DD') }}
                </p>
              </div>
              <div
                :class="[
                  'max-w-[70%] rounded-lg p-3 shadow relative chatBoxHorn',
                  isSelf(item) ? 'bg-primary text-white ml-auto chatBoxHorn__right' : 'bg-white chatBoxHorn__left'
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
      <div class="p-4 bg-gray-200">
        <div class="flex">
          <input
            type="text"
            placeholder="輸入消息..."
            class="flex-1 p-2 rounded-l-md border border-gray-300 focus:outline-none focus:border-blue-500"
            v-model="waitToSendMessage"
          />
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none"
            @click="sendMessageHander"
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
// import { useFriends } from '@/store/friends';
import type { Message } from '@/api/types/chat';
import moment from 'moment';
import { markAsReadApi } from '@/api/modules/chat';
import { useNotification } from '@/store/notificationWebSocket';
import VirtualList from '@/components/virtualList/index.vue';
import { getFriend } from '@/api/modules/friend';
import type { Friends } from '@/api/types/friend';
import getDefaultAvatar from '@/utils/getDefaultAvatar';

const publicPath = computed(() => useRuntimeConfig().public.publicPath);
const routes = useRoute();
const focusFriend = computed(() => ({
  uuid: routes.query.uuid as string
}));
const pageSize = 20;

const chatStore = useChat();

const notificationStore = useNotification();
const { sendMessage } = chatStore;

const { data: friendData } = await useMyAsyncData(
  'friend',
  async () => await getFriend({ uuid: focusFriend.value.uuid })
);

const friendInfo = computed(() => friendData?.value?.data?.data);
const { userInfoRes } = useUserInfoQuery();
const chatroomDom = ref<InstanceType<typeof VirtualList> | null>(null);
const isNewMessageTipsShow = ref(false);
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

const toggleNewMessageTipsHandler = () => {
  // 若已經接近底部就直接滑到底
  console.log(bottomDistanceCalc());
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
    newMessage: body.message[0],
    senderId: body.message[0].senderId,
    receiverId: body.message[0].receiverId
  });
};
const waitToSendMessage = ref('');
const sendMessageHander = () => {
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
    updateMessageRecord({
      message: [newMessage]
    });
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

  let startDay = moment(start).day();
  let endDay = moment(end).day();

  return endDay - startDay > 0;
};

onBeforeRouteLeave(() => {
  markAsReadApi({
    senderId: focusFriend.value.uuid as string,
    sendTime: Math.ceil(Date.now() / 1000)
  });
});

// virtual list
const { getMessageRecordQuery, updateQuery } = useMessageQuery();

const {
  data: messageRecordRes,
  isSuccess,
  fetchPreviousPage
} = getMessageRecordQuery({
  senderId: userInfoRes.value?.data?.uuid as string,
  receiverId: focusFriend.value.uuid as string,
  pageSize
});
const messageRecordTotal = computed(() => messageRecordRes.value?.pages.at(-1)?.total);

const messageRecordQueryData = computed<(Message & { idx: string })[]>(() => {
  return (
    messageRecordRes.value?.pages.flatMap((page, pageIdx) =>
      (
        page?.data?.data?.map?.((item, index) => {
          const currentPage = messageRecordRes.value?.pageParams[pageIdx];
          return {
            ...item,
            idx: `${currentPage}` + `-${index}`
          };
        }) || []
      ).reverse()
    ) || []
  );
});

const showNewRecordData = () => {
  fetchPreviousPage();
};

const subscribeArys = [updateMessageRecord, toggleNewMessageTipsHandler];
onMounted(() => {
  notificationStore.subscribe({
    type: 'chatRoom',
    fnAry: subscribeArys
  });
});

onBeforeUnmount(() => {
  notificationStore.unSubscribe({
    type: 'chatRoom',
    fnAry: subscribeArys
  });
});

const unWatch = watch(
  messageRecordQueryData,
  (val) => {
    nextTick(() => {
      if (val.length > 0) {
        scrollToBottom();
        unWatch();
      }
    });
  },
  { immediate: true }
);
</script>
