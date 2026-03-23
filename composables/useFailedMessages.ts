import type { SendMessageDB } from '@/utils/indexedDB/sendMessage';
import type { MessageStatus } from '~/api/types/chat';

export function useFailedMessages(messageDB: SendMessageDB) {
  const timeoutQueue: ReturnType<typeof setTimeout>[] = [];
  const { updateMessageQueryStatus } = useMessageQuery();

  const getAll = async () => {
    const res = await messageDB.getAll();

    return res;
  };

  const remove = ({ localId }: { localId: string }) => {
    messageDB.removeByLocalId(localId);
    const timer = timeoutQueue.shift();
    clearTimeout(timer);
  };

  const handleSuccess = ({
    localId,
    senderId,
    receiverId
  }: {
    localId: string;
    senderId: string;
    receiverId: string;
  }) => {
    remove({ localId });
    updateMessageQueryStatus({ localId, status: 'success', senderId, receiverId });
  };

  const setStatus = async ({
    localId,
    status,
    senderId,
    receiverId
  }: {
    localId: string;
    status: MessageStatus;
    senderId: string;
    receiverId: string;
  }) => {
    try {
      updateMessageQueryStatus({
        localId,
        status,
        senderId,
        receiverId
      });

      const { id } = await messageDB.get({ index: 'localId', partial: { localId } });
      messageDB.update({
        id,
        partial: { status }
      });
    } catch (error) {
      console.log(`setStatus fail: ${error}`);
    }
  };

  const timeoutMeesage = async ({
    localId,
    senderId,
    receiverId
  }: {
    localId: string;
    status: MessageStatus;
    senderId: string;
    receiverId: string;
  }) => {
    const timer = setTimeout(() => {
      setStatus({
        localId,
        status: 'failed',
        senderId,
        receiverId
      });
    }, 8000);

    timeoutQueue.push(timer);
    console.log(timeoutQueue, 'timeoutQueue');
    console.log(timer, 'set time message');
  };

  return {
    getAll,
    remove,
    handleSuccess,
    setStatus,
    timeoutMeesage
  };
}
