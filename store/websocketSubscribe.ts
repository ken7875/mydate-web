import { defineStore } from 'pinia';
import { StatusCode } from '~/enums/common';

export const useWebsocketSubscribe = defineStore('websocketSubscribe', () => {
  const subscriber = new Map<string, ((...args: unknown[]) => unknown)[]>();

  const subscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: unknown[]) => void)[] }) => {
    if (!subscriber.has(type)) {
      subscriber.set(type, []);
    }
    const deps = subscriber.get(type);
    deps?.push(...fnAry);
  };

  const notify = (data: { type: string; data: unknown; code: StatusCode }) => {
    if (!subscriber.has(data.type)) {
      console.warn(`easy-booking-websocket: no subscribers for type **${data.type}**`);
      return;
    }

    const deps = subscriber.get(data.type);
    deps?.forEach((fn) => {
      try {
        fn(data.data);
      } catch (error) {
        console.error(`Error executing subscriber for type ${data.type}:`, error);
      }
    });
  };

  const unSubscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: unknown[]) => void)[] }) => {
    const deps = subscriber.get(type);
    const res = deps?.filter((fn) => !fnAry.includes(fn)) || [];

    if (res.length === 0) {
      subscriber.delete(type);
    } else {
      subscriber.set(type, res);
    }
  };

  return {
    subscriber,
    subscribe,
    notify,
    unSubscribe
  };
});
