import { useForceKickOut } from '@/utils/forceLogout';

export default useDebounceFn(async (errorCode: number) => {
  const messageStore = await import('@/store/message');
  switch (errorCode) {
    case 401:
      useForceKickOut();
      break;

    case 500:
    case 404:
      messageStore.useMessageStore().openMessage({
        title: '錯誤',
        content: '系統錯誤',
        type: 'error',
        hasCancel: false
      });
      break;
  }
});
