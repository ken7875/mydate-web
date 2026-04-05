import { defineStore } from 'pinia';
import { useNotification } from '@/store/notificationWebSocket';
import type { Message } from '~/api/types/chat';
import { getUnreadCount, getUnreadTotal, getPreviewMessageApi } from '@/api/modules/chat';
import type { PreviewMessage } from '@/api/types/chat';
import { WsChannel, WSCode } from '~/enums/websocket';

export const useChat = defineStore('chat', () => {
  const webSocketStore = useNotification();
  const messageRecord = ref<Message[]>([]);
  const unReadCount = ref<Record<string, { count: number }>>({});
  const totalUnreadCount = ref(0);
  const previewMessage = ref<PreviewMessage>({});

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

  const sendMessage = ({ roomId, message }: { roomId: number; message: Message[] }) => {
    webSocketStore.notify({ type: WsChannel.ChatRoom, data: { roomId, message }, code: WSCode.PENDING });
    webSocketStore.handleSend<Message[]>({
      type: 'chatRoom',
      data: message
    });
  };

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

  const getAllFriendsPreviewMessage = async () => {
    const res = await getPreviewMessageApi();
    previewMessage.value = res.data!;
    console.log(previewMessage.value, 'previewMessage.value');
    return res.data;
  };

  return {
    messageRecord,
    unReadCount,
    previewMessage,
    // messageRecordTotal,
    // getMessageRecord,
    // updateMessageRecord,
    sendMessage,
    getUnReadCountHandler,
    getTotalUnreadCount,
    incrementTotalUnreadCount,
    totalUnreadCount,
    incrementUnReadCount,
    resetUnReadCount,
    getAllFriendsPreviewMessage
  };
});
