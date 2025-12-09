<template>
  <div>
    <video autoplay ref="video" crossorigin="anonymous" controls muted playsinline></video>
  </div>
</template>

<script setup lang="ts">
import { useStream } from '@/store/stream';
import Hls from 'hls.js';

const streamStore = useStream();
const { getRecord } = streamStore;

const route = useRoute();
const uuid = route.params.uuid;
const video = ref();
const publicPath = computed(() => useRuntimeConfig().public.publicPath);
const startVideo = () => {
  const videoSrc = `${publicPath.value}source-m3u8/${uuid}/output.m3u8`;
  if (Hls.isSupported()) {
    const hls = new Hls({
      liveSyncDuration: 2, // 預期接近直播末端 2 秒
      liveMaxLatencyDuration: 5, // 最多落後 5 秒
      liveDurationInfinity: true,

      maxLiveSyncPlaybackRate: 1.5, // 若落後，自動加速追上（超有效）
      backBufferLength: 5 // 保留 5 秒 buffer，避免卡頓
    });
    hls.attachMedia(video.value);
    hls.loadSource(videoSrc);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.value.muted = false;
      video.value.play().catch((err: Error) => console.log('Autoplay blocked:', err));
    });

    // Optional: 追蹤是否真正在 sync
    hls.on(Hls.Events.LEVEL_UPDATED, (_, data) => {
      console.log('Live detail:', data.details);
      console.log('Player time:', video.value.currentTime);
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.log('HLS ERR:', data.type, data.details);
    });

    // const hls = new Hls()
    // let initialized = false;
    // hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
    //   if (initialized) return;
    //   const details = data.details;

    //   if (!details.fragments.length) return;

    //   const lastFrag = details.fragments[details.fragments.length - 1];

    //   // 跳到最新的片段
    //   video.value.currentTime = lastFrag.start;
    //   initialized = true;
    // });

    // hls.on(Hls.Events.MANIFEST_PARSED, () => {
    //   hls.startLoad(); // 自動跳到最新
    // });
    // hls.on(Hls.Events.FRAG_CHANGED, (_, data) => {
    //   const pdt = data.frag.programDateTime;
    //   const now = Date.now();
    //   const latency = (now - pdt) / 1000;

    //   console.log('Live latency:', latency.toFixed(2), 'seconds');
    // });
  }
};

onMounted(() => {
  if (import.meta.client) {
    nextTick(() => {
      streamStore.subscribe({
        type: 'video',
        fnAry: [getRecord]
      });

      startVideo();
    });
  }
});
</script>
