import { SendMessageDB } from '@/utils/indexedDB/sendMessage';
import type { Message, MessageStatus } from '~/api/types/chat';
import { WSCode } from '~/enums/websocket';
import { useChat } from '@/store/chat';

export function useFailedMessages() {
  const messageDB = new SendMessageDB();
  const timeoutQueue: ReturnType<typeof setTimeout>[] = [];

  const getAll = async (roomId: number) => {
    try {
      const res = await messageDB.getByRoomId<Message>(roomId);
      return res.filter((item) => item.status === 'failed');
    } catch (error) {
      console.log(error, 'get messageDB failed!!');
      return [];
    }
  };

  const addFailMessage = (message: Message) => {
    try {
      messageDB.add(message);
    } catch (error) {
      console.log('addFailMessage error:', error);
    }
  };

  const clearTracking = async ({ localId }: { localId: string }) => {
    await messageDB.removeByLocalId(localId);
    const timer = timeoutQueue.shift();
    clearTimeout(timer);
  };

  const updateDBStatus = async ({ localId, status }: { localId: string; status: MessageStatus }) => {
    const { id } = await messageDB.get({ index: 'localId', partial: { localId } });

    await messageDB.update({ id, partial: { status } });
  };

  const markMessageSuccess = async ({ localId }: { localId: string }) => {
    await clearTracking({ localId });
  };

  const markMessageFailed = async ({ localId }: { localId: string }) => {
    try {
      // removeMessageFromQuery({ localId, senderId, receiverId });

      await updateDBStatus({ localId, status: 'failed' });
    } catch (error) {
      console.log(`markMessageFailed fail: ${error}`);
    }
  };

  const startMessageTimeout = ({ localId }: { localId: string }) => {
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        await markMessageFailed({ localId });

        resolve('');
      }, 8000);

      timeoutQueue.push(timer);
    });
  };

  const handleWsMessageStatus = async ({ code, localId }: { code: WSCode; localId: string }) => {
    const chatStore = useChat();

    if (code === WSCode.SUCCESS) {
      await markMessageSuccess({ localId });
    } else if (code === WSCode.FAIL) {
      await markMessageFailed({ localId });
    }

    if (chatStore.uploadTasks[localId]?.tmpUrl) {
      chatStore.clearUploadTask(localId);
    }
  };

  const removeFailedMessage = async ({ localId }: { localId: string }) => {
    try {
      await messageDB.removeByLocalId(localId);
    } catch (error) {
      console.log(`removeFailedMessage fail: ${error}`);
    }
  };

  const markAllSendingAsFailed = async () => {
    try {
      await messageDB.markAllSendingAsFailed();
    } catch (error) {
      console.log(`markAllSendingAsFailed fail: ${error}`);
    }
  };

  return {
    getAll,
    clearTracking,
    markMessageSuccess,
    markMessageFailed,
    handleWsMessageStatus,
    startMessageTimeout,
    removeFailedMessage,
    addFailMessage,
    markAllSendingAsFailed
  };
}
