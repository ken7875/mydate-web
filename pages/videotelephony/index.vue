<template>
  <div></div>
</template>

<script setup lang="ts">
const mediaStream: MediaStream | null = null; // 保存視訊流的全局引用
const constraints = {
  audio: false,
  video: true
};
const handleSuccess = (stream: MediaStream) => {
  console.log(stream, 'stream');
};
const handleError = () => {};
const onCapture = () => {
  navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
};

const stopCapture = () => {
  if (mediaStream) {
    // 停止所有的軌道
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null; // 清理引用
    console.log('MediaStream stopped');
  }
};

onMounted(() => {
  onCapture();
  stopCapture();
});
</script>
