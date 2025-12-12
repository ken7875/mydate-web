<template>
  <div class="relative w-full h-full">
    <div
      class="absolute top-0 left-0 z-10 w-full h-full bg-gray-200 flex justify-center items-center"
      v-if="!isVideoStart"
    >
      直播準備中
    </div>
    <video class="w-full h-full" ref="video" crossorigin="anonymous" autoplay controls muted playsinline v-else></video>
    <!-- <video class="w-full h-full" ref="video" crossorigin="anonymous" autoplay controls muted playsinline></video> -->
  </div>
</template>

<script setup lang="ts">
import { useStream } from '@/store/stream';
import Hls from 'hls.js';
import { useAuth } from '~/store/auth';

const authStore = useAuth();
console.log(authStore.userInfo?.uuid);

const streamStore = useStream();
const route = useRoute();
const uuid = route.params.uuid;
const video = ref();
const isVideoStart = ref<boolean>(route.query.status as unknown as boolean);
const publicPath = computed(() => useRuntimeConfig().public.streamPublicPath);

const startVideo = async (data: { uuid: string; status: boolean }) => {
  isVideoStart.value = true;
  if (uuid !== data.uuid) return;

  await nextTick();
  video.value.muted = true; // 確保初始靜音

  const videoSrc = `${publicPath.value}source-m3u8/${uuid}/output.m3u8`;
  if (Hls.isSupported()) {
    // liveSyncDurationCount 要落後多少個fragment
    // liveMaxLatencyDuration 要落後多少秒
    const hls = new Hls({
      liveSyncDurationCount: 3, // 強制同步接近最新片段
      liveMaxLatencyDurationCount: 5, // 強制同步接近最新片段
      // liveSyncDuration: 2, // 只緩衝 2 個 segment
      // liveMaxLatencyDuration: 5, // 最多允許 5 個 segment 緩衝
      liveDurationInfinity: true,

      maxLiveSyncPlaybackRate: 1.5, // 若落後，自動加速追上（超有效）
      backBufferLength: 5, // 保留 5 秒 buffer，避免卡頓
      enableWorker: true // 允許在web worker處理.ts
    });
    hls.attachMedia(video.value);
    hls.loadSource(videoSrc);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.value
        .play()
        .then(() => {
          video.value.muted = false;
        })
        .catch((err: Error) => console.log('Autoplay blocked:', err));
    });

    // Optional: 追蹤是否真正在 sync
    hls.on(Hls.Events.LEVEL_UPDATED, (_, data) => {
      console.log('Live detail:', data.details);
      console.log('Player time:', video.value.currentTime);
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.log('HLS ERR:', data.type, data.details);
    });

    hls.on(Hls.Events.FRAG_CHANGED, (event, data) => {
      const frag = data.frag;
      console.log('正在播放的 fragment:', frag);
    });
  }
};

const startVideoHandler = () => {
  if (isVideoStart.value) {
    return;
  }

  streamStore.subscribe({
    type: 'streamRoomStatus',
    fnAry: [startVideo]
  });
};

onMounted(() => {
  // nextTick(() => {
  //   startVideo({ uuid: 'e48cc509-e81f-4dac-8156-ebf246833562', status: true });
  // });
  if (import.meta.client) {
    startVideoHandler();
  }
});

onUnmounted(() => {
  streamStore.unSubscribe({
    type: 'streamRoomStatus',
    fnAry: [startVideo]
  });
});
</script>
