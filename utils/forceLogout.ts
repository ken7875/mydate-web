export const useForceKickOut = async () => {
  const error = new Error().stack;
  console.warn('logout', error);
  return import('@/store/message').then((res) => {
    res
      .useMessageStore()
      .openMessage({
        title: '錯誤',
        content: '請重新登入',
        type: 'error',
        hasCancel: false
      })
      ?.finally(() => {
        return import('@/store/auth').then(async (res) => {
          res.useAuth().logout();
          return await navigateTo('/auth/login');
        });
      });
  });
};
