const publicPath = computed(() => useRuntimeConfig().public.publicPath);
export default (avatar: string | undefined, defaultPath: string = '/images/default.jpg') =>
  avatar ? publicPath.value + avatar : defaultPath;
