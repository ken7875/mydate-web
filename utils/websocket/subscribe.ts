type Handler = (data: any) => void;

const createSubscribeHandler = () => {
  const consumers = new Map<string, { ch: BroadcastChannel; handlers: Set<Handler> }>();

  const dispatch = (type: string, data: unknown, code: unknown) => {
    const entry = consumers.get(type);
    if (!entry) return;

    // 同頁籤：直接呼叫 handlers
    entry.handlers.forEach((h) => {
      try {
        h(data);
      } catch (error) {
        console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
      }
    });

    // 跨頁籤：透過 BroadcastChannel 廣播給其他頁籤
    entry.ch.postMessage({ type, data, code });
  };

  const broadcast = (type: string, data: unknown, code: unknown) => {
    dispatch(type, data, code);
  };

  const subscribe = (type: string, handler: Handler) => {
    if (!consumers.has(type)) {
      const ch = new BroadcastChannel(type);
      const handlers = new Set<Handler>();
      // 接收其他頁籤廣播過來的訊息
      ch.addEventListener('message', ({ data }) => {
        handlers.forEach((h) => {
          try {
            h(data.data);
          } catch (error) {
            console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
          }
        });
      });
      consumers.set(type, { ch, handlers });
    }
    consumers.get(type)!.handlers.add(handler);
  };

  const unsubscribe = (type: string, handler: Handler) => {
    const entry = consumers.get(type);
    if (!entry) return;
    entry.handlers.delete(handler);
    if (entry.handlers.size === 0) {
      entry.ch.close();
      consumers.delete(type);
    }
  };

  const removeAll = () => {
    consumers.forEach(({ ch }) => ch.close());
    consumers.clear();
  };

  return {
    broadcast,
    subscribe,
    unsubscribe,
    removeAll
  };
};

export default createSubscribeHandler;
