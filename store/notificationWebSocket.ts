import { defineStore } from 'pinia';
// import { useAuth } from '@/store/auth';
import { StatusCode } from '~/enums/common';
import BaseWebsocket from '@/utils/websocket/index';

// TODO 將websocket本身監聽方法 心跳機制 對外方法做封裝拆分
export const useNotification = defineStore('webSocket', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/notificationWs` as string;
  const websocketTool = new BaseWebsocket(url);
  // const authStore = useAuth();
  const subscribtion = useSubscribtion();

  const init = (token: string) => {
    websocketTool.init(token);
  };

  const subscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) => {
    websocketTool.subscribe({ type, fnAry });
  };

  const unSubscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) => {
    websocketTool.unSubscribe({ type, fnAry });
  };

  const notify = ({ type, data, code }: { type: string; data: any; code: StatusCode }) => {
    websocketTool.notify({ type, data, code });
  };

  const handleClose = () => {
    websocketTool.handleClose();
  };

  const handleSend = <T>(data: { type: 'chatRoom' | 'global'; data: T }) => {
    websocketTool.handleSend(data);
  };

  const websocketGlobalMessage = (data: any) => {
    websocketTool.websocketGlobalMessage(data);
  };

  return {
    subscribtion,
    init,
    handleClose,
    subscribe,
    unSubscribe,
    notify,
    handleSend,
    websocketGlobalMessage
  };
});
