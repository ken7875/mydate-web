import type { WsChannel, WSCode } from '~/enums/websocket';
import { useNotification } from '~/store/notificationWebSocket';

export type WsPayload = { data: any; code: WSCode; type: WsChannel };
export type Handler = (payload: WsPayload) => void;

interface Options {
  subscribe?: (type: string, handler: Handler) => void;
  unsubscribe?: (type: string, handler: Handler) => void;
}

interface WsChannelConfig {
  type: WsChannel;
  handler: Handler;
}

/**
 * 統一管理 WebSocket BroadcastChannel 的訂閱與取消訂閱。
 * 在 onMounted 訂閱，onBeforeUnmount 自動取消。
 *
 * @param channels - 要訂閱的 channel 配置陣列
 * @param options - 自訂 subscribe/unsubscribe 方法（預設使用 notificationStore）
 *
 * @example
 * // 使用預設 notification store
 * useWsChannel([
 *   { type: WsChannel.Global, handler: handleGlobal },
 *   { type: WsChannel.ChatRoom, handler: handleChat }
 * ]);
 *
 * // 使用 stream store
 * const streamStore = useStream();
 * useWsChannel(
 *   [{ type: WsChannel.StreamRoomStatus, handler: handleStatus }],
 *   { subscribe: streamStore.subscribe, unsubscribe: streamStore.unSubscribe }
 * );
 */
export const useWsChannel = (channels: WsChannelConfig[], options?: Options) => {
  let subscribeFn: (type: string, handler: Handler) => void;
  let unsubscribeFn: (type: string, handler: Handler) => void;

  onMounted(() => {
    const notificationStore = useNotification();
    subscribeFn = options?.subscribe ?? notificationStore.subscribe;
    unsubscribeFn = options?.unsubscribe ?? notificationStore.unsubscribe;
    channels.forEach(({ type, handler }) => {
      subscribeFn(type, handler);
    });
  });

  onBeforeUnmount(() => {
    if (!unsubscribeFn) return;
    channels.forEach(({ type, handler }) => {
      unsubscribeFn(type, handler);
    });
  });
};
