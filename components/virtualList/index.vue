<template>
  <ul ref="virtualWrap" class="h-full overflow-scroll">
    <li ref="listTop" v-if="loadTop" data-test="listTop"></li>
    <li v-for="(item, index) in list" :key="item.idx" :data-test="item.idx" :class="listClass">
      <slot :item="item" :key="item.idx" :index="index"></slot>
    </li>
    <li ref="listBottom" v-if="loadDown" data-test="listDown"></li>
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
    maxPageCount?: number;
    singleSide?: boolean;
    loadTop?: boolean;
    loadDown?: boolean;
    listClass?: string;
    isReverse?: boolean;
  }>(),
  {
    perLoadNum: 20,
    visible: true,
    maxPageCount: 4,
    loadTop: true,
    loadDown: true,
    singleSide: false,
    listClass: '',
    isReverse: false
  }
);

const list = defineModel<any[]>('list', { required: true });

const emit = defineEmits<{
  (e: 'loadNewData', payload: { page: number; pageSize: number }): void;
  (e: 'loadPrevData', payload: { page: number; pageSize: number }): void;
}>();

const OFFSET = 1;
const listBottom = useTemplateRef('listBottom');
const listTop = useTemplateRef('listTop');
const startPage = ref(1);
const endPage = ref(1);
// const initialized = ref(false);

// const initialize = () => {
//   if (!initialized.value && props.visible) {
//     emit('loadNewData', { page: endPage.value, pageSize: props.perLoadNum });
//     initialized.value = true;
//   }
// };

let stopNewPageVirtualListHandler: () => void = () => {};
let stopPrevPageVirtualListHandler: () => void = () => {};

// 數窗內最多限制DOM筆數
const isExceedLimitData = computed(() => endPage.value - startPage.value >= props.maxPageCount);
const totalPage = computed(() => Math.ceil(props.total / props.perLoadNum));

const loadNextPage = () => {
  const target = props.singleSide ? (props.loadTop ? listTop.value : listBottom.value) : listBottom.value;
  const { stop } = useIntersectionObserver(
    target,
    ([{ isIntersecting }]) => {
      if (isIntersecting && endPage.value <= totalPage.value) {
        if (props.isReverse) {
          if (startPage.value <= 1) return;

          startPage.value--;
          emit('loadNewData', { page: startPage.value, pageSize: props.perLoadNum });
        } else {
          if (endPage.value >= totalPage.value) return;

          endPage.value++;
          emit('loadNewData', { page: endPage.value, pageSize: props.perLoadNum });
        }

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
      rootMargin: '0px 0px 30px 0px' // 提前 30px 觸發
    }
  );

  stopNewPageVirtualListHandler = stop;
};

const virtualWrap = useTemplateRef('virtualWrap');
async function maintainScrollAfterPrepend() {
  await nextTick();
  if (!virtualWrap.value) return;
  virtualWrap.value!.scrollTop += 100; // 補償捲動距離
}

const loadPrevPage = () => {
  const { stop } = useIntersectionObserver(
    listTop.value,
    ([{ isIntersecting }]) => {
      if (isIntersecting && startPage.value >= 1) {
        if (props.isReverse) {
          if (endPage.value >= totalPage.value) return;

          endPage.value++;
          emit('loadPrevData', { page: endPage.value, pageSize: props.perLoadNum });
        } else {
          if (startPage.value <= 1) return;

          startPage.value--;
          emit('loadPrevData', { page: startPage.value, pageSize: props.perLoadNum });
        }

        maintainScrollAfterPrepend();
        if (isExceedLimitData.value) {
          sliceBottomPage();
        }
      }
    },
    {
      root: virtualWrap.value,
      rootMargin: '0px 0px 30px 0px' // 提前 10px 觸發
    }
  );

  stopPrevPageVirtualListHandler = stop;
};

const initVirtualScrollHandler = async () => {
  if (props.total <= 0) return;
  await nextTick();

  // 加載新頁面
  loadNextPage();

  // 加載之前刪除的頁面
  if (!props.singleSide) {
    loadPrevPage();
  }
};

const sliceTopPage = () => {
  list.value.splice(0, props.perLoadNum);
  endPage.value -= OFFSET;
};

const sliceBottomPage = () => {
  list.value.splice(list.value.length - OFFSET * props.perLoadNum, props.perLoadNum);
  startPage.value += OFFSET;
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
  stopNewPageVirtualListHandler();
  stopPrevPageVirtualListHandler();
});

defineExpose({
  virtualWrap
});
</script>
