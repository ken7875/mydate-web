import type { NuxtConfig } from 'nuxt/schema';

const config: NuxtConfig = {
  modules: ['nuxt-security'],
  security: {
    headers: {
      contentSecurityPolicy: {
        'img-src':
          process.env.NODE_ENV === 'development' ? ["'self'", 'http://localhost:3033', 'data:'] : ["'self'", 'data:']
      },
      permissionsPolicy: {
        // 允許自己 ('self') 使用麥克風和攝像頭
        microphone: ['self'],
        camera: ['self'],
        // 如果還有用到地理位置，也可以加上
        geolocation: ['self']
      }
    }
  }
};
export default config;
