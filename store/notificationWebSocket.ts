import { defineStore } from 'pinia';
import { StatusCode } from '~/enums/common';
import BaseWebsocket from '@/utils/websocket/index';

export const useNotification = defineStore('notification', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/notificationWs` as string;
  const websocketTool = new BaseWebsocket(url);

  const init = (token: string) => {
    websocketTool.init(token);
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
    init,
    handleClose,
    notify,
    handleSend,
    websocketGlobalMessage
  };
});
