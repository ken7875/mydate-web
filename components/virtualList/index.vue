<template>
  <ul ref="virtualWrap" class="h-full overflow-scroll">
    <li ref="listTop" v-if="loadTop" data-test="listTop"></li>
    <li v-for="(item, index) in virtualListData" :key="item.idx" :data-test="item.idx" :class="listClass">
      <slot :item="item" :key="item.idx" :index="index"></slot>
    </li>
    <li ref="listBottom" v-if="loadDown" data-test="listDown"></li>
  </ul>
</template>

<script setup lang="ts" generic="T extends { idx: string }">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import type { Pagination } from '~/api/types/common';
// import type { PagingRequest } from '@/api/types/';

const props = withDefaults(
  defineProps<{
    totalData: T[];
    perLoadNum?: number;
    total: number;
    maxPageCount?: number;
    singleSide?: boolean;
    loadTop?: boolean;
    loadDown?: boolean;
    listClass?: string;
    isReverse?: boolean;
    fetchPrevHandler?: (pagination: Pagination) => any;
    fetchNewHandler?: (pagination: Pagination) => any;
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

const emit = defineEmits<{
  (e: 'loadNewData', payload: Pagination): void;
  (e: 'loadPrevData', payload: Pagination): void;
}>();

const OFFSET = 1;
const OBSERVER_ROOT_MARGIN = '30px 0px 30px 0px';
const listBottom = useTemplateRef('listBottom');
const listTop = useTemplateRef('listTop');

const currentPage = ref(1);
const totalPage = computed(() => props.total / props.perLoadNum);
const maxItemCount = computed(() => props.perLoadNum * props.maxPageCount);
const startIdx = ref(0);
const endIdx = ref(props.perLoadNum);
const stopHandlers: (() => void)[] = [];

const virtualListData = computed(() => props.totalData.slice(startIdx.value, endIdx.value));

// 數窗內最多限制DOM筆數（用實際渲染筆數，避免最後一頁不足 perLoadNum 時計算錯誤）
const isExceedLimitData = computed(() => virtualListData.value.length > maxItemCount.value);

// 視窗往下滑
const viewSlideDown = () => {
  let initialized = false;
  const target = props.singleSide ? (props.loadTop ? listTop.value : listBottom.value) : listBottom.value;
  const { stop } = useIntersectionObserver(
    target,
    async ([{ isIntersecting }]) => {
      if (!initialized) {
        initialized = true;
        return;
      }

      if (isIntersecting) {
        if (currentPage.value === totalPage.value) return;
        currentPage.value++;
        if (props.totalData.length < props.total && !props.isReverse) {
          await props?.fetchNewHandler?.({ page: currentPage.value, pageSize: props.perLoadNum });
          endIdx.value = props.totalData.length;
        } else {
          endIdx.value = Math.min(endIdx.value + props.perLoadNum, props.total);
        }

        emit('loadNewData', { page: currentPage.value, pageSize: props.perLoadNum });

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

// let isPrevLoadPending = false;
// let prevScrollHeight = 0;

// 監聽 list 第一筆 idx 變化確認 prepend 實際完成，再補正 scrollTop
// watch(
//   () => virtualListData.value[0]?.idx,
//   async (newIdx, oldIdx) => {
//     if (!isPrevLoadPending || newIdx === oldIdx) return;
//     if (virtualWrap.value) {
//       virtualWrap.value.scrollTop += 1000;
//     }
//     isPrevLoadPending = false;
//   },
//   {
//     flush: 'post'
//   }
// );

// 視窗往上滑
const viewSlideUp = () => {
  let initialized = false;
  let heightBefore = virtualWrap.value?.scrollHeight || 0;
  const { stop } = useIntersectionObserver(
    listTop.value,
    async ([{ isIntersecting }]) => {
      if (!initialized) {
        initialized = true;
        return;
      }

      if (isIntersecting) {
        // 若是 reverse 且資料尚未全數快取，向後端請求前一頁
        if (props.isReverse && props.totalData.length < props.total) {
          await props?.fetchPrevHandler?.({ page: ++currentPage.value, pageSize: props.perLoadNum });
          startIdx.value = 0;
          compensateScrollAfterPrepend(heightBefore);
        } else if (!props.isReverse || currentPage.value > 1) {
          startIdx.value = Math.max(startIdx.value - props.perLoadNum, 0);
          currentPage.value--;
          if (startIdx.value > 0) {
            compensateScrollAfterPrepend(heightBefore);
          }
        }

        if (currentPage.value <= 1) return;
        emit('loadPrevData', { page: currentPage.value, pageSize: props.perLoadNum });

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

let isVirtualScrollInited = false;
const initVirtualScrollHandler = async () => {
  if (props.total <= 0 || isVirtualScrollInited) return;
  isVirtualScrollInited = true;

  // 先清理舊的 observer，避免 watch(total) 重複建立導致疊加
  stopHandlers.forEach((stop) => stop());
  stopHandlers.length = 0;

  // 加載新頁面
  viewSlideDown();

  // 加載之前刪除的頁面
  if (!props.singleSide) {
    viewSlideUp();
  }
};

const sliceTopPage = () => {
  startIdx.value += props.perLoadNum * OFFSET;
};

const sliceBottomPage = () => {
  endIdx.value -= props.perLoadNum * OFFSET;
};

// 向上滑動載入新資料後回彈到當前位置
// 在 nextTick 前同步捕捉高度，確保拿到的是 DOM 更新前的舊高度
const compensateScrollAfterPrepend = async (heightBefore: number) => {
  await nextTick();
  if (!virtualWrap.value) return;

  // const heightBefore = virtualWrap.value.scrollHeight;
  virtualWrap.value.scrollTop += heightBefore;
};

const updateIndexWithTotal = async (total: number, preTotal: number) => {
  const diff = total - preTotal;
  if (endIdx.value === virtualListData.value.length || endIdx.value === props.totalData.length) {
    if (endIdx.value + diff > maxItemCount.value) {
      endIdx.value = maxItemCount.value;
    } else {
      endIdx.value += diff;
    }
  }
};

// 若是從最下方開始顯示新資料，剛進頁面直接幫用戶跳到最下層
const scrollToBottom = () => {
  if (props.isReverse && virtualWrap.value) {
    virtualWrap.value.scrollTop = virtualWrap.value?.scrollHeight;
  }
};

watch(
  () => [props.totalData, props.total],
  async () => {
    if (!isVirtualScrollInited) {
      initVirtualScrollHandler();
    }
  }
);

watch(
  () => props.total,
  (newVal, oldVal) => {
    updateIndexWithTotal(newVal, oldVal);
  }
);

watch(
  () => props.totalData,
  (val) => {
    if (val.length > 0) {
      nextTick(() => {
        scrollToBottom();
      });
    }
  },
  {
    once: true
  }
);

onMounted(() => {
  scrollToBottom();
  initVirtualScrollHandler();
});

onUnmounted(() => {
  stopHandlers.forEach((stop) => stop());
});

defineExpose({
  virtualWrap
});
</script>
