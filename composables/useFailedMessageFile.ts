import { FailMessageFileDB, type FailMessageFile } from '@/utils/indexedDB/failedMessageFile';

export function useFailedMessagesFile() {
  const failMessageFileDB = new FailMessageFileDB();

  const getByRoomId = async (roomId: number) => {
    try {
      const res = await failMessageFileDB.getByKey({
        key: 'roomId',
        value: roomId
      });

      return res.filter((item) => item.status === 'failed');
    } catch (error) {
      return [];
    }
  };

  const getByUploadId = async (uploadId: string) => {
    try {
      const res = await failMessageFileDB.getByKey({
        key: 'uploadId',
        value: uploadId
      });

      return res.filter((item) => item.status === 'failed');
    } catch (error) {
      return [];
    }
  };

  const setFile = async (data: FailMessageFile) => {
    try {
      await failMessageFileDB.add(data);
    } catch (error) {
      console.error('fail message file setFile error:', error);
    }
  };

  const updateStatusByUploadId = async (uploadId: string, status: 'pending' | 'failed') => {
    try {
      await failMessageFileDB.update(uploadId, status);
    } catch (error) {
      console.error('fail message file updateStatusByUploadId error:', error);
    }
  };

  const removeByLocalId = async (localId: string) => {
    try {
      await failMessageFileDB.removeByKey({ key: 'localId', value: localId });
    } catch (error) {
      console.error('fail message file removeByLocalId error:', error);
    }
  };

  const markSendingAsFailed = async (roomId: number) => {
    try {
      await failMessageFileDB.markSendingAsFailed(roomId);
    } catch (error) {
      console.error('fail message file markSendingAsFailed error:', error);
    }
  };

  const markAllSendingAsFailed = async () => {
    try {
      await failMessageFileDB.markAllSendingAsFailed();
    } catch (error) {
      console.error('fail message file markAllSendingAsFailed error:', error);
    }
  };

  return {
    getByRoomId,
    getByUploadId,
    setFile,
    updateStatusByUploadId,
    removeByLocalId,
    markSendingAsFailed,
    markAllSendingAsFailed
  };
}
