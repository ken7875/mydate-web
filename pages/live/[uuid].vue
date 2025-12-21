<template>
  <div class="relative w-full h-full">
    <div
      class="absolute top-0 left-0 z-10 w-full h-full bg-gray-200 flex justify-center items-center"
      v-show="!isVideoStart"
    >
      直播準備中
    </div>
    <ClientOnly>
      <video
        class="w-full h-full object-cover"
        ref="video"
        crossorigin="anonymous"
        autoplay
        controls
        playsinline
        v-show="isVideoStart"
      ></video>
    </ClientOnly>
    <!-- <video class="w-full h-full" ref="video" crossorigin="anonymous" autoplay controls muted playsinline></video> -->
  </div>
</template>

<!-- 聊天室實作, 用戶進入房間通知, donate -->
<script setup lang="ts">
import { useStream } from '@/store/stream';
import Hls from 'hls.js';
import { getRoomApi } from '@/api/modules/stream';
// import { messageTool } from '~/utils/message';
import { useMessageStore } from '@/store/message';

const streamStore = useStream();
const messageStore = useMessageStore();
const route = useRoute();
const router = useRouter();
const uuid = route.params.uuid as string;
const video = ref();
const roomInfo = ref({
  uuid: '',
  title: '',
  description: '',
  image: '',
  status: false
});
const getRoomInfo = async () => {
  try {
    const res = await getRoomApi(uuid || '');
    roomInfo.value = res.data!;
  } catch (error) {
    messageStore
      .openMessage({
        title: '錯誤',
        content: '找不到直播間'
      })
      ?.then(() => {
        router.push('/live');
      });
  }
};
const isVideoStart = computed<boolean>(() => roomInfo.value.status);
const publicPath = computed(() => useRuntimeConfig().public.streamPublicPath);
let hls: Hls | null = null;
const startVideo = async (data: { uuid: string; status: boolean }) => {
  if (uuid !== data.uuid) return;
  roomInfo.value.status = data.status;

  const videoSrc = `${publicPath.value}source-m3u8/${uuid}/output.m3u8`;
  if (Hls.isSupported()) {
    // liveSyncDurationCount 要落後多少個fragment
    // liveMaxLatencyDuration 要落後多少秒
    hls = new Hls({
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
      video.value.play().catch((err: Error) => {
        console.log('Autoplay blocked:', err);
        video.value.muted = true;
        video.value.play();
      });
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
    startVideo({ uuid: roomInfo.value?.uuid || '', status: true });
    return;
  }

  streamStore.subscribe({
    type: 'streamRoomStatus',
    fnAry: [startVideo]
  });
};

onMounted(() => {
  getRoomInfo().then(() => {
    if (import.meta.client) {
      startVideoHandler();
    }
  });
});

onUnmounted(() => {
  streamStore.unSubscribe({
    type: 'streamRoomStatus',
    fnAry: [startVideo]
  });

  hls && hls.destroy();
});
</script>
