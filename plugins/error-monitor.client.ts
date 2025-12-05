export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:error', (err) => {
    console.error('Global Nuxt Error:', err);
  });
});
