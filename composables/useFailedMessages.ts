import { SendMessageDB } from '@/utils/indexedDB/sendMessage';
import type { Message, MessageStatus } from '~/api/types/chat';

export function useFailedMessages() {
  const messageDB = new SendMessageDB();
  const timeoutQueue: ReturnType<typeof setTimeout>[] = [];
  const { updateMessageQueryStatus } = useMessageQuery();

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

  const markMessageSuccess = async ({ localId, roomId }: { localId: string; roomId: number }) => {
    await clearTracking({ localId });
    updateMessageQueryStatus({ localId, status: 'success', roomId });
  };

  const markMessageFailed = async ({ localId, roomId }: { localId: string; roomId: number }) => {
    try {
      // removeMessageFromQuery({ localId, senderId, receiverId });
      updateMessageQueryStatus({ localId, status: 'failed', roomId });
      await updateDBStatus({ localId, status: 'failed' });
    } catch (error) {
      console.log(`markMessageFailed fail: ${error}`);
    }
  };

  const startMessageTimeout = ({ localId, roomId }: { localId: string; roomId: number }) => {
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        await markMessageFailed({ localId, roomId });

        resolve('');
      }, 8000);

      timeoutQueue.push(timer);
    });
  };

  const removeFailedMessage = async ({ localId }: { localId: string }) => {
    try {
      await messageDB.removeByLocalId(localId);
    } catch (error) {
      console.log(`removeFailedMessage fail: ${error}`);
    }
  };

  return {
    getAll,
    clearTracking,
    markMessageSuccess,
    markMessageFailed,
    startMessageTimeout,
    removeFailedMessage,
    addFailMessage
  };
}
