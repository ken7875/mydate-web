<template>
  <button v-bind="{ ...$attrs }" :class="$props.styleType ? styleMap[$props.styleType] : ''">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineOptions({
  name: 'base-button'
});

const styleMap = computed(() => ({
  default: 'button button__outline-primary',
  confirm: 'button button__primary',
  cancel: 'button button__outline-primary',
  danger: 'button button__error',
  neutral: 'button button__gray'
}));

withDefaults(
  defineProps<{
    styleType?: keyof typeof styleMap.value;
  }>(),
  {
    styleType: 'default'
  }
);
</script>
