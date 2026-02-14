// https://nuxt.com/docs/api/configuration/nuxt-config
// import { visualizer } from 'rollup-plugin-visualizer';
import { removePagesMatching } from './utils/routes/tool';
// import { viteMockServe } from 'vite-plugin-mock';
const baseModules = [
  '@nuxtjs/tailwindcss',
  '@pinia/nuxt',
  '@pinia-plugin-persistedstate/nuxt',
  'nuxt-lodash',
  '@hebilicious/vue-query-nuxt',
  '@vueuse/nuxt',
  '@nuxt/image'
];
const productionConfig = {
  modules: baseModules.concat(['nuxt-security']),
  security: {
    headers: {
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:']
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
export default defineNuxtConfig({
  ...{
    compatibilityDate: '2025-07-30',

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
    // modules: process.env.NODE_ENV === 'production' ? baseModule.concat(['nuxt-security']) : baseModule,
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
      transpile: ['rxjs', 'gsap']
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
    }
  },
  ...(process.env.NODE_ENV === 'production' ? productionConfig : {})
});
