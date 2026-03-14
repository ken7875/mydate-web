<template>
  <ul ref="virtualWrap" class="h-full overflow-scroll">
    <li ref="listTop" v-if="loadTop" data-test="listTop"></li>
    <li v-for="(item, index) in list" :key="item.idx" :data-test="item.idx" :class="listClass">
      <slot :item="item" :key="item.idx" :index="index"></slot>
    </li>
    <li ref="listBottom" v-if="loadDown" data-test="listDown"></li>
  </ul>
</template>

<script setup lang="ts" generic="T extends { idx: string }">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
// import type { PagingRequest } from '@/api/types/';

const props = withDefaults(
  defineProps<{
    perLoadNum?: number;
    total: number;
    maxPageCount?: number;
    singleSide?: boolean;
    loadTop?: boolean;
    loadDown?: boolean;
    listClass?: string;
    isReverse?: boolean;
  }>(),
  {
    perLoadNum: 20,
    maxPageCount: 4,
    loadTop: true,
    loadDown: true,
    singleSide: false,
    listClass: '',
    isReverse: false
  }
);

const list = defineModel<T[]>('list', { required: true });

const emit = defineEmits<{
  (e: 'loadNewData', payload: { page: number; pageSize: number }): void;
  (e: 'loadPrevData', payload: { page: number; pageSize: number }): void;
}>();

const OFFSET = 1;
const OBSERVER_ROOT_MARGIN = '30px 0px 30px 0px';
const listBottom = useTemplateRef('listBottom');
const listTop = useTemplateRef('listTop');

const totalPage = computed(() => Math.ceil(props.total / props.perLoadNum));
const startPage = ref(props.isReverse ? totalPage.value : 1);
const endPage = ref(props.isReverse ? totalPage.value : 1);

const stopHandlers: (() => void)[] = [];

// 數窗內最多限制DOM筆數
const isExceedLimitData = computed(() => endPage.value - startPage.value + 1 > props.maxPageCount);

const loadNextPage = () => {
  const target = props.singleSide ? (props.loadTop ? listTop.value : listBottom.value) : listBottom.value;
  const { stop } = useIntersectionObserver(
    target,
    ([{ isIntersecting }]) => {
      if (isIntersecting && endPage.value <= totalPage.value) {
        if (endPage.value >= totalPage.value) return;

        endPage.value++;
        emit('loadNewData', { page: endPage.value, pageSize: props.perLoadNum });

        if (props.singleSide && props.loadTop) {
          maintainScrollAfterPrepend();
        }
        if (isExceedLimitData.value && !props.singleSide) {
          sliceTopPage();
        }
      }
    },
    {
      root: virtualWrap.value,
      rootMargin: OBSERVER_ROOT_MARGIN
    }
  );

  stopHandlers.push(stop);
};

const virtualWrap = useTemplateRef('virtualWrap');

let isPrevLoadPending = false;
let prevScrollHeight = 0;

// 監聽 list 第一筆 idx 變化確認 prepend 實際完成，再補正 scrollTop
watch(
  () => list.value[0]?.idx,
  async (newIdx, oldIdx) => {
    if (!isPrevLoadPending || newIdx === oldIdx) return;
    await nextTick();
    if (virtualWrap.value) {
      virtualWrap.value.scrollTop += virtualWrap.value.scrollHeight - prevScrollHeight;
    }
    isPrevLoadPending = false;
  }
);

const loadPrevPage = () => {
  const { stop } = useIntersectionObserver(
    listTop.value,
    ([{ isIntersecting }]) => {
      if (isIntersecting && startPage.value > 1 && !isPrevLoadPending) {
        isPrevLoadPending = true;
        prevScrollHeight = virtualWrap.value?.scrollHeight ?? 0;

        startPage.value--;
        emit('loadPrevData', { page: startPage.value, pageSize: props.perLoadNum });

        if (isExceedLimitData.value) {
          sliceBottomPage();
        }
      }
    },
    {
      root: virtualWrap.value,
      rootMargin: OBSERVER_ROOT_MARGIN
    }
  );

  stopHandlers.push(stop);
};

const initVirtualScrollHandler = async () => {
  if (props.total <= 0) return;

  // 先清理舊的 observer，避免 watch(total) 重複建立導致疊加
  stopHandlers.forEach((stop) => stop());
  stopHandlers.length = 0;

  await nextTick();

  // 加載新頁面
  loadNextPage();

  // 加載之前刪除的頁面
  if (!props.singleSide) {
    loadPrevPage();
  }
};

const sliceTopPage = () => {
  list.value.splice(0, OFFSET * props.perLoadNum);
  startPage.value += OFFSET;
};

const sliceBottomPage = () => {
  list.value.splice(-(OFFSET * props.perLoadNum), props.perLoadNum);
  endPage.value -= OFFSET;
};

watch(
  () => props.total,
  () => {
    initVirtualScrollHandler();
  }
);

onMounted(() => {
  initVirtualScrollHandler();
});

onUnmounted(() => {
  stopHandlers.forEach((stop) => stop());
});

defineExpose({
  virtualWrap
});
</script>
