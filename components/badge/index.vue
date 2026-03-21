<script setup lang="ts">
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

interface Props {
  variant?: BadgeVariant;
  pill?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  pill: false
});

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-red-500 text-white',
  secondary: 'bg-gray-500 text-white',
  success: 'bg-green-500 text-white',
  danger: 'bg-red-600 text-white',
  warning: 'bg-yellow-400 text-black',
  info: 'bg-blue-500 text-white'
};
</script>

<template>
  <span
    :class="[
      variantClasses[props.variant],
      'min-w-3 inline-flex justify-center items-center px-2 py-1 text-xs font-semibold leading-none rounded-[10px]'
    ]"
  >
    <slot />
  </span>
</template>
