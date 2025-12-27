import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import type { VueQueryPluginOptions } from '@tanstack/vue-query';
import { ModuleOptions as SecurityOptions } from 'nuxt-security';

declare module 'nuxt/schema' {
  interface NuxtConfig {
    vueQuery?: {
      /** Nuxt 狀態同步的 Key，預設通常為 'vue-query-state' */
      stateKey?: string;
      /** 傳遞給 VueQueryPlugin 的選項 */
      vueQueryPluginOptions?: VueQueryPluginOptions;
    };
    security?: SecurityOptions;
  }

  interface NuxtOptions {
    vueQuery?: {
      /** Nuxt 狀態同步的 Key，預設通常為 'vue-query-state' */
      stateKey?: string;
      /** 傳遞給 VueQueryPlugin 的選項 */
      vueQueryPluginOptions?: VueQueryPluginOptions;
    };
    security: SecurityOptions;
  }
}
declare module 'vue' {
  interface GlobalComponents {
    FontAwesomeIcon: typeof FontAwesomeIcon;
  }
}

export {};
