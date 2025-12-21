import { defineStore } from 'pinia';
import { useNotification } from '@/store/notificationWebSocket';
import type { Message, GetMessageRecord } from '~/api/types/chat';
import { getMessageRecordApi, getUnreadCount, getPreviewMessageApi } from '@/api/modules/chat';
import type { PreviewMessage } from '@/api/types/chat';

export const useChat = defineStore('chat', () => {
  const webSocketStore = useNotification();
  const messageRecord = ref<Message[]>([]);
  const unReadCount = ref<Record<string, { count: number }>>({});
  const previewMessage = ref<PreviewMessage>({});

  const getMessageRecord = async ({ senderId, receiverId, page, pageSize }: GetMessageRecord) => {
    const res = await getMessageRecordApi({
      senderId,
      receiverId,
      page,
      pageSize
    });

    if (res.data?.data) {
      messageRecord.value = res.data?.data;
    }
  };

  const updateMessageRecord = (message: Message[]) => {
    messageRecord.value.push(...message);
  };

  const sendMessage = (message: Message[]) => {
    webSocketStore.handleSend<Message[]>({
      type: 'chatRoom',
      data: message
    });
  };

  const getUnReadCountHandler = async (friendIds: string[]) => {
    const res = await getUnreadCount({
      friendIds
    });
    unReadCount.value = res.data!;

    return res.data!;
  };

  const getAllFriendsPreviewMessage = async () => {
    const res = await getPreviewMessageApi();
    previewMessage.value = res.data!;
    return res.data;
  };

  return {
    messageRecord,
    unReadCount,
    previewMessage,
    getMessageRecord,
    updateMessageRecord,
    sendMessage,
    getUnReadCountHandler,
    getAllFriendsPreviewMessage
  };
});
