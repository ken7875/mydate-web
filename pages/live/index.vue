<template>
  <div>
    <Card v-for="(room, key) in streamRoomMap" :key="key" @click="goToLiveRoom(room[1])">
      <template #header></template>
      <template #body>
        <h2>{{ room[1].title }}</h2>
        <p>{{ room[1].description }}</p>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { getAllRooms } from '@/api/modules/stream';
import { useStream } from '~/store/stream';
import { storeToRefs } from 'pinia';
import type { GetRoomsResponse } from '~/api/types/stream';

const streamStore = useStream();
// 由後端實作將直播間uuid存入db
const { streamRoomMap } = storeToRefs(streamStore);
const router = useRouter();
const goToLiveRoom = (room: GetRoomsResponse) => {
  router.push({
    path: `live/${room.uuid}`
  });
};
const { data } = await useMyAsyncData('liveRooms', () => getAllRooms());
streamStore.initRoom(data.value?.data || []);

onMounted(() => {
  streamStore.subscribe({
    type: 'streamRoomStatus',
    fnAry: [streamStore.resetRoomStatus]
  });
});

onUnmounted(() => {
  streamStore.unSubscribe({
    type: 'streamRoomStatus',
    fnAry: [streamStore.resetRoomStatus]
  });
});
</script>
