// import { useStorage } from '@vueuse/core';
// import type { User } from './type';

// class StorageFactory<T> {
//   key: string;
//   value: T | null;
//   strategy: 'localStorage' | 'sessionStorage';
//   constructor(key: string, strategy: 'localStorage' | 'sessionStorage') {
//     this.key = key;
//     this.value = useStorage(this.key, null).value;
//     this.strategy = strategy;
//   }

//   getItem(): T | null {
//     if (!this.value) {
//       return null;
//     }

//     return useStorage(this.key, null, strategy, {
//       mergeDefaults: true,
//       serializer: {
//         read: (v: string) => (v ? JSON.parse(v) : null),
//         write: (v: T) => JSON.stringify(v)
//       }
//     }).value as T;
//   }

//   setItem(val: T) {
//     this.value = useStorage(this.key, val, strategy, {
//       mergeDefaults: true,
//       serializer: {
//         read: (v: string) => (v ? JSON.parse(v) : null),
//         write: (v: T) => JSON.stringify(v)
//       }
//     }).value;
//     return this.value;
//   }

//   removeItem() {
//     return sessionStorage.removeItem(this.key);
//   }
// }

// // export const userInfoStorage = <T>() =>
// //   new StorageFactory<T extends 'username' ? Pick<User, 'userName'> : Omit<User, 'userName'>>('user-info');
