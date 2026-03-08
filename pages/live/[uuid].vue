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
import { useMessage } from '@/store/message';

const streamStore = useStream();
const messageStore = useMessage();
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
    /**
     * liveSyncDurationCount 要落後多少個fragment
     * liveMaxLatencyDuration 要落後多少秒
     */

    hls = new Hls({
      // startPosition: -1, // 1. 強制從最新位置開始
      liveSyncDurationCount: 2, // 目前1個兩秒
      liveMaxLatencyDurationCount: 4, // 最多接受延遲segment = 3
      // liveSyncDuration: 2,
      // liveMaxLatencyDuration: 5,
      liveDurationInfinity: true,
      lowLatencyMode: true, // 必須開啟此項以支援預取與 Part 片段

      maxLiveSyncPlaybackRate: 1.5, // 若落後，自動加速追上（超有效）
      // backBufferLength: 5, // 播放過的影片要在記憶體裡保留多久
      maxBufferLength: 5, // 最大 buffer 秒數
      enableWorker: true // 允許在web worker處理.ts
    });
    // hls.targetLatency = 3;
    hls.attachMedia(video.value);
    hls.loadSource(videoSrc);

    console.log(Hls.getMediaSource(), 'current meida');

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

    hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
      console.log('Fragment Loaded:', data.frag.url, 'Level:', data.frag.level);
    });

    // 範例：當播放器切換到不同片段時 (或快進快退)
    hls.on(Hls.Events.FRAG_CHANGED, function (event, data) {
      console.log(hls, 'hls');
      // data.frag 包含新的片段資訊
      console.log('Fragment Changed to:', data.frag.url);
      console.log(data.frag.start, data.frag.end);
    });

    hls.on(Hls.Events.FRAG_BUFFERED, () => {
      const lat = hls?.latency;
      console.log(lat, 'lat');
      // if (lat && lat > 10) {
      //   console.log('Latency too high, maybe speed up or show indicator');
      // }
    });
  }
};

// let currentTime = 0;
// const getCurrentData = () => {
//   console.log(hls, 'his')
// }

const startVideoHandler = () => {
  if (isVideoStart.value) {
    startVideo({ uuid: roomInfo.value?.uuid || '', status: true });
    return;
  }

  streamStore.subscribe('streamRoomStatus', startVideo);
};

onMounted(() => {
  getRoomInfo().then(() => {
    if (import.meta.client) {
      startVideoHandler();
    }
  });
});

onUnmounted(() => {
  streamStore.unSubscribe('streamRoomStatus', startVideo);

  hls && hls.destroy();
});
</script>
