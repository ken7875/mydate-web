import type { Message } from '~/api/types/chat';
import { BaseIndexedDB } from './baseDB';
import { getMyDateDB } from './myDateDB';

export interface FailMessageFile extends Message {
  uploadId: string;
  file: Blob;
}

export class FailMessageFileDB extends BaseIndexedDB {
  constructor() {
    super('failMessageFile', getMyDateDB);
  }

  async getByKey({ key, value }: { key: string; value: any }): Promise<FailMessageFile[]> {
    return this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.index(key).getAll(value)
    });
  }

  async add(data: FailMessageFile) {
    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.add(data)
    });
  }

  async update(uploadId: string, status: 'pending' | 'failed') {
    const existing = await this.runTransaction({
      mode: 'readonly',
      fn: (store) => store.index('uploadId').get(uploadId)
    });

    if (!existing) return;

    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.put({ ...existing, status })
    });
  }

  async markSendingAsFailed(roomId: number) {
    await this.runCursorTransaction({
      mode: 'readwrite',
      fn: (store) => store.index('roomId').openCursor(IDBKeyRange.only(roomId)),
      onCursor: (cursor) => {
        const record = cursor.value as FailMessageFile;
        if (record.status === 'sending') {
          cursor.update({ ...record, status: 'failed' });
        }
      }
    });
  }

  async markAllSendingAsFailed() {
    await this.runCursorTransaction({
      mode: 'readwrite',
      fn: (store) => store.openCursor(),
      onCursor: (cursor) => {
        const record = cursor.value as FailMessageFile;
        if (record.status === 'sending') {
          cursor.update({ ...record, status: 'failed' });
        }
      }
    });
  }

  async removeByKey({ key, value }: { key: string; value: any }) {
    const primaryKey = await this.runTransaction<IDBValidKey | undefined>({
      mode: 'readonly',
      fn: (store) => store.index(key).getKey(value)
    });

    if (!primaryKey) return;

    await this.runTransaction({
      mode: 'readwrite',
      fn: (store) => store.delete(primaryKey)
    });
  }
}
