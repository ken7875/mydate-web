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
  confirm: 'button button__primary',
  cancel: 'button button__outline-primary'
}));

defineProps<{
  styleType?: keyof typeof styleMap.value;
}>();
</script>

<!-- <style scoped lang="scss">
.
</style> -->
