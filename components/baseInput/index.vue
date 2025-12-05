<template>
  <div>
    <label :value="$props.modelValue" :for="label" class="block text-[14px]">{{ label }}</label>
    <div class="relative">
      <div class="absolute top-1/2 -translate-y-1/2 left-[10px]">
        <slot name="suffix"></slot>
      </div>
      <input
        v-bind="{ ...$attrs }"
        type="text"
        :class="['outline-none bg-slate-100 border-2 rounded-[4px] p-[6px]', { 'px-[28px]': $slots.suffix }]"
        @input="(e: Event) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
      />
    </div>
    <p :class="['text-red-500 font-bold']" v-if="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string | number;
  label?: string;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: ''
});
const { label } = toRefs(props);
// withDefaults(defineProps<Props>(), {
//     blockLabel
// });
// const emit = defineEmits<{
//   (e: 'update:modelValue', value: string | number): void;
// }>();
</script>
