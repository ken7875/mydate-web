<template>
  <div class="relative w-fit" v-bind="$attrs">
    <div
      :style="{
        top: $props.top,
        right: $props.right,
        bottom: $props.bottom,
        left: $props.left
      }"
      :class="[
        `absolute bg-primary flex justify-center items-center rounded-[50%] text-white text-[10px] ${
          $props.nums ? 'w-[15px] h-[15px]' : 'w-[8px] h-[8px]'
        }`
      ]"
    >
      <span>{{ $props.nums }}</span>
    </div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    nums?: number;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  }>(),
  {
    top: '-8px',
    right: '-7px',
    bottom: '',
    left: ''
  }
);
</script>
