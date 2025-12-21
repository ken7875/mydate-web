<template>
  <div class="full-screen-container flex flex-col overflow-scroll scrollbar-none">
    <div class="relative flex-1 p-[30px] overflow-y-auto" ref="chatroomDom">
      <!-- 聊天消息將在這裡顯示 -->
      <template v-if="hasChatRecord">
        <div v-for="(record, index) in messageRecord" :key="index" class="mb-4">
          <div
            class="bg-black opacity-5 text-white rounded-[10px] mx-auto w-fit p-[5px] mb-[3px]"
            v-show="showDate(messageRecord[index - 1]?.sendTime, record.sendTime)"
          >
            <p class="text-[12px]">
              {{ moment(record.sendTime).format('MM/DD') }}
            </p>
          </div>
          <div
            :class="[
              'max-w-[70%] rounded-lg p-3 shadow relative chatBoxHorn',
              isSelf(record) ? 'bg-primary text-white ml-auto chatBoxHorn__right' : 'bg-white chatBoxHorn__left'
            ]"
          >
            <p class="text-sm">{{ record.message }}</p>
            <p :class="[isSelf(record) ? 'text-gray-300' : 'text-gray-500', 'text-xs mt-1 text-right']">
              {{ moment(record.sendTime).format('HH:mm') }}
            </p>
          </div>
        </div>
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
      {{ messageRecord.at(-1)?.message }}
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
</template>

<script setup lang="ts">
import { useChat } from '@/store/chat';
import { storeToRefs } from 'pinia';
// import { FriendStatus } from '../../../enums/friend';
import type { Message } from '@/api/types/chat';
import moment from 'moment';
import { markAsReadApi } from '@/api/modules/chat';
import { useNotification } from '@/store/notificationWebSocket';

const routes = useRoute();
const focusFriend = computed(() => ({
  uuid: routes.query.uuid,
  status: routes.query.status,
  userName: routes.query.userName
}));
// const { getFriendById } = friendsStore;

const chatStore = useChat();
const notificationStore = useNotification();
const { sendMessage, getMessageRecord, updateMessageRecord } = chatStore;
const { messageRecord } = storeToRefs(chatStore);
// const isFriend = computed(() => foucsFriend.value?.status === FriendStatus.Success);

const { userInfoRes } = useUserInfoQuery();

watch(
  () => userInfoRes.value?.data?.uuid,
  (val) => {
    if (val) {
      getMessageRecord({
        senderId: val,
        receiverId: focusFriend.value.uuid as string,
        page: 1,
        pageSize: 100
      });
    }
  },
  {
    immediate: true
  }
);

const chatroomDom = ref<HTMLDivElement | null>(null);

const isNewMessageTipsShow = ref(false);
let messageTipsTimeout: ReturnType<typeof setTimeout> | null = null;
const buttonDistanceCalc = () => {
  if (!chatroomDom.value) return 0;
  const { scrollTop, clientHeight, scrollHeight } = chatroomDom.value;

  return Math.abs(scrollHeight - clientHeight - scrollTop);
};

const scrollToBottom = async () => {
  // 必須等待 nextTick，否則高度會是加入新訊息之前的舊高度
  await nextTick();
  if (chatroomDom.value) {
    chatroomDom.value.scrollTo({
      top: chatroomDom.value.scrollHeight,
      behavior: 'smooth' // 使用 'smooth' 有平滑滾動效果，若要瞬間到位則用 'auto'
    });
  }
};

const toggleNewMessageTipsHandler = () => {
  // if (buttonDistanceCalc() === 0) return;
  // 若已經接近底部就直接滑到底
  if (buttonDistanceCalc() < 50) {
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
onMounted(() => {
  notificationStore.subscribe({
    type: 'chatRoom',
    fnAry: [toggleNewMessageTipsHandler]
  });
});

// const addFriendHandler = async (status: 1 | 2) => {
//   try {
//     await setFriendStatus(status, foucsFriend.value.uuid);
//     await getFriendById(foucsFriend.value.uuid);
//   } catch (error) {
//     console.error(error, 'error');
//   }
// };

const hasChatRecord = computed(() => messageRecord.value.length > 0);
const isSelf = (record: Message) => record.senderId === userInfoRes.value?.data?.uuid;

const waitToSendMessage = ref('');
const sendMessageHander = () => {
  if (!waitToSendMessage.value) return;

  sendMessage([
    {
      receiverId: focusFriend.value.uuid as string,
      senderId: userInfoRes.value?.data?.uuid as string,
      message: waitToSendMessage.value,
      sendTime: Date.now()
    }
  ]);

  if (userInfoRes.value?.data) {
    // 樂觀更新
    updateMessageRecord([
      {
        senderId: userInfoRes.value.data.uuid as string,
        receiverId: focusFriend.value.uuid as string,
        message: waitToSendMessage.value,
        sendTime: Date.now()
      }
    ]);
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
</script>

<!-- <style scoped lang="scss">
.chatBoxHorn {
  &:before {
    content: '';
    position: absolute;
    width: 30px;
    height: 40px;
    background-color: white;
  }
  &:after {
    content: '';
    position: absolute;
    width: 17px;
    height: 40px;
    background-color: #e4e8eb;
  }
  &__left {
    &:before {
      bottom: 0px;
      top: -32px;
      left: -25px;
      z-index: -1;
      border-bottom-left-radius: 43px;
    }
    &:after {
      bottom: 0px;
      top: -23px;
      left: -12px;
      z-index: -2;
      border-bottom-left-radius: 20px;
    }
  }
  &__right {
    &:before {
      bottom: 0px;
      top: -32px;
      right: -25px;
      z-index: -1;
      border-bottom-right-radius: 43px;
    }
    &:after {
      bottom: 0px;
      top: -23px;
      right: -12px;
      z-index: -2;
      border-bottom-right-radius: 20px;
    }
  }
}
</style> -->
