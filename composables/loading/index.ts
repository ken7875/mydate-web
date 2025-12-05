import useLoadingState from './loadingState';
// import type { LoadingProps } from './types';

export const useLoadingTool = () => {
  const loading = useLoadingState();
  const close = () => {
    loading.value = false;
  };

  // Omit<MessageProps, 'onSave' | 'onClose' | 'onDestroy'>
  const openLoading = async () => {
    if (loading.value) {
      return;
    }

    loading.value = true;
  };

  return {
    openLoading,
    close
  };
};
