<template>
  <div class="h-[calc(100%-60px-12px)]">
    <VirtualList
      v-model:list="test"
      :perLoadNum="10"
      :total="100"
      @loadNewData="showNewFriendsData"
      @loadPrevData="showPrevFriendsData"
    >
      <template v-slot="{ item }">
        <p class="h-[5.5rem]" :data-test="item.idx">{{ item.idx }}</p>
      </template>
    </VirtualList>
  </div>
</template>

<script setup lang="ts">
const allData = Array(100)
  .fill(0)
  .map((_, idx) => ({ idx: idx + 1 }));

const test = ref<any[]>(allData.slice(0, 10));
const showNewFriendsData = ({ page, pageSize }: { page: number; pageSize: number }) => {
  let nowPage = page - 1;
  test.value.push(...allData.slice(nowPage * pageSize, pageSize * nowPage + pageSize));
};
const showPrevFriendsData = ({ page, pageSize }: { page: number; pageSize: number }) => {
  let nowPage = page - 1;
  test.value.unshift(...allData.slice(nowPage * pageSize, pageSize * nowPage + pageSize));
};
</script>
