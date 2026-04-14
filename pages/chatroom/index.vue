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
      <div class="relative flex-1 px-5 py-2 overflow-y-auto h-full">
        <template v-if="Number(messageRecordTotal) > 0">
          <VirtualList
            :totalData="allMessageData"
            :perLoadNum="pageSize"
            :total="messageRecordTotal || 0"
            :listClass="'mb-5'"
            ref="chatroomDom"
            :maxPageCount="VIRTUALLIST_MAX_PAGE_COUNT"
            :fetchPrevHandler="showPrevRecordData"
            :isReverse="true"
          >
            <template v-slot="{ item, index }">
              <!-- 訊息時間 tag -->
              <div
                class="bg-black opacity-5 text-white rounded-[10px] mx-auto w-fit p-[5px] mb-[3px]"
                v-show="showDate(messageRecordQueryData[index - 1]?.sendTime, item.sendTime)"
              >
                <p class="text-[12px]">
                  {{ moment(item.sendTime * 1000).format('MM/DD') }}
                </p>
              </div>
              <div
                :class="[
                  'w-full flex items-center',
                  userInfoRes?.data?.uuid === item.senderId ? 'justify-end' : 'justify-start'
                ]"
              >
                <!-- 發送訊息失敗重發按鈕 -->
                <template v-if="item.status === 'failed'">
                  <ClientOnly>
                    <BaseButton
                      styleType="neutral"
                      @click="() => openResendMessageConfirmBox(item)"
                      class="w-[18px] h-[18px] rounded-[50%] mr-1"
                    >
                      <font-awesome-icon :icon="['fa', 'rotate-right']"></font-awesome-icon>
                    </BaseButton>
                  </ClientOnly>
                </template>
                <div
                  :class="[
                    'w-[70%] rounded-lg p-3 shadow relative chatBoxHorn',
                    isSelf(item) ? 'bg-primary text-white chatBoxHorn__right' : 'bg-secondary chatBoxHorn__left'
                  ]"
                >
                  <p v-if="item.type === 'text' || item.status === 'failed'" class="text-sm">{{ item.message }}</p>
                  <div v-else-if="item.type === 'image'">
                    <img :src="item.thumbnailUrl" alt="圖片預覽" />
                    <p>{{ loadedProgress }}</p>
                  </div>
                  <p :class="[isSelf(item) ? 'text-gray-300' : 'text-gray-500', 'text-xs mt-1 text-right']">
                    {{ moment(item.sendTime).format('HH:mm') }}
                  </p>
                </div>
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
          <button class="px-3 py-2 text-gray-500 hover:text-blue-500 focus:outline-none" @click="fileInputRef?.click()">
            <ClientOnly>
              <font-awesome-icon :icon="['fas', 'paperclip']" />
            </ClientOnly>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/webp,image/jpeg,image/png"
            class="hidden"
            @change="onUploadFileChange"
          />
          <input
            type="text"
            placeholder="輸入消息..."
            maxlength="5000"
            class="flex-1 p-2 border border-gray-300 focus:outline-none focus:border-blue-500"
            v-model="waitToSendMessage"
          />
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none"
            @click="($event) => sendMessageHandler()"
          >
            發送
          </button>
        </div>
      </div>
    </div>
    <Message
      v-if="resendConfirmModalConfig.status"
      title="重傳或刪除"
      :content="'請選擇要重新傳送還是刪除'"
      @close="() => (resendConfirmModalConfig.status = false)"
    >
      <template #footer>
        <div class="flex justify-end py-2">
          <BaseButton class="h-10 w-20 mr-3" @click="resendModalHandler('resend')">重傳</BaseButton>
          <BaseButton class="h-10 w-20" @click="resendModalHandler('remove')">刪除</BaseButton>
        </div>
      </template>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@/store/chat';
import type { Message, MessageStatus, WsMessage } from '@/api/types/chat';
import moment from 'moment';
import VirtualList from '@/components/virtualList/index.vue';
import { getFriend } from '@/api/modules/friend';
import type { Friends } from '@/api/types/friend';
import { WsChannel, WSCode } from '~/enums/websocket';
import { SendMessageDB } from '@/utils/indexedDB/sendMessage';
import { useNotification } from '~/store/notificationWebSocket';
import { useMessage } from '~/store/message';
import { initUploadApi, uploadChunkApi } from '@/api/modules/chat';
import { computeFileSHA256 } from '@/utils/crypto';

const routes = useRoute();
const focusFriend = computed(() => ({
  uuid: routes.query.uuid as string
}));
const pageSize = 20;

const chatStore = useChat();
const { sendMessage } = chatStore;

const webSocketStore = useNotification();

const messageStore = useMessage();

const { getMessageRecordQuery, updateMessageQuery } = useMessageQuery();

const messageDB = new SendMessageDB();
const failMessageHandler = useFailedMessages(messageDB);

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
  updateMessageQuery({
    newMessage: body.message,
    roomId: Number(routes.query.roomId)
  });
};

const resendConfirmModalConfig = ref<{
  status: boolean;
  message: Message | null;
}>({
  status: false,
  message: null
});

const openResendMessageConfirmBox = (message: Message) => {
  resendConfirmModalConfig.value.status = true;
  resendConfirmModalConfig.value.message = message;
};

const resendModalHandler = async (type: 'resend' | 'remove') => {
  const message = resendConfirmModalConfig.value.message;
  if (!message) return;

  switch (type) {
    case 'resend':
      sendMessageHandler({
        ...message,
        sendTime: Math.ceil(Date.now() / 1000)
      });
      break;
    case 'remove':
      await failMessageHandler.removeFailedMessage({ localId: message.localId! });
      await refreshFailMessages();
      break;
  }

  resendConfirmModalConfig.value.status = false;
  resendConfirmModalConfig.value.message = null;
};

const waitToSendMessage = ref('');

const sendMessageHandler = (message?: Message) => {
  if (message) {
    sendMessage({ roomId: Number(routes.query?.roomId), message: [toRaw(message)] });
    return;
  }

  if (!waitToSendMessage.value) return;

  const newMessage = {
    receiverId: focusFriend.value.uuid as string,
    senderId: userInfoRes.value?.data?.uuid as string,
    message: waitToSendMessage.value,
    sendTime: Math.ceil(Date.now() / 1000),
    status: 'sending' as MessageStatus,
    localId: crypto.randomUUID() as string,
    roomId: Number(routes.query.roomId)
  };

  sendMessage({ roomId: Number(routes.query?.roomId), message: [newMessage] });
  messageDB.add(newMessage);

  scrollToBottom();

  failMessageHandler.startMessageTimeout(newMessage).then(() => {
    refreshFailMessages();
  });

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

  const startDay = moment(start * 1000).day();
  const endDay = moment(end * 1000).day();

  return endDay - startDay > 0;
};

onBeforeRouteLeave(() => {
  webSocketStore.handleSend<{ roomId: number; sendTime: number }>({
    type: 'markAsRead',
    data: {
      roomId: Number(routes.query.roomId),
      sendTime: Math.ceil(Date.now() / 1000)
    }
  });
});

// virtual list
const VIRTUALLIST_MAX_PAGE_COUNT = 4;

const { data: messageRecordRes, fetchNextPage } = getMessageRecordQuery({
  roomId: Number(routes.query.roomId),
  pageSize
});

const failMessages = ref<(Message & { idx: string })[]>([]);

const refreshFailMessages = async () => {
  const res = await failMessageHandler.getAll(Number(routes.query.roomId));
  failMessages.value = res.map((message, idx) => ({
    ...message,
    idx: `${-1}-${idx}`
  }));
};

onMounted(() => {
  refreshFailMessages();
});

const messageRecordTotal = computed(() => (messageRecordRes.value?.total || 0) + failMessages.value.length);

const messageRecordQueryData = computed<(Message & { idx: string })[]>(() => messageRecordRes.value?.messages || []);
const allMessageData = computed<(Message & { idx: string })[]>(() => [
  ...(messageRecordRes.value?.messages || []),
  ...(failMessages.value || [])
]);
const debounceFetchNextPage = useDebounceFn(fetchNextPage, 100);
const showPrevRecordData = async () => {
  return await debounceFetchNextPage(); // 取得先前紀錄
};

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const selectedFile = ref<File | null>(null);
const loadedProgress = ref(0);
const onUploadFileChange = async (event: Event) => {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (fileInputRef.value) fileInputRef.value.value = '';
  if (!selectedFile.value) return;
  const url = URL.createObjectURL(selectedFile.value);
  try {
    await messageStore.openMessage({
      title: '圖片預覽',
      height: 'fit-content',
      content: h(
        'div',
        {
          style: 'display: flex; justify-content: center; align-items: center; height: 300px; overflow: hidden;'
        },
        [
          h('img', {
            src: url,
            alt: '上傳圖片預覽',
            style: 'height: 100%; object-fit: contain;'
          })
        ]
      )
    });

    const checksum = await computeFileSHA256(selectedFile.value);
    const initRes = await initUploadApi({
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      mimeType: selectedFile.value.type,
      checksum,
      receiverId: routes.query.uuid as string,
      roomId: Number(routes.query.roomId)
    });

    const perChunkSize = Math.pow(1024, 2) * 2; // 2MB;
    const file = selectedFile.value;
    const uploadId = initRes.data?.uploadId;
    if (!uploadId) {
      await messageStore.openMessage({
        title: '錯誤',
        content: '上傳失敗',
        type: 'error'
      });
      return;
    }

    loadedProgress.value = 0;
    let globalLoaded = 0;
    await useChunkUpload({
      perChunkSize,
      fileSize: file.size,
      uploadApi: async ({ start, end, fileSize }) =>
        uploadChunkApi({
          uploadId,
          chunkIndex: Math.floor(start / perChunkSize),
          chunk: file.slice(start, end),
          globalStart: start,
          globalEnd: end,
          fileSize,
          onUploadProgress: ({ loaded }: { loaded: number; total: number }) => {
            globalLoaded = start + loaded;
            loadedProgress.value = Math.floor((globalLoaded / fileSize) * 100);
          }
        })
    });
  } catch (error) {
    console.error('上傳失敗:', error);
  } finally {
    selectedFile.value = null;
    URL.revokeObjectURL(url);
  }
};

const chatRoomHandler = (body: WsPayload<WsMessage>) => {
  const isCurrentRoomMessage = Number(routes.query?.roomId) === body.data?.roomId;
  const alreadyUpdate = !isSelf(body.data.message[0]) || (isSelf(body.data.message[0]) && body.code === WSCode.PENDING);

  if (isCurrentRoomMessage && alreadyUpdate) {
    try {
      updateMessageRecord({ message: body.data.message });
      toggleNewMessageTipsHandler();
    } catch (error) {
      console.error(`Error in BroadcastChannel handler for type ${WsChannel.ChatRoom}:`, error);
    }
  }
};

// 實作 fail message 排到訊息最後
useWsChannel([
  {
    type: WsChannel.ChatRoom,
    handler: [
      chatRoomHandler,
      async (data: WsPayload<WsMessage>) => {
        const msg = data.data?.message[0];
        if (!msg?.localId || !isSelf(msg)) return;

        if (data.code === WSCode.SUCCESS) {
          await failMessageHandler.markMessageSuccess({
            localId: msg.localId,
            roomId: msg.roomId
          });
        }

        if (data.code === WSCode.FAIL) {
          await failMessageHandler.markMessageFailed({
            localId: msg.localId,
            roomId: msg.roomId
          });
        }

        refreshFailMessages();
      }
    ]
  }
]);

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
