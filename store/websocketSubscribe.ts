import { defineStore } from 'pinia';

export const useWebsocketSubscribe = defineStore('websocketSubscribe', () => {
  const subscribtion = useSubscribtion();
  const subscriber = subscribtion.subscriber;
  const notify = subscribtion.notify;
  const unSubscribe = subscribtion.unSubscribe;
  const subscribe = subscribtion.subscribe;

  return {
    subscriber,
    notify,
    unSubscribe,
    subscribe
  };
});
