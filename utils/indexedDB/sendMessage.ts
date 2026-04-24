import { BaseIndexedDB } from './baseDB';
import { getMyDateDB } from './myDateDB';
import type { Message } from '~/api/types/chat';

export class SendMessageDB extends BaseIndexedDB {
  constructor() {
    super('failMessage', getMyDateDB);
  }

  async getAll<T = unknown>(): Promise<T[]> {
    return this.runTransaction<T[]>({
      mode: 'readonly',
      fn: (store) => store.getAll()
    });
  }

  async getByRoomId<T = unknown>(roomId: number): Promise<T[]> {
    return this.runTransaction<T[]>({
      mode: 'readonly',
      fn: (store) => store.index('roomId').getAll(roomId)
    });
  }

  add(message: Message) {
    return this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.add(message)
    });
  }

  async get({ index, partial }: { index: keyof Message; partial: Partial<Message> }) {
    return this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.index(index).get(partial.localId!)
    });
  }

  async removeByLocalId(localId: string | undefined) {
    if (!localId) return;
    try {
      const key = await this.runTransaction<IDBValidKey | undefined>({
        mode: 'readonly',
        fn: (store) => store.index('localId').getKey(localId)
      });

      await this.runTransaction({
        mode: 'readwrite',
        fn: (store) => store.delete(key as IDBValidKey)
      });
    } catch (error) {
      console.log(`removeByLocalId ${localId}: ${error}`);
    }
  }

  async update({ id, partial }: { id: string; partial: Partial<Message> }) {
    const existing = await this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.get(id)
    });

    if (!existing) return;

    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.put({ ...existing, ...partial })
    });
  }
}
