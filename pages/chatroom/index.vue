<template>
  <div class="full-screen-container flex flex-col overflow-scroll scrollbar-none">
    <div class="relative flex-1 p-[30px] overflow-y-auto">
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
import { useAuth } from '@/store/auth';
import { storeToRefs } from 'pinia';
// import { FriendStatus } from '../../../enums/friend';
import type { Message } from '@/api/types/chat';
import moment from 'moment';
import { markAsReadApi } from '@/api/modules/chat';

const routes = useRoute();
const focusFriend = computed(() => ({
  uuid: routes.query.uuid,
  status: routes.query.status,
  userName: routes.query.userName
}));
// const { getFriendById } = friendsStore;

const authStore = useAuth();
const chatStore = useChat();
const { sendMessage, getMessageRecord, updateMessageRecord } = chatStore;
const { messageRecord } = storeToRefs(chatStore);
// const isFriend = computed(() => foucsFriend.value?.status === FriendStatus.Success);

onMounted(() => {
  getMessageRecord({
    senderId: authStore.userInfo!.uuid,
    receiverId: focusFriend.value.uuid as string,
    page: 1,
    pageSize: 100
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
const isSelf = (record: Message) => record.senderId === authStore.userInfo!.uuid;

const waitToSendMessage = ref('');
const sendMessageHander = () => {
  if (!waitToSendMessage.value) return;

  sendMessage([
    {
      // senderId: authStore.userInfo!.uuid,
      receiverId: focusFriend.value.uuid as string,
      message: waitToSendMessage.value,
      sendTime: Date.now()
    }
  ]);

  // 樂觀更新
  updateMessageRecord([
    {
      senderId: authStore.userInfo!.uuid as string,
      receiverId: focusFriend.value.uuid as string,
      message: waitToSendMessage.value,
      sendTime: Date.now()
    }
  ]);

  waitToSendMessage.value = '';
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
