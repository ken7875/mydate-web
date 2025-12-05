<template>
  <ul ref="virtualWrap" class="h-full overflow-scroll">
    <li ref="listTop"></li>
    <li v-for="item in list" :key="item.idx">
      <slot :item="item"></slot>
    </li>
    <li ref="listBottom"></li>
  </ul>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
// import type { PagingRequest } from '@/api/types/';

const props = withDefaults(
  defineProps<{
    perLoadNum?: number;
    total: number;
    visible?: boolean;
  }>(),
  {
    perLoadNum: 20,
    visible: true
  }
);

const list = defineModel<any[]>('list', { required: true });

const emit = defineEmits<{
  (e: 'loadNewData', payload: { page: number; pageSize: number }): void;
  (e: 'loadPrevData', payload: { page: number; pageSize: number }): void;
}>();

const MAX_PAGE_COUNT = 4;
const OFFSET = 2;
const listBottom = ref<HTMLDivElement>();
const listTop = ref<HTMLDivElement>();
const initialized = ref(false);
const startPage = ref(1);
const currentPage = ref(1);

const initialize = () => {
  if (!initialized.value && props.visible) {
    emit('loadNewData', { page: currentPage.value, pageSize: props.perLoadNum });
    initialized.value = true;
  }
};
let stopNewPageVirtualListHandler: () => void = () => {};
let stopPrevPageVirtualListHandler: () => void = () => {};

const isExceedLimitData = computed(() => currentPage.value - startPage.value >= MAX_PAGE_COUNT);
const totalPage = computed(() => Math.ceil(props.total / props.perLoadNum));

const loadNewPage = () => {
  const { stop } = useIntersectionObserver(
    listBottom.value,
    ([{ isIntersecting }]) => {
      if (isIntersecting && currentPage.value < totalPage.value) {
        currentPage.value++;
        emit('loadNewData', { page: currentPage.value, pageSize: props.perLoadNum });
      }

      if (isExceedLimitData.value) {
        sliceTopPage();
      }
    },
    {
      rootMargin: '0px 0px -30px 0px' // 提前 10px 觸發
    }
  );

  stopNewPageVirtualListHandler = stop;
};

const virtualWrap = ref<HTMLElement>();
async function maintainScrollAfterPrepend() {
  await nextTick();
  if (!virtualWrap.value) return;
  virtualWrap.value.scrollTop += 500; // 補償捲動距離
}

const loadPrevPage = () => {
  const { stop } = useIntersectionObserver(
    listTop.value,
    ([{ isIntersecting }]) => {
      if (isIntersecting && startPage.value > 1) {
        startPage.value--;
        emit('loadPrevData', { page: startPage.value, pageSize: props.perLoadNum });
      }

      if (isExceedLimitData.value) {
        sliceBottomPage();
        maintainScrollAfterPrepend();
      }
    },
    {
      rootMargin: '-30px 0px 0px 0px' // 提前 10px 觸發
    }
  );

  stopPrevPageVirtualListHandler = stop;
};

const initVirtualScrollHandler = () => {
  if (props.total <= 0) return;

  // 向下滾加載新頁面
  loadNewPage();
  // 向上滾加載之前刪除的頁面
  loadPrevPage();
};

const sliceTopPage = () => {
  list.value = list.value.slice(OFFSET * props.perLoadNum);
  startPage.value += OFFSET;
};

const sliceBottomPage = () => {
  list.value = list.value.slice(0, list.value.length - OFFSET * props.perLoadNum);
  currentPage.value -= OFFSET;
};

watch(
  () => props.total,
  () => {
    initVirtualScrollHandler();
  }
);

// watch(
//   currentPage,
//   () => {
//     if (currentPage.value - startPage.value > MAX_PAGE_COUNT) {
//       sliceTopPage();
//     } else if(){
//       sliceBottomPage
//     }
//   },
//   {
//     deep: true
//   }
// );

onMounted(() => {
  initVirtualScrollHandler();
});

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      return;
    }

    initialize();
  }
);

// watch(
//   () => currentIndex.value,
//   (val) => {
//     if (val >= props.total) {
//       stopVirtualListHandler();
//     }
//   }
// );

onUnmounted(() => {
  stopNewPageVirtualListHandler();
  stopPrevPageVirtualListHandler();
});
</script>
