import type { WsChannel } from '@/enums/websocket';

type Handler = (data: any) => void;
interface Consumer {
  ch: BroadcastChannel | null;
  handlers: Set<Handler>;
}
const createSubscribeHandler = () => {
  const consumers = new Map<string, Consumer>();

  const addConsumer = ({ entry, type }: { entry: Consumer | undefined; type: WsChannel }): BroadcastChannel => {
    const handlers = entry?.handlers ?? new Set<Handler>();

    const ch = new BroadcastChannel(type);
    // 接收其他頁籤廣播過來的訊息
    ch.addEventListener('message', ({ data }) => {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (error) {
          console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
        }
      });
    });

    consumers.set(type, { ch, handlers });

    return ch;
  };
  const ensureChannel = (type: WsChannel): BroadcastChannel => {
    const entry = consumers.get(type);
    if (entry && entry.ch) return entry.ch;

    const ch = addConsumer({ entry, type });
    return ch;
  };

  const dispatch = (type: WsChannel, data: unknown, code: unknown) => {
    const entry = consumers.get(type);
    if (!entry) return;

    // 同頁籤：直接呼叫 handlers
    entry.handlers.forEach((h) => {
      try {
        h({ type, data, code });
      } catch (error) {
        console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
      }
    });

    // 跨頁籤：透過 BroadcastChannel 廣播給其他頁籤
    const ch = ensureChannel(type);
    console.log({ type, data, code }, '{ type, data, code }');
    ch.postMessage({ type, data, code });
  };

  const broadcast = (type: WsChannel, data: unknown, code: unknown) => {
    dispatch(type, data, code);
  };

  const subscribe = (type: WsChannel, handler: Handler) => {
    ensureChannel(type);
    consumers.get(type)!.handlers.add(handler);
  };

  const unsubscribe = (type: WsChannel, handler: Handler) => {
    const entry = consumers.get(type);
    if (!entry) return;
    entry.handlers.delete(handler);
    if (entry.handlers.size === 0) {
      entry.ch?.close();
      consumers.delete(type);
    }
  };

  // 只關閉 BroadcastChannel，保留 handler 供重連後使用
  const closeChannels = () => {
    consumers.forEach((entry) => {
      entry.ch?.close();
      entry.ch = null;
    });
  };

  // 完全清除（登出時使用）
  const removeAll = () => {
    consumers.forEach(({ ch }) => ch?.close());
    consumers.clear();
  };

  return {
    broadcast,
    subscribe,
    unsubscribe,
    closeChannels,
    removeAll
  };
};

export default createSubscribeHandler;
