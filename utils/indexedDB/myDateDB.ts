import type { BaseDBConfig } from './baseDB';

const DB_NAME = 'myDate';
const DB_VERSION = 3;

const STORE_CONFIGS: BaseDBConfig[] = [
  {
    dbName: DB_NAME,
    version: DB_VERSION,
    storeName: 'failMessage',
    autoIncrement: true,
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'localId', keyPath: 'localId', unique: true },
      { name: 'senderId', keyPath: 'senderId', unique: false },
      { name: 'receiverId', keyPath: 'receiverId', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
      { name: 'roomId', keyPath: 'roomId', unique: false }
    ]
  },
  {
    dbName: DB_NAME,
    version: DB_VERSION,
    storeName: 'failMessageFile',
    autoIncrement: true,
    keyPath: 'id',
    indexes: [
      { name: 'uploadId', keyPath: 'uploadId', unique: true },
      { name: 'localId', keyPath: 'localId', unique: true },
      { name: 'roomId', keyPath: 'roomId', unique: false },
      { name: 'createAt', keyPath: 'createAt', unique: false }
    ]
  }
];

let dbPromise: Promise<IDBDatabase> | null = null;

export function getMyDateDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.addEventListener('upgradeneeded', (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction!;

        for (const config of STORE_CONFIGS) {
          let store: IDBObjectStore;

          if (!db.objectStoreNames.contains(config.storeName)) {
            store = db.createObjectStore(config.storeName, {
              keyPath: config.keyPath ?? 'id',
              autoIncrement: config.autoIncrement ?? true
            });
          } else {
            store = tx.objectStore(config.storeName);
          }

          for (const index of config.indexes ?? []) {
            if (!store.indexNames.contains(index.name)) {
              store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
            }
          }
        }
      });

      request.addEventListener('success', (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      });

      request.addEventListener('error', (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      });
    });
  }

  return dbPromise;
}

export function closeMyDateDB(): void {
  dbPromise?.then((db) => db.close());
  dbPromise = null;
}
