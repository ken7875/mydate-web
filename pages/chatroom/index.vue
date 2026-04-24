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
                  'w-full flex items-center flex-wrap',
                  userInfoRes?.data?.uuid === item.senderId ? 'justify-end' : 'justify-start'
                ]"
              >
                <!-- 發送訊息失敗重發按鈕（文字） -->
                <template v-if="item.status === 'failed' && item.type === 'text'">
                  <ClientOnly>
                    <BaseButton
                      styleType="neutral"
                      @click="() => openResendMessageConfirmBox(item)"
                      class="w-7 h-7 rounded-[50%] mr-1"
                    >
                      <font-awesome-icon :icon="['fa', 'rotate-right']"></font-awesome-icon>
                    </BaseButton>
                  </ClientOnly>
                </template>
                <div
                  :class="[
                    'w-[70%] rounded-lg p-3 shadow relative chatBoxHorn',
                    isSelf(item) ? 'bg-primary text-white chatBoxHorn__right' : 'bg-secondary chatBoxHorn__left',
                    { 'bg-transparent! shadow-none': item.type === 'image' }
                  ]"
                >
                  <template v-if="item.type === 'text'">
                    <p class="text-sm">{{ item.message }}</p>
                  </template>
                  <div class="w-full flex justify-end items-end gap-2" v-else-if="item.type === 'image'">
                    <div class="order-2">
                      <NuxtImg
                        :width="chatStore.uploadTasks[item.localId!].thumbWidth"
                        :height="chatStore.uploadTasks[item.localId!].thumbHeight"
                        v-if="isBlobUrl(item.messageImage?.thumbnailUrl ?? '')"
                        :src="item.messageImage?.thumbnailUrl"
                        class="rounded-lg cursor-pointer object-contain object-bottom-right"
                        alt="圖片預覽"
                        loading="lazy"
                        @click="openImageModal(item.messageImage?.thumbnailUrl ?? '')"
                      />
                      <NuxtImg
                        v-else
                        preload
                        :width="item.messageImage?.width"
                        :height="item.messageImage?.height"
                        crossorigin="anonymous"
                        format="webp"
                        :src="getDefaultAvatar(item.messageImage?.thumbnailUrl)"
                        class="rounded-lg cursor-pointer object-contain object-bottom-right"
                        alt="圖片預覽"
                        loading="lazy"
                        @click="openImageModal(item.messageImage?.originalUrl || item.messageImage?.thumbnailUrl || '')"
                      />
                    </div>
                    <ClientOnly>
                      <div class="order-1 w-7 h-full">
                        <BaseButton
                          v-if="item.status !== 'sending' && item.status !== 'failed'"
                          class="border-none bg-black/40 hover:bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                          @click.stop="
                            downloadImage(item.messageImage?.originalUrl || item.messageImage?.thumbnailUrl || '')
                          "
                        >
                          <font-awesome-icon :icon="['fas', 'download']" class="text-xs" />
                        </BaseButton>
                        <!-- 發送訊息失敗重發按鈕（圖片） -->
                        <BaseButton
                          v-if="item.status === 'failed'"
                          styleType="neutral"
                          @click="() => openResendMessageConfirmBox(item)"
                          class="w-7 h-7 rounded-[50%] mr-1"
                        >
                          <font-awesome-icon :icon="['fa', 'rotate-right']"></font-awesome-icon>
                        </BaseButton>
                      </div>
                    </ClientOnly>
                  </div>
                  <p :class="[isSelf(item) ? 'text-gray-300' : 'text-gray-500', 'text-xs mt-1 text-right']">
                    {{ moment(item.sendTime * 1000).format('HH:mm') }}
                  </p>
                  <div
                    class="w-full mt-2"
                    v-if="item.localId && chatStore.uploadTasks[item.localId]?.status === 'sending'"
                  >
                    <div class="flex gap-2">
                      <ProgressBar
                        class="flex-1"
                        :value="chatStore.uploadTasks[item.localId!].progress"
                        :max="100"
                        height="10px"
                        :direction="'rightToLeft'"
                      />
                      <ClientOnly>
                        <font-awesome-icon
                          :icon="['fas', 'xmark']"
                          class="text-sm text-gray-400"
                          @click="abortUpload(item.localId!)"
                        />
                      </ClientOnly>
                    </div>
                  </div>
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
    <Modal v-model:isOpen="imageModalOpen" :needOperationBtn="false" v-if="imageModalOpen">
      <NuxtImg
        :src="imageModalUrl"
        crossorigin="anonymous"
        format="webp"
        alt="原始圖片"
        class="w-full h-full object-contain"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@/store/chat';
import { MessageType, type Message, type MessageStatus, type WsMessage } from '@/api/types/chat';
import moment from 'moment';
import VirtualList from '@/components/virtualList/index.vue';
import { getFriend } from '@/api/modules/friend';
import type { Friends } from '@/api/types/friend';
import { WsChannel } from '~/enums/websocket';
import { useMessage } from '~/store/message';
import { initUploadApi, uploadChunkApi, getUploadStatusApi } from '@/api/modules/chat';
import { computeFileSHA256 } from '@/utils/crypto';
import { v4 as uuidv4 } from 'uuid';
import type { FailMessageFile } from '~/utils/indexedDB/failedMessageFile';

const Modal = defineAsyncComponent(() => import('@/components/modal/index.client.vue'));

const routes = useRoute();
const focusFriend = computed(() => ({
  uuid: routes.query.uuid as string
}));
const pageSize = 20;

const chatStore = useChat();
const { sendMessage } = chatStore;

const messageStore = useMessage();

const { getMessageRecordQuery, updateMessageQuery, removeMessageFromQuery, updateMessageQueryStatus } =
  useMessageQuery();

const failMessageHandler = useFailedMessages();
const failedMessageFileHandler = useFailedMessagesFile();

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
const isBlobUrl = (url: string) => url.startsWith('blob:');

const imageModalOpen = ref(false);
const imageModalUrl = ref('');

const openImageModal = (url: string) => {
  if (!url) return;
  imageModalUrl.value = isBlobUrl(url) ? url : getDefaultAvatar(url);
  imageModalOpen.value = true;
};

const downloadImage = async (url: string) => {
  if (!url) return;
  const src = isBlobUrl(url) ? url : getDefaultAvatar(url);
  const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `image_${Date.now()}`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const updateMessageRecord = (body: { user?: Friends; message: Message[] }) => {
  updateMessageQuery({
    newMessage: body.message,
    roomId: Number(routes.query.roomId)
  });
};

const resendConfirmModalConfig = ref<{
  status: boolean;
  message: Message | FailMessageFile | null;
  type: MessageType;
}>({
  status: false,
  message: null,
  type: MessageType['TEXT']
});

const openResendMessageConfirmBox = (message: Message) => {
  resendConfirmModalConfig.value.status = true;
  resendConfirmModalConfig.value.message = message;
  resendConfirmModalConfig.value.type = message.type;
};

const failMessages = ref<(Message & { idx: string })[]>([]);
const refreshFailMessages = async () => {
  const res = await failMessageHandler.getAll(Number(routes.query.roomId));
  failMessages.value = res.map((message, idx) => ({
    ...message,
    idx: `fail-msg-${idx}`
  }));
};

const failMessagesFiles = ref<(FailMessageFile & { idx: string })[]>([]);
const refreshFailMessageFiles = async () => {
  const res = await failedMessageFileHandler.getByRoomId(Number(routes.query?.roomId));
  res.forEach((message) => {
    chatStore.addUploadTask(message.localId!, URL.createObjectURL(message.file), message.status!);
  });

  failMessagesFiles.value = res.map((message, idx) => ({
    ...message,
    messageImage: {
      ...message.messageImage!,
      thumbnailUrl: chatStore.uploadTasks[message.localId!]!.tmpUrl
    },
    idx: `fail-file-${idx}`
  }));
};

const resendMessageHandler = async () => {
  const type = resendConfirmModalConfig.value.type;
  switch (type) {
    case 'text':
      sendMessageHandler({
        ...resendConfirmModalConfig.value.message!,
        sendTime: Math.ceil(Date.now() / 1000)
      });
      break;

    case 'image': {
      const message = resendConfirmModalConfig.value.message;
      if (!message?.localId) break;

      const failedFile = failMessagesFiles.value.find((f) => f.localId === message.localId);
      if (!failedFile) break;

      const { uploadId, file } = failedFile;

      const statusRes = await getUploadStatusApi(uploadId);
      const receivedBytes = statusRes.data?.receivedBytes ?? 0;
      const fileSize = statusRes.data?.fileSize ?? 0;

      const start = receivedBytes;
      const end = file.size - 1;
      let globalLoaded = receivedBytes;

      const controller = new AbortController();
      // if(chatStore.uploadTasks[message.localId]) {
      //   chatStore.updateUploadTask(message.localId, { controller, uploadId });
      // } else {
      //   chatStore.addUploadTask()
      // }
      chatStore.updateUploadTask(message.localId, { controller, uploadId, status: 'sending' });
      updateMessageQueryStatus({ localId: message.localId, status: 'sending', roomId: message.roomId });

      try {
        await uploadChunkApi({
          uploadId,
          localId: message.localId,
          chunk: file.slice(start),
          start,
          end,
          fileSize,
          signal: controller.signal,
          onUploadProgress: ({ loaded }: { loaded: number; total: number }) => {
            globalLoaded = start + loaded;
            chatStore.updateUploadTask(message.localId!, {
              progress: Math.floor((globalLoaded / file.size) * 100)
            });
          }
        });

        if (chatStore.uploadTasks[message.localId]?.progress === 100) {
          setTimeout(() => chatStore.clearUploadTask(message.localId!), 300);
          await failedMessageFileHandler.removeByLocalId(message.localId!);
          refreshFailMessageFiles();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') break;
        console.error('Resume upload failed:', error);
        await failedMessageFileHandler.updateStatusByUploadId(uploadId, 'failed');
        updateMessageQueryStatus({ localId: message.localId, status: 'failed', roomId: message.roomId });
      }
      break;
    }
  }
};

const removeResendMessageHandler = async (message: Message) => {
  const type = resendConfirmModalConfig.value.type;
  switch (type) {
    case 'text':
      refreshFailMessages();
      break;

    case 'image':
      await failedMessageFileHandler.removeByLocalId(message.localId!);
      refreshFailMessageFiles();
      break;
  }
};

const resendModalHandler = async (type: 'resend' | 'remove') => {
  const message = resendConfirmModalConfig.value.message;
  if (!message) return;

  switch (type) {
    case 'resend':
      resendMessageHandler();

      break;
    case 'remove':
      removeResendMessageHandler(message);
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
    localId: uuidv4() as string,
    roomId: Number(routes.query.roomId),
    type: MessageType['TEXT']
  };

  sendMessage({ roomId: Number(routes.query?.roomId), message: [newMessage] });
  failMessageHandler.addFailMessage(newMessage);

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
  chatStore.setReadCounterHandler({
    roomId: Number(routes.query.roomId),
    friendId: focusFriend.value.uuid
  });
});

// virtual list
const VIRTUALLIST_MAX_PAGE_COUNT = 4;

const { data: messageRecordRes, fetchNextPage } = getMessageRecordQuery({
  roomId: Number(routes.query.roomId),
  pageSize
});

onMounted(async () => {
  await failedMessageFileHandler.markSendingAsFailed(Number(routes.query.roomId));
  refreshFailMessages();
  refreshFailMessageFiles();
});

const messageRecordTotal = computed(() => (messageRecordRes.value?.total || 0) + failMessages.value.length);

const messageRecordQueryData = computed<(Message & { idx: string })[]>(() => messageRecordRes.value?.messages || []);
const allMessageData = computed<(Message & { idx: string })[]>(() => {
  return [
    ...(messageRecordRes.value?.messages || []),
    ...([...failMessages.value, ...failMessagesFiles.value].sort((a, b) => a.sendTime - b.sendTime) || [])
  ];
});

const debounceFetchNextPage = useDebounceFn(fetchNextPage, 100);
const showPrevRecordData = async () => {
  return await debounceFetchNextPage(); // 取得先前紀錄
};

const getImageNaturalSize = ({ localId }: { localId: string }): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    const img = new Image();
    const blobUrl = chatStore.uploadTasks[localId].tmpUrl;
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = blobUrl;
  });

const calcThumbnailSize = (originalWidth: number, originalHeight: number, maxSize = 400) => {
  const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight);
  return { width: Math.round(originalWidth * scale), height: Math.round(originalHeight * scale) };
};

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const selectedFile = ref<File | null>(null);
const onUploadFileChange = async (event: Event) => {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (fileInputRef.value) fileInputRef.value.value = '';
  if (!selectedFile.value) return;
  const localId = uuidv4() as string;
  const url = URL.createObjectURL(selectedFile.value);
  chatStore.addUploadTask(localId, url, 'sending');

  messageStore
    .openMessage({
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
    })
    ?.then(async () => {
      const start = 0;
      const end = selectedFile.value!.size - 1;
      let globalLoaded = 0;
      try {
        const file = selectedFile.value!;
        const naturalSize = await getImageNaturalSize({ localId });
        const { width: thumbWidth, height: thumbHeight } = calcThumbnailSize(naturalSize.width, naturalSize.height);
        chatStore.updateUploadTask(localId, { thumbWidth, thumbHeight });

        const checksum = await computeFileSHA256(file);
        const initRes = await initUploadApi({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          checksum,
          receiverId: routes.query.uuid as string,
          roomId: Number(routes.query.roomId),
          thumbWidth,
          thumbHeight
        });

        const uploadId = initRes.data?.uploadId;
        if (!uploadId) {
          await messageStore.openMessage({
            title: '錯誤',
            content: '上傳失敗',
            type: 'error'
          });
          return;
        }

        updateMessageRecord({
          message: [
            {
              receiverId: focusFriend.value.uuid as string,
              senderId: userInfoRes.value?.data?.uuid as string,
              message: waitToSendMessage.value,
              sendTime: Math.ceil(Date.now() / 1000),
              status: 'sending' as MessageStatus,
              localId,
              roomId: Number(routes.query.roomId),
              type: MessageType['IMAGE'],
              messageImage: {
                thumbnailUrl: chatStore.uploadTasks[localId].tmpUrl,
                originalUrl: '',
                blurHash: '',
                width: 0,
                height: 0,
                isExpired: false
              }
            }
          ]
        });

        const controller = new AbortController();
        chatStore.updateUploadTask(localId, { uploadId, controller });

        failedMessageFileHandler.setFile({
          receiverId: focusFriend.value.uuid as string,
          senderId: userInfoRes.value?.data?.uuid as string,
          uploadId: chatStore.uploadTasks[localId].uploadId as string,
          localId,
          message: '',
          roomId: Number(routes.query.roomId),
          sendTime: Math.ceil(Date.now() / 1000),
          file,
          status: 'sending',
          type: MessageType['IMAGE'],
          messageImage: {
            thumbnailUrl: '',
            originalUrl: '',
            blurHash: '',
            width: 0,
            height: 0,
            isExpired: false
          }
        });

        try {
          await uploadChunkApi({
            uploadId,
            localId,
            chunk: file,
            start: 0,
            end,
            fileSize: file.size,
            signal: controller.signal,
            onUploadProgress: ({ loaded }: { loaded: number; total: number }) => {
              globalLoaded = start + loaded;
              chatStore.updateUploadTask(localId, { progress: Math.floor((globalLoaded / file.size) * 100) });
            }
          });

          if (chatStore.uploadTasks[localId]?.progress === 100) {
            setTimeout(() => chatStore.clearUploadTask(localId), 300);
            await failedMessageFileHandler.removeByLocalId(localId);
            refreshFailMessageFiles();
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;

          console.error('上傳失敗:', error);
          console.warn('current loaded:', globalLoaded);
          await failedMessageFileHandler.updateStatusByUploadId(uploadId, 'failed');
          updateMessageQueryStatus({ localId, status: 'failed', roomId: Number(routes.query.roomId) });
          refreshFailMessageFiles();
        } finally {
          chatStore.clearUploadTask(localId);
        }
      } catch (error) {
        console.error('上傳前置作業失敗:', error);
      }
    })
    .catch(() => {
      selectedFile.value = null;
      chatStore.clearUploadTask(localId);
    });
};

const abortUpload = async (localId: string) => {
  await failedMessageFileHandler.removeByLocalId(localId!);
  await chatStore.abortUpload(localId);
  removeMessageFromQuery({ roomId: Number(routes.query.roomId), localId });
  await refreshFailMessageFiles();
  chatStore.clearUploadTask(localId);
};

const chatRoomHandler = (body: WsPayload<WsMessage>) => {
  try {
    updateMessageRecord({ message: body.data.message });
    toggleNewMessageTipsHandler();
  } catch (error) {
    console.error(`Error in BroadcastChannel handler for type ${WsChannel.ChatRoom}:`, error);
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

        // if (data.code === WSCode.SUCCESS) {
        //   await failMessageHandler.markMessageSuccess({
        //     localId: msg.localId,
        //     roomId: msg.roomId
        //   });

        //   if (chatStore.uploadTasks[msg.localId]?.tmpUrl) {
        //     chatStore.clearUploadTask(msg.localId);
        //   }
        // }

        // if (data.code === WSCode.FAIL) {
        //   await failMessageHandler.markMessageFailed({
        //     localId: msg.localId,
        //     roomId: msg.roomId
        //   });

        //   if (chatStore.uploadTasks[msg.localId]?.tmpUrl) {
        //     chatStore.clearUploadTask(msg.localId);
        //   }
        // }

        refreshFailMessages();
        refreshFailMessageFiles();
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
