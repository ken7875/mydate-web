interface Options {
  timeoutMs?: number;
}

interface TimeoutCallbacks {
  onTimeout: (localId: string) => void;
}

export function useSendTimeout(callbacks: TimeoutCallbacks, options: Options = {}) {
  const { timeoutMs = 10_000 } = options;
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const startTimer = (localId: string): void => {
    clearTimer(localId);
    const timeoutId = setTimeout(() => {
      pendingTimers.delete(localId);
      callbacks.onTimeout(localId);
    }, timeoutMs);
    pendingTimers.set(localId, timeoutId);
  };

  const clearTimer = (localId: string): void => {
    const timeoutId = pendingTimers.get(localId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      pendingTimers.delete(localId);
    }
  };

  const clearAll = (): void => {
    pendingTimers.forEach((timeoutId) => clearTimeout(timeoutId));
    pendingTimers.clear();
  };

  onBeforeUnmount(() => {
    clearAll();
  });

  return { startTimer, clearTimer, clearAll };
}
