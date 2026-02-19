const createSubscribeHandler = () => {
  const subs = new Map<string, BroadcastChannel>();

  const broadcast = (type: string, data: unknown, code: unknown) => {
    if (!subs.has(type)) {
      subs.set(type, new BroadcastChannel(type));
    }
    subs.get(type)!.postMessage({ type, data, code });
  };

  const remove = (type: string) => {
    subs.get(type)?.close();
    subs.delete(type);
  };

  const removeAll = () => {
    subs.forEach((ch) => ch.close());
    subs.clear();
  };

  return {
    subs: subs as ReadonlyMap<string, BroadcastChannel>,
    broadcast,
    remove,
    removeAll
  };
};

export default createSubscribeHandler;
