import { StatusCode } from '~/enums/common';

export const useSubscribtion = () => {
  const subscriber = new Map<string, ((...args: unknown[]) => unknown)[]>();

  const subscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: unknown[]) => void)[] }) => {
    if (!subscriber.has(type)) {
      subscriber.set(type, []);
    }

    const deps = subscriber.get(type);
    deps?.push(...fnAry);
  };

  // <T extends { type: string; data: unknown }>
  const notify = (data: { type: string; data: unknown; code: StatusCode }) => {
    if (!subscriber.has(data.type)) {
      // 改為 warn，避免後端廣播非當前頁面需要的資訊時報錯，造成誤判
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

    // 若該 type 已無訂閱者，則從 Map 中移除以釋放記憶體
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
};
