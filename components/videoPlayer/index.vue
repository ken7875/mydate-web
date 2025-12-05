<template>
  <div :style="videoWrapStyles">
    <video id="my-player" ref="videoRef" class="video-js w-full h-full">
      <source :src="src" />
    </video>
  </div>
</template>

<script setup lang="ts">
import videojs from 'video.js';
import 'video.js/dist/video-js.min.css';
import type { CSSProperties } from 'vue';

type MyVideoProps = {
  /** 视频地址 */
  src: string;
  width?: string;
  height?: string;
};
const props = withDefaults(defineProps<MyVideoProps>(), {});

// 1. id video元素或video的
const videoRef = ref<HTMLElement | null>(null);
// video实例对象
let videoPlayer = null;
const videoWrapStyles = computed<CSSProperties>(() => {
  return {
    width: props.width || '100%',
    height: props.height || '100%'
  };
});

// 初始化videojs
const initVideo = () => {
  // https://gitcode.gitcode.host/docs-cn/video.js-docs-cn/docs/guides/options.html
  const options = {
    language: 'zh-CN',
    controls: true, // 顯示控制條
    preload: 'auto',
    autoplay: true,
    fluid: true, // 自適應寬高
    src: props.src
  };

  if (videoRef.value) {
    // 创建 video 实例
    videoPlayer = videojs(videoRef.value, options, onPlayerReady);
  }
};

const onPlayerReady = () => {};
onMounted(() => {
  initVideo();
});
</script>
