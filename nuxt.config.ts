// https://nuxt.com/docs/api/configuration/nuxt-config
// import { visualizer } from 'rollup-plugin-visualizer';
import { removePagesMatching } from './utils/routes/tool';
// import { viteMockServe } from 'vite-plugin-mock';
const securityConfig: Record<string, any> =
  process.env.NODE_ENV === 'production'
    ? {
        security: {
          headers: {
            contentSecurityPolicy: {
              // 預設策略：僅允許同源
              'default-src': ["'self'"],
              // script-src 不覆蓋，保留 nuxt-security 預設的 nonce + strict-dynamic 機制（最佳 XSS 防護）
              // API 連線（$fetch）與 WebSocket
              'connect-src': ["'self'", 'wss:', 'ws:'],
              // 字型：Google Fonts
              'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
              // 樣式：Google Fonts CSS + inline styles（Vue scoped styles 需要）
              'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
              // 圖片：同源 + data URI（base64）+ blob（上傳預覽）
              'img-src': ["'self'", 'data:', 'blob:'],
              // 影音：直播串流（HLS via hls.js 使用 Blob URL）
              'media-src': ["'self'", 'blob:'],
              // Web Worker：hls.js 啟用 enableWorker:true，透過 Blob URL 建立 Worker
              'worker-src': ["'self'", 'blob:'],
              // 禁止嵌入 object/embed
              'object-src': ["'none'"],
              // 僅允許同源 frame（防止 clickjacking）
              'frame-ancestors': ["'self'"],
              // 表單提交限制
              'form-action': ["'self'"],
              // base URI 限制
              'base-uri': ["'none'"],
              // 不啟用 upgrade-insecure-requests，因為目前 Docker 部署使用 http
              // 未來部署到 HTTPS 域名時應改為 true
              'upgrade-insecure-requests': false
            },
            permissionsPolicy: {
              // 允許自己使用麥克風和攝像頭（直播功能需要）
              microphone: ['self'],
              camera: ['self'],
              geolocation: ['self']
            }
          }
        }
      }
    : {};

const baseModules: any[] = [
  '@nuxtjs/tailwindcss',
  '@pinia/nuxt',
  '@pinia-plugin-persistedstate/nuxt',
  'nuxt-lodash',
  '@hebilicious/vue-query-nuxt',
  '@vueuse/nuxt',
  '@nuxt/image',
  // nuxt-security 僅在 production 環境載入（nuxt build 時 NODE_ENV=production）
  ...(process.env.NODE_ENV === 'production' ? ['nuxt-security'] : [])
];
export default defineNuxtConfig({
  compatibilityDate: '2025-07-30',

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100..900&display=swap'
        }
      ]
    }
  },

  // experimental: {
  //   renderJsonPayloads: false
  // },

  ssr: true,
  devtools: { enabled: true },

  devServer: {
    host: '0.0.0.0',
    port: 3000
  },
  // postcss: {
  //   plugins: {
  //     autoprefixer: {},
  //     cssnano: {} // css壓縮工具
  //   }
  // },

  runtimeConfig: {
    public: {
      // apiBase: process.env.NODE_ENV === 'development' ? process.env.API_BASE_URL : process.env.API_BASE_URL_PROD
      apiBase: process.env.API_BASE_URL,
      apiBaseServer: process.env.API_BASE_URL_SERVER,
      publicPath: `${process.env.API_BASE_URL}/bk/public/`,
      streamPublicPath: `${process.env.API_BASE_URL}/bk/stream/public/`,
      wsBase: process.env.WS_BASE_URL,
      apiMock: process.env.API_MOCK_URL,
      mode: process.env.MODE
    }
  },

  typescript: {
    strict: true
  },

  components: {
    global: true,
    dirs: ['@/components']
  },
  modules: baseModules,
  vueQuery: {
    stateKey: 'vue-query-nuxt',
    vueQueryPluginOptions: {}
  },
  imports: {
    dirs: ['vueQuery']
  },
  css: ['@/assets/css/tailwinds.css', '@fortawesome/fontawesome-svg-core/styles.css'],

  build: {
    transpile: ['gsap']
  },

  nitro: {
    compressPublicAssets: true // 壓縮 public assets 物件
  },
  vite: {
    plugins: [
      // visualizer({
      //   open: true,
      // })
      // viteMockServe({
      //   mockPath: './mock',
      //   enable: process.env.MODE === 'dev'
      // })
    ],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: process.env.MODE === 'production',
          drop_debugger: true
        }
      },
      // minify: 'terser',
      // rollupOptions: {},
      sourcemap: process.env.MODE !== 'production',
      rollupOptions: {
        output: {
          chunkFileNames: (chunkInfo) => {
            const pageRegex = /pages/i;
            if (pageRegex.test?.(chunkInfo.facadeModuleId || '')) {
              const pathAry = chunkInfo.facadeModuleId?.split('/') || [];
              const fileNameIndex = pathAry.findIndex((item) => pageRegex.test(item));
              const folderName = pathAry.slice(fileNameIndex + 1).reduce((acc, cur) => {
                if (/index.vue/.test(cur)) {
                  return acc;
                } else {
                  return acc + cur.replace(/[\[\]]|\.vue/g, '').replace(cur[0], cur[0].toUpperCase());
                }
              }, '');
              const chunkName = !folderName || /vue/.test(folderName) ? '[name]' : folderName;

              return `_nuxt/chunks/${chunkName ?? ['[name]']}.[hash].js`;
            }

            return '_nuxt/chunks/[name].[hash].js';
          },
          entryFileNames: '_nuxt/entries/[name].[hash].js',
          assetFileNames: '_nuxt/assets/[name].[hash].[ext]'
        }
      }
    }
  },

  hooks: {
    'pages:extend'(pages: any) {
      removePagesMatching(/\.ts$|components|\.spec\.ts$/, pages);
    }
  },

  sourcemap: {
    client: 'hidden'
  },

  // nuxt-security 配置只在 production 載入，透過 securityConfig 條件式 spread 避免型別錯誤
  ...securityConfig
});
