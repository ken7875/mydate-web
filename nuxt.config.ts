// https://nuxt.com/docs/api/configuration/nuxt-config
// import { visualizer } from 'rollup-plugin-visualizer';

// import { viteMockServe } from 'vite-plugin-mock';

export default defineNuxtConfig({
  extends: ['./build/dev', process.env.NODE_ENV === 'production' && './config/prod'].filter(Boolean) as string[]
});
