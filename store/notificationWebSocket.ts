import { defineStore } from 'pinia';
import BaseWebsocket from '@/utils/websocket/index';
import type { WsChannel } from '~/enums/websocket';

export const useNotification = defineStore('notification', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/notificationWs` as string;

  const queryClient = useQueryClient();

  // 延遲建立，避免 SSR 期間實例化
  let websocketTool: BaseWebsocket | null = null;

  const getWs = (): BaseWebsocket => {
    if (!websocketTool) {
      websocketTool = new BaseWebsocket(url, {
        onUnauthorized: () => {
          console.error('websocket connect fail: unAuth');
          // useForceKickOut().catch(console.error);
        },
        onReconnect: () => {
          queryClient.invalidateQueries({ queryKey: ['messageRecord'] });
        }
      });
    }
    return websocketTool;
  };

  const init = (token: string) => {
    getWs().init(token);
  };

  const notify = ({ type, data, code }: WsPayload) => {
    getWs().notify({ type, data, code });
  };

  const handleClose = () => {
    getWs().handleClose();
  };

  const handleSend = <T>(data: { type: 'chatRoom' | 'global' | 'markAsRead'; data: T }) => {
    getWs().handleSend(data);
  };

  const websocketGlobalMessage = (data: any) => {
    getWs().websocketGlobalMessage(data);
  };

  const subscribe = (type: WsChannel, handler: Handler) => {
    getWs().subscribe(type, handler);
  };

  const unsubscribe = (type: WsChannel, handler: Handler) => {
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
