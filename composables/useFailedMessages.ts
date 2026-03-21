import type { MaybeRefOrGetter } from 'vue';
import type { Message } from '@/api/types/chat';
import { openDB, addItem, getAllByIndex, deleteItem, DB_NAME, STORE_NAME } from '@/utils/indexedDB/index';
import { useChat } from '@/store/chat';

type FailedMessage = Message & { status: 'failed'; localId: string };

interface Options {
  receiverId: MaybeRefOrGetter<string>;
  senderId: MaybeRefOrGetter<string>;
}

export function useFailedMessages(options: Options) {
  const chatStore = useChat();
  const failedMessages = ref<FailedMessage[]>([]);

  let db: IDBDatabase | null = null;
  let dbError = false;

  const getDB = async (): Promise<IDBDatabase | null> => {
    if (dbError) return null;
    if (db) return db;
    try {
      db = await openDB(DB_NAME, STORE_NAME, 1);
      return db;
    } catch {
      dbError = true;
      return null;
    }
  };

  /**
   * 從 IndexedDB 載入當前聊天對象（receiverId）的所有失敗訊息。
   * 使用 receiverId index 查詢，確保只載入當前聊天室的失敗訊息，
   * 避免顯示其他聊天對象的失敗訊息。
   */
  const loadFailedMessages = async (): Promise<void> => {
    const receiverIdVal = toValue(options.receiverId);
    const database = await getDB();
    if (!database) return;

    try {
      const items = await getAllByIndex<FailedMessage>(database, STORE_NAME, 'receiverId', receiverIdVal);
      failedMessages.value = items;
    } catch {
      // IndexedDB 操作失敗時靜默處理
    }
  };

  const addFailedMessage = async (message: Message): Promise<void> => {
    const localId = message.localId || crypto.randomUUID();
    const failedMsg: FailedMessage = {
      ...message,
      localId,
      status: 'failed'
    };

    // 先更新記憶體狀態（樂觀更新）
    failedMessages.value = [...failedMessages.value, failedMsg];

    // 嘗試持久化到 IndexedDB
    const database = await getDB();
    if (!database) return;

    try {
      await addItem(database, STORE_NAME, failedMsg);
    } catch {
      // IndexedDB 操作失敗時保留記憶體狀態即可
    }
  };

  const removeFailedMessage = async (localId: string): Promise<void> => {
    failedMessages.value = failedMessages.value.filter((msg) => msg.localId !== localId);

    const database = await getDB();
    if (!database) return;

    try {
      await deleteItem(database, STORE_NAME, localId);
    } catch {
      // 靜默處理
    }
  };

  const resendMessage = async (localId: string): Promise<void> => {
    const target = failedMessages.value.find((msg) => msg.localId === localId);
    if (!target) return;

    const messageToSend: Message = {
      ...target,
      status: 'sending'
    };

    chatStore.sendMessage([messageToSend]);
    await removeFailedMessage(localId);
  };

  return {
    failedMessages,
    loadFailedMessages,
    addFailedMessage,
    removeFailedMessage,
    resendMessage
  };
}
