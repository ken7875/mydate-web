import { defineStore } from 'pinia';
import { StatusCode } from '~/enums/common';
import BaseWebsocket from '@/utils/websocket/index';
import { useForceKickOut } from '@/utils/forceLogout';

export const useNotification = defineStore('notification', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/notificationWs` as string;

  // 延遲建立，避免 SSR 期間實例化
  let websocketTool: BaseWebsocket | null = null;

  const getWs = (): BaseWebsocket => {
    if (!websocketTool) {
      websocketTool = new BaseWebsocket(url, {
        onUnauthorized: () => useForceKickOut()
      });
    }
    return websocketTool;
  };

  const init = (token: string) => {
    getWs().init(token);
  };

  const notify = ({ type, data, code }: { type: string; data: any; code: StatusCode }) => {
    getWs().notify({ type, data, code });
  };

  const handleClose = () => {
    getWs().handleClose();
  };

  const handleSend = <T>(data: { type: 'chatRoom' | 'global'; data: T }) => {
    getWs().handleSend(data);
  };

  const websocketGlobalMessage = (data: any) => {
    getWs().websocketGlobalMessage(data);
  };

  const subscribe = (type: string, handler: (data: any) => void) => {
    getWs().subscribe(type, handler);
  };

  const unsubscribe = (type: string, handler: (data: any) => void) => {
    getWs().unsubscribe(type, handler);
  };

  return {
    init,
    handleClose,
    notify,
    handleSend,
    websocketGlobalMessage,
    subscribe,
    unsubscribe
  };
});
