export const useForceKickOut = async () => {
  const error = new Error().stack;
  console.warn('logout', error);
  import('@/store/message').then((res) => {
    res
      .useMessageStore()
      .openMessage({
        title: '錯誤',
        content: '請重新登入',
        type: 'error',
        hasCancel: false
      })
      ?.finally(() => {
        import('@/store/auth').then((res) => {
          res.useAuth().logout();
          navigateTo('/auth/login');
        });
      });
  });
};
