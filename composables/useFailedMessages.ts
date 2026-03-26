import type { SendMessageDB } from '@/utils/indexedDB/sendMessage';
import type { MessageStatus } from '~/api/types/chat';

export function useFailedMessages(messageDB: SendMessageDB) {
  const timeoutQueue: ReturnType<typeof setTimeout>[] = [];
  const { updateMessageQuery, updateMessageQueryStatus, removeMessageFromQuery } = useMessageQuery();

  const getAll = async () => {
    try {
      const res = await messageDB.getAll();

      return res;
    } catch (error) {
      console.log(error, 'get messageDB failed!!');
      return [];
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

  const markMessageSuccess = async ({
    localId,
    senderId,
    receiverId
  }: {
    localId: string;
    senderId: string;
    receiverId: string;
  }) => {
    const dbMessage = await messageDB.get({ index: 'localId', partial: { localId } });

    await clearTracking({ localId });

    if (dbMessage?.status === 'failed') {
      updateMessageQuery({ newMessage: [{ ...dbMessage, status: 'success' }], senderId, receiverId });
    } else {
      updateMessageQueryStatus({ localId, status: 'success', senderId, receiverId });
    }
  };

  const markMessageFailed = async ({
    localId,
    senderId,
    receiverId
  }: {
    localId: string;
    senderId: string;
    receiverId: string;
  }) => {
    try {
      removeMessageFromQuery({ localId, senderId, receiverId });
      await updateDBStatus({ localId, status: 'failed' });
    } catch (error) {
      console.log(`markMessageFailed fail: ${error}`);
    }
  };

  const startMessageTimeout = ({
    localId,
    senderId,
    receiverId
  }: {
    localId: string;
    senderId: string;
    receiverId: string;
  }) => {
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        await markMessageFailed({ localId, senderId, receiverId });

        resolve('');
      }, 8000);

      timeoutQueue.push(timer);
    });
  };

  return {
    getAll,
    clearTracking,
    markMessageSuccess,
    markMessageFailed,
    startMessageTimeout
  };
}
