<template>
  <div class="w-full">
    <div class="w-full relative mb-[5px]">
      <!-- progress bar -->
      <div class="relative h-[6px] bg-[#ddd] w-full">
        <div
          class="absolute top-0 h-full z-[2] rounded-[8px] pointer-events-none bg-secondary"
          :style="{ left: leftLength, right: rightLength }"
        ></div>
      </div>
      <input
        type="range"
        class="absolute top-[50%] translate-y-[-50%] h-full w-full z-[1] bg-transparent pointer-event-none appearance-none start range-slider-thumb pointer-events-none"
        v-model.number="start"
        :min="$props.min"
        :max="$props.max"
        @input="change($event, 'start')"
      />
      <input
        type="range"
        class="absolute top-[50%] translate-y-[-50%] h-full w-full z-[1] bg-transparent pointer-event-none appearance-none end range-slider-thumb pointer-events-none"
        v-model.number="end"
        :min="$props.min"
        :max="$props.max"
        @input="change($event, 'end')"
      />
      <!-- $emit('update:end', Number(($event.target as HTMLInputElement)?.value)); -->
    </div>
    <!-- <div class="w-full flex justify-between">
      <input class="mt-[5px] w-[35%] text-center input price" v-model="start" :disabled="true" />
      <input class="mt-[5px] w-[35%] text-center input price" v-model="end" :disabled="true" />
    </div> -->
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  min: number;
  max: number;
}>();
const start = defineModel<number>('start', {
  required: true
});
const end = defineModel<number>('end', {
  required: true
});

const leftLength = ref('0%');
const rightLength = ref('0%');

const gap = 1;
// const isOverLimit = computed(() => end.value - start.value < gap);
const lengthCalc = (e: Event, option: 'end' | 'start') => {
  if (end.value - start.value < gap) return;
  // slider 長度計算
  if (option === 'start') {
    leftLength.value = `${Math.floor(((start.value - props.min) / Number(props.max - props.min)) * 100)}%`;
  } else {
    rightLength.value = `${100 - ((end.value - props.min) / (props.max - props.min)) * 100}%`;
  }
};

const gapCalc = (e: Event, option: 'end' | 'start') => {
  // 界線計算
  if (end.value - start.value < gap) {
    if (option === 'start') {
      start.value = end.value - gap;
    } else {
      end.value = start.value + gap;
    }
  }
};

const change = (e: Event, option: 'end' | 'start') => {
  lengthCalc(e, option);
  gapCalc(e, option);
};
</script>

<style scoped>
.range-slider-thumb::-webkit-slider-thumb {
  appearance: none;
  height: 15px;
  width: 15px;
  border-radius: 50%;
  background: #007bff;
  pointer-events: auto;
}
</style>
