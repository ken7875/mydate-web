import { defineStore } from 'pinia';
import { useNotification } from '@/store/notificationWebSocket';
import type { Message, MessageStatus } from '~/api/types/chat';
import { getUnreadCount, getUnreadTotal, getPreviewMessageApi, cancelUploadApi } from '@/api/modules/chat';
import type { PreviewMessage } from '@/api/types/chat';
import { WsChannel, WSCode } from '~/enums/websocket';
export type UploadTask = {
  tmpUrl: string;
  controller: AbortController | null;
  uploadId: string | null;
  progress: number;
  status: MessageStatus;
  thumbWidth: number;
  thumbHeight: number;
};

export const useChat = defineStore('chat', () => {
  const webSocketStore = useNotification();
  const messageRecord = ref<Message[]>([]);
  const unReadCount = ref<Record<string, { count: number }>>({});
  const totalUnreadCount = ref(0);
  const previewMessage = ref<PreviewMessage>({});
  const uploadTasks = ref<Record<string, UploadTask>>({});

  // const getMessageRecord = async ({ senderId, receiverId, page, pageSize }: GetMessageRecord) => {
  //   const res = await getMessageRecordApi({
  //     senderId,
  //     receiverId,
  //     page,
  //     pageSize
  //   });

  //   if (res.data?.data) {
  //     res.data.data = res.data.data.map((item, index) => ({
  //       ...item,
  //       idx: `${page}` + `-${index}`
  //     }));
  //     messageRecord.value = res.data?.data;
  //   }

  //   return res;
  // };

  // const updateMessageRecord = (message: Message[]) => {
  //   messageRecord.value.push(...message);
  // };

  const sendMessage = useThrottleFn(({ roomId, message }: { roomId: number; message: Message[] }) => {
    webSocketStore.notify({ type: WsChannel.ChatRoom, data: { roomId, message }, code: WSCode.PENDING });
    webSocketStore.handleSend<Message[]>({
      type: 'chatRoom',
      data: message
    });
  }, 500);

  const getUnReadCountHandler = async (roomIds: number[]) => {
    const res = await getUnreadCount({ roomIds });
    // merge 而非覆蓋，避免載入更多好友時清除已有的未讀數
    unReadCount.value = { ...unReadCount.value, ...res.data! };
    return res.data!;
  };

  const getTotalUnreadCount = async () => {
    const res = await getUnreadTotal();
    totalUnreadCount.value = res.data?.total ?? 0;
  };

  const incrementTotalUnreadCount = () => {
    totalUnreadCount.value++;
  };

  const incrementUnReadCount = (roomId: number) => {
    if (!unReadCount.value[roomId]) {
      unReadCount.value[roomId] = { count: 0 };
    }
    unReadCount.value[roomId].count++;
  };

  const resetUnReadCount = (roomId: number) => {
    if (unReadCount.value[roomId]) {
      unReadCount.value[roomId].count = 0;
    }
  };

  const setReadCounterHandler = ({ roomId, friendId }: { roomId: number; friendId: string }) => {
    webSocketStore.handleSend<{ roomId: number; sendTime: number; uuid: string }>({
      type: 'markAsRead',
      data: {
        roomId,
        sendTime: Math.ceil(Date.now() / 1000),
        uuid: friendId
      }
    });

    resetUnReadCount(roomId);
  };

  const getAllFriendsPreviewMessage = async () => {
    const res = await getPreviewMessageApi();
    previewMessage.value = res.data!;

    return res.data;
  };

  const addUploadTask = (localId: string, tmpUrl: string, status: MessageStatus) => {
    uploadTasks.value[localId] = {
      tmpUrl,
      status,
      controller: null,
      uploadId: null,
      progress: 0,
      thumbWidth: 0,
      thumbHeight: 0
    };
  };

  const updateUploadTask = (localId: string, updates: Partial<Omit<UploadTask, 'tmpUrl'>>) => {
    if (uploadTasks.value[localId]) {
      uploadTasks.value[localId] = { ...uploadTasks.value[localId], ...updates };
    }
  };

  const clearUploadTask = (localId: string) => {
    const task = uploadTasks.value[localId];
    if (task?.tmpUrl) URL.revokeObjectURL(task.tmpUrl);
    delete uploadTasks.value[localId];
  };

  const $reset = () => {
    messageRecord.value = [];
    unReadCount.value = {};
    totalUnreadCount.value = 0;
    previewMessage.value = {};
    Object.keys(uploadTasks.value).forEach(clearUploadTask);
  };

  const abortUpload = async (localId: string) => {
    const task = uploadTasks.value[localId];
    task?.controller?.abort();

    if (task?.uploadId) {
      await cancelUploadApi(task.uploadId).catch((err) => console.error('cancel upload failed:', err));
    }

    clearUploadTask(localId);
  };

  return {
    messageRecord,
    unReadCount,
    previewMessage,
    totalUnreadCount,
    uploadTasks,
    // messageRecordTotal,
    // getMessageRecord,
    // updateMessageRecord,
    sendMessage,
    setReadCounterHandler,
    getUnReadCountHandler,
    getTotalUnreadCount,
    incrementTotalUnreadCount,
    incrementUnReadCount,
    resetUnReadCount,
    getAllFriendsPreviewMessage,
    addUploadTask,
    updateUploadTask,
    clearUploadTask,
    abortUpload,
    $reset
  };
});
