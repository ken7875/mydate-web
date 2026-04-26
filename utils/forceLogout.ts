let isMessageOpen = false;

export const useForceKickOut = async () => {
  if (isMessageOpen) return;
  isMessageOpen = true;

  return import('@/store/message').then((res) => {
    res
      .useMessage()
      .openMessage({
        title: '錯誤',
        content: '請重新登入',
        type: 'error',
        hasCancel: false
      })
      ?.finally(() => {
        return import('@/store/auth').then(async (res) => {
          res.useAuth().logout();
          isMessageOpen = false;
          return await navigateTo('/auth/login');
        });
      });
  });
};
