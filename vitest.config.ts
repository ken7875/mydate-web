import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // fix bug: Vitest was initialized with native Node instead of Vite Node
    // https://github.com/nuxt/framework/issues/3252#issuecomment-1126771193
    deps: {
      inline: ['@nuxt/test-utils-edge']
    },
    setupFiles: ['./vitest.setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '~~': resolve(__dirname, '.'),
      '~': resolve(__dirname, '.')
    }
  },
  plugins: [
    AutoImport({
      imports: ['vue', '@vueuse/core', 'vue-router'],
      vueTemplate: true
      //   dts: true // not matter
    }),
    vue()
  ]
});
