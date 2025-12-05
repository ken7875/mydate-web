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
      console.error(`easy-booking-websocket: you do not have subscribe type **${data.type}**!!`);

      return;
    }

    const deps = subscriber.get(data.type);
    deps?.forEach((fn) => {
      fn(data.data);
    });
  };

  const unSubscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: unknown[]) => void)[] }) => {
    const deps = subscriber.get(type);
    const res = deps?.filter((fn) => !fnAry.includes(fn)) || [];
    subscriber.set(type, res);
  };

  // interface CC {
  //   get value(): string;
  // }

  // const cc = {
  //   value: '1'
  // }

  // let a: CC

  return {
    subscriber,
    subscribe,
    notify,
    unSubscribe
  };
};
