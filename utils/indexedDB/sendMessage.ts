import { BaseIndexedDB } from '@/utils/indexedDB/baseDB';
import type { Message } from '~/api/types/chat';

export class SendMessageDB extends BaseIndexedDB {
  constructor() {
    super({
      dbName: 'myDate',
      storeName: 'failMessage',
      version: 1,
      indexes: [
        { name: 'status', keyPath: 'status', unique: false },
        { name: 'localId', keyPath: 'localId', unique: true },
        { name: 'senderId', keyPath: 'senderId', unique: false },
        { name: 'receiverId', keyPath: 'receiverId', unique: false },
        { name: 'createdAt', keyPath: 'createdAt', unique: false }
      ]
    });
  }

  async getAll() {
    const result = await this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.getAll()
    });

    return result;
  }

  add(message: Message) {
    return this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.add(message)
    });
  }

  async get({ index, partial }: { index: keyof Message; partial: Partial<Message> }) {
    const result = await this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.index(index).get(partial.localId!)
    });

    return result;
  }

  async removeByLocalId(localId: string | undefined) {
    if (!localId) return;
    const key = await this.runTransaction<IDBValidKey | undefined>({
      mode: 'readonly',
      fn: (store) => store.index('localId').getKey(localId)
    });

    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.delete(key as IDBValidKey)
    });
  }

  async update({ id, partial }: { id: string; partial: Partial<Message> }) {
    const existing = await this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.get(id)
    });

    if (!existing) return;

    const data = {
      ...existing,
      ...partial
    };
    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.put(data)
    });
  }
}
