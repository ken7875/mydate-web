/* eslint-disable @typescript-eslint/no-explicit-any */
import textSliceHandler from '@/utils/textSliceHandler';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('textSlice', {
    mounted(el: HTMLElement, bind: any) {
      el.innerHTML = textSliceHandler(bind.value, bind.arg) + (bind.value.length > bind.arg ? '...' : '');
    },
    updated(el: HTMLElement, bind: any) {
      el.innerHTML = textSliceHandler(bind.value, bind.arg) + (bind.value.length > bind.arg ? '...' : '');
    }
  });
});
