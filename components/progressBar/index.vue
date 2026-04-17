<template>
  <div class="w-full">
    <div
      data-test="progress-track"
      role="progressbar"
      :aria-valuenow="percentage"
      aria-valuemin="0"
      :aria-valuemax="max"
      class="bg-bg rounded-full overflow-hidden relative border border-gray-300"
      :style="{ height: props.height }"
    >
      <div
        data-test="progress-fill"
        class="absolute inset-y-0 rounded-full transition-all duration-300 ease-out"
        :class="['bg-(--color-success)', direction === 'rightToLeft' ? 'right-0' : 'left-0']"
        :style="{ width: percentage + '%' }"
      ></div>
      <div
        v-if="!isComplete"
        data-test="progress-shimmer"
        class="absolute inset-y-0 overflow-hidden"
        :style="
          direction === 'rightToLeft' ? { right: percentage + '%', left: '0' } : { left: percentage + '%', right: '0' }
        "
      >
        <div class="shimmer-inner"></div>
      </div>
    </div>
    <span v-if="showLabel" data-test="progress-label" class="text-sm text-(--color-gray)"> {{ percentage }}% </span>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'progress-bar' });

const props = withDefaults(
  defineProps<{
    value?: number;
    max?: number;
    height?: string;
    showLabel?: boolean;
    variant?: 'primary' | 'success';
    direction?: 'leftToRight' | 'rightToLeft';
  }>(),
  {
    value: 0,
    max: 100,
    height: '12px',
    showLabel: true,
    variant: 'primary',
    direction: 'leftToRight'
  }
);

const percentage = computed(() => {
  if (props.max <= 0) return 0;
  return Math.min(Math.round((props.value / props.max) * 100), 100);
});

const isComplete = computed(() => percentage.value >= 100);
</script>

<style scoped>
.shimmer-inner {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
