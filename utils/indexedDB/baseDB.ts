export interface IndexConfig {
  name: string;
  keyPath: string;
  unique?: boolean;
}

export interface BaseDBConfig {
  dbName: string;
  version: number;
  storeName: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
  keyPath?: string;
}

export type Mode = 'readonly' | 'readwrite';

export abstract class BaseIndexedDB {
  protected readonly storeName: string;
  private readonly getDB: () => Promise<IDBDatabase>;

  constructor(storeName: string, getDB: () => Promise<IDBDatabase>) {
    this.storeName = storeName;
    this.getDB = getDB;
  }

  runTransaction<T>({ fn, mode }: { fn: (store: IDBObjectStore) => IDBRequest<T>; mode: Mode }): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, mode);
        const store = tx.objectStore(this.storeName);
        const req = fn(store);

        req.addEventListener('success', () => {
          resolve(req.result);
        });

        req.addEventListener('error', () => {
          reject(req.error);
        });
      } catch (error) {
        reject(`runTransaction fail: ${error}`);
      }
    });
  }

  runCursorTransaction<T>({
    fn,
    mode,
    onCursor
  }: {
    fn: (store: IDBObjectStore) => IDBRequest<T>;
    mode: Mode;
    onCursor: (cursor: IDBCursorWithValue) => void;
  }): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, mode);
        const store = tx.objectStore(this.storeName);
        const req = fn(store);

        req.addEventListener('success', (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

          if (cursor) {
            onCursor(cursor);
            cursor.continue();
          } else {
            resolve();
          }
        });

        req.addEventListener('error', () => {
          reject(req.error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}
