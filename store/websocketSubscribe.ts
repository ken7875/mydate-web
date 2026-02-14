import { defineStore } from 'pinia';

export const useWebsocketSubscribe = defineStore('websocketSubscribe', () => {
  const { subscriber, notify, unSubscribe, subscribe } = useSubscribtion();

  return {
    subscriber,
    notify,
    unSubscribe,
    subscribe
  };
});
