import type { AsyncDataOptions } from '#app';
import { useLoadingTool } from './loading';

export type KeysOf<T> = Array<T extends T ? (keyof T extends string ? keyof T : never) : never>;

const useMyAsyncData = async <T>(key: string, fn: () => Promise<T>, options?: AsyncDataOptions<T, T, KeysOf<T>, T>) => {
  const pendingData = useAsyncData(key, fn, options);

  const loadingTool = useLoadingTool();
  loadingTool.openLoading();
  onMounted(() => {
    pendingData
      .then((res) => {
        if (res.error.value?.statusCode && res.error.value?.statusCode !== 200) {
          errorHandler(res.error.value.statusCode);
        }
      })
      .finally(() => {
        loadingTool.close();
      });
  });

  return pendingData;
};

export default useMyAsyncData;
