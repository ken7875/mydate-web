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
  '@vueuse/nuxt'
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
      // esbuild: {
      //   pure: process.env.NODE_ENV === 'production' ? ['console.log', 'debugger'] : []
      // },
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
            drop_console: false,
            drop_debugger: true
          }
        },
        // minify: 'terser',
        // rollupOptions: {},
        sourcemap: true,
        rollupOptions: {
          output: {
            /**
             * 2.以函数的形式使用
             * 将第三方包全部打包在一个chunk中，名称叫 vendor
             */
            // manualChunks(id) {
            //   if (id.includes('baseButton')) {
            //     console.log(id);
            //     return 'baseButton';
            //   }
            // }
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
