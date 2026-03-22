import { BaseIndexedDB } from '@/utils/indexedDB/baseDB';
import type { Message } from '~/api/types/chat';

export class SendMessageDB extends BaseIndexedDB {
  constructor() {
    super({
      dbName: 'hotdate_chat',
      storeName: 'sendMessageRequests',
      version: 1,
      indexes: [
        { name: 'status', keyPath: 'status', unique: false },
        { name: 'localId', keyPath: 'localId', unique: true },
        { name: 'createdAt', keyPath: 'createdAt', unique: false }
      ]
    });
  }

  add(message: Message) {
    return this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.add(message)
    });
  }

  async deleteByLocalId(localId: string) {
    const key = await this.runTransaction<IDBValidKey | undefined>({
      mode: 'readonly',
      fn: (store) => store.index('localId').getKey(localId)
    });
    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.delete(key as IDBValidKey)
    });
  }
}
