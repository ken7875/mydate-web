import { useForceKickOut } from '@/utils/forceLogout';

export default defineNuxtRouteMiddleware((to, from) => {
  // 需要import.meta.client, 因為useForceKickOut的message方法只能在client端執行
  const token = useCookie('access_token').value;
  if (to.path !== '/auth/login' && !token) {
    if (import.meta.client) {
      return useForceKickOut();
    }
  }

  if (to.path === '/auth/login' && token) {
    return navigateTo('/');
  }
});
