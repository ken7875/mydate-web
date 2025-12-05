<template>
  <div class="w-full h-full flex flex-col items-center">
    <video
      id="video"
      controls
      autoplay
      ref="video"
      class="landscape:w-[70%] landscape:h-[80%] object-cover lg:landscape:w-[50%]"
    ></video>
    <button @click="start">開始</button>
    <button @click="stop">停止</button>
  </div>
</template>

<script setup lang="ts">
import { useStream } from '@/store/stream';
import { useAuth } from '~/store/auth';
// import { closeStream } from '@/api/modules/stream';

const video = ref<HTMLMediaElement | null>(null);
let mediaRecorder: MediaRecorder | null = null;

const streamStore = useStream();
const authStore = useAuth();

let stream: MediaStream | null = null;
async function openVideo() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: {
        max: 1920,
        min: 375
      },
      height: {
        max: 820,
        min: 375
      },
      frameRate: 30
    },
    audio: true
  });

  video.value!.srcObject = stream;
  // 盡量選用 vp8+opus
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2500000,
    audioBitsPerSecond: 128000
  });

  mediaRecorder.addEventListener('dataavailable', async (e) => {
    // console.log(e.data, 'e.data');
    streamStore.handleSend(e.data);
  });
  mediaRecorder.onstop = () => {
    console.log('stop');
    // if (ws && ws.readyState === 1) ws.close();
  };
}

function stopCamera() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

onMounted(() => {
  openVideo();
  // streamStore.subscribe({
  //   type: 'video',
  //   fnAry: [streamStore.getRecord]
  // });
});

onUnmounted(() => {
  stop();
});

const start = async () => {
  mediaRecorder && mediaRecorder.start(3000);

  if (authStore.userInfo?.uuid) {
    try {
      await streamStore.openStreamRoom({
        title: 'test',
        description: 'test room',
        image: null
      });

      streamStore.init(authStore.token);
    } catch (error) {
      console.log('create stream room fail:', error);
    }
  }
};

const stop = () => {
  console.log('stop camera');
  mediaRecorder && mediaRecorder.stop();
  stopCamera();
  streamStore.handleClose();
  // closeStream();
};
</script>
