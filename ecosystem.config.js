module.exports = {
  apps: [
    {
      name: 'nuxt3-app',
      script: '.output/server/index.mjs',
      exec_mode: 'cluster', // 可改成 'fork'
      instances: 'max', // max=使用所有 CPU
      env: {
        NITRO_PORT: 3000,
        NITRO_HOST: '0.0.0.0',
        NODE_ENV: 'production'
      }
    }
  ]
};
