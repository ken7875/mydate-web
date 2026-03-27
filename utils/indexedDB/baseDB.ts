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
  protected readonly config: Required<BaseDBConfig>;

  constructor(config: BaseDBConfig) {
    this.config = {
      autoIncrement: true,
      keyPath: 'id',
      indexes: [],
      ...config
    };
  }

  private static instances: Map<string, IDBDatabase> = new Map();

  openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.addEventListener('upgradeneeded', (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: this.config.keyPath,
            autoIncrement: this.config.autoIncrement
          });

          for (const index of this.config.indexes) {
            store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
          }
        }
      });

      request.addEventListener('success', (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        BaseIndexedDB.instances.set(this.config.dbName, db);
        resolve(db);
      });

      request.addEventListener('error', (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      });
    });
  }

  protected async getDB(): Promise<IDBDatabase> {
    const existing = BaseIndexedDB.instances.get(this.config.dbName);

    if (existing) return existing;

    return this.openDB();
  }

  runTransaction<T>({ fn, mode }: { fn: (store: IDBObjectStore) => IDBRequest<T>; mode: Mode }): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await this.getDB();
        const tx = db.transaction(this.config.storeName, mode);
        const store = tx.objectStore(this.config.storeName);
        const req = fn(store); // store.add, store.get ...

        req.addEventListener('success', () => {
          resolve(req.result);
        });
      } catch (error) {
        reject(`runTransaction fail!!!: ${error}`);
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
        const tx = db.transaction(this.config.storeName, mode);
        const store = tx.objectStore(this.config.storeName);
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

  close(): void {
    const db = BaseIndexedDB.instances.get(this.config.dbName);

    if (db) {
      db.close();
      BaseIndexedDB.instances.delete(this.config.dbName);
    }
  }
}
