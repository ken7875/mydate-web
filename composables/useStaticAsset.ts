const publicPath = computed(() => useRuntimeConfig().public.publicPath);

export function usePublicPath(path: string): string {
  return publicPath.value + path;
}

export function useStaticImage(path: string | undefined, defaultPath: string = '/images/testUser1.jpg'): string {
  return path ? usePublicPath(path) : defaultPath;
}

export function useAvatarUrl(avatar: string | undefined, defaultPath: string = '/images/testUser1.jpg'): string {
  return avatar ? usePublicPath(avatar) : defaultPath;
}
