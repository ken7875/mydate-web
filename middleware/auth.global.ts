import { useAuth } from '@/store/auth';
import { storeToRefs } from 'pinia';
import { useForceKickOut } from '@/utils/forceLogout';

export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.client && from.path !== '/auth/login') {
    const authStore = useAuth();
    const { token } = storeToRefs(authStore);
    if (!token.value && to.path !== '/auth/login') {
      useForceKickOut();
    }
  }
});
