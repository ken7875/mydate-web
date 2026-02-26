<template>
  <div>
    <label :value="$props.modelValue" :for="label" class="block text-[14px]">{{ label }}</label>
    <div class="relative">
      <div class="absolute top-1/2 -translate-y-1/2 left-[10px]">
        <slot name="suffix"></slot>
      </div>
      <input
        v-bind="{ ...$attrs }"
        :disabled="disabled"
        type="text"
        :class="['input', { 'px-[28px]': $slots.suffix, input__error: error, input__disabled: disabled }]"
        @input="(e: Event) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
      />
    </div>
    <p class="text-text-error font-bold" v-if="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | number;
  label?: string;
  error?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false
});
const { label } = toRefs(props);
</script>
