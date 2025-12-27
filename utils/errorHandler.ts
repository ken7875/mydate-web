import { useForceKickOut } from '@/utils/forceLogout';

export default useDebounceFn(async (errorCode: string, statusCode: number) => {
  console.log(errorCode, 'errorCode');
  const messageStore = await import('@/store/message');
  switch (errorCode) {
    case 'NO_THIS_FRIEND':
      return messageStore.useMessageStore().openMessage({
        title: '錯誤',
        content: '沒有這個好友',
        type: 'error',
        hasCancel: false
      });
  }

  switch (statusCode) {
    case 401:
      useForceKickOut();
      break;
    default:
      messageStore.useMessageStore().openMessage({
        title: '錯誤',
        content: '系統錯誤',
        type: 'error',
        hasCancel: false
      });
  }
});
