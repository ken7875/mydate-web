<template>
  <video id="video" controls ref="video"></video>
</template>

<script setup lang="ts">
import Hls from 'hls.js';

const video = ref<HTMLMediaElement | null>(null);
if (Hls.isSupported() && video.value) {
  const hls = new Hls();
  hls.loadSource('your-video.m3u8');
  hls.attachMedia(video.value);
} else if (video.value?.canPlayType?.('application/vnd.apple.mpegurl')) {
  // iOS Safari 原生支援 HLS
  video.value.src = 'your-video.m3u8';
}
</script>
