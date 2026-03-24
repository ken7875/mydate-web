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
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
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
    fetchPrevHandler?: () => any;
    fetchNewHandler?: () => any;
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
  (e: 'loadNewData', payload: { page: number; pageSize: number }): void;
  (e: 'loadPrevData', payload: { page: number; pageSize: number }): void;
}>();

const OFFSET = 1;
const OBSERVER_ROOT_MARGIN = '50px 0px 50px 0px';
const listBottom = useTemplateRef('listBottom');
const listTop = useTemplateRef('listTop');

// const totalPage = computed(() => Math.ceil(props.total / props.perLoadNum));
// const startPage = ref(props.isReverse ? totalPage.value : 1);
// const endPage = ref(props.isReverse ? totalPage.value : 1);
const startIdx = ref(0);
const endIdx = ref(props.perLoadNum);
const stopHandlers: (() => void)[] = [];

// 數窗內最多限制DOM筆數（用實際渲染筆數，避免最後一頁不足 perLoadNum 時計算錯誤）
const isExceedLimitData = computed(() => virtualListData.value.length > props.perLoadNum * props.maxPageCount);

const virtualListData = computed(() => props.totalData.slice(startIdx.value, endIdx.value));

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
        if (props.totalData.length < props.total) {
          await props?.fetchNewHandler?.();
          endIdx.value = props.totalData.length;
        } else {
          if (endIdx.value + props.perLoadNum > props.total) {
            endIdx.value = props.total;
          } else {
            endIdx.value += props.perLoadNum;
          }
        }

        emit('loadNewData', { page: endIdx.value, pageSize: props.perLoadNum });

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

// totalData 更新後：
// 1. 修正 endIdx 上限（最後一頁不足 perLoadNum 時 endIdx 可能超出範圍）
// 2. 延遲檢查視窗是否超過 maxPageCount，確保 isExceedLimitData 拿到的是更新後的資料
// watch(
//   () => props.totalData.length,
//   (newLen) => {
//     if (endIdx.value > newLen) {
//       endIdx.value = newLen;
//     }
//     if (isExceedLimitData.value) {
//       sliceBottomPage();
//     }
//   }
// );

// 監聽 list 第一筆 idx 變化確認 prepend 實際完成，再補正 scrollTop
watch(
  () => virtualListData.value[0]?.idx,
  async (newIdx, oldIdx) => {
    if (!isPrevLoadPending || newIdx === oldIdx) return;
    if (virtualWrap.value) {
      virtualWrap.value.scrollTop += 1000;
    }
    isPrevLoadPending = false;
  },
  {
    flush: 'post'
  }
);

// 視窗往上滑
const viewSlideUp = () => {
  let initialized = false;
  const { stop } = useIntersectionObserver(
    listTop.value,
    async ([{ isIntersecting }]) => {
      if (!initialized) {
        initialized = true;
        return;
      }

      // const oldestData = props.isReverse ? endIdx.value >= props.total : startIdx.value <= 0;
      if (isIntersecting) {
        isPrevLoadPending = true;

        if (props.totalData.length < props.total) {
          await props?.fetchPrevHandler?.();
          startIdx.value = 0;
        } else {
          startIdx.value - props.perLoadNum < 0 ? (startIdx.value = 0) : (startIdx.value -= props.perLoadNum);
        }

        emit('loadPrevData', { page: endIdx.value, pageSize: props.perLoadNum });
        if (isExceedLimitData.value) {
          sliceBottomPage();
        }

        prevScrollHeight = virtualWrap.value?.scrollHeight ?? 0;
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

const updateIndexWithTotal = async (total: number, preTotal: number) => {
  const diff = total - preTotal;
  if (endIdx.value === virtualListData.value.length || endIdx.value === props.totalData.length) {
    endIdx.value += diff;
  }
};

watch(
  () => props.total,
  (newVal, oldVal) => {
    console.log(props.total, '234yr8we9ufhwei');
    if (!isVirtualScrollInited) {
      initVirtualScrollHandler();
    }
    updateIndexWithTotal(newVal, oldVal);
  }
);

// 若是從最下方開始顯示新資料，剛進頁面直接幫用戶跳到最下層
const scrollToBottom = () => {
  if (props.isReverse && virtualWrap.value) {
    virtualWrap.value.scrollTop = virtualWrap.value?.scrollHeight;
  }
};

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
