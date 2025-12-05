<template>
  <div class="flex items-center">
    <input
      type="checkbox"
      v-model="modelValue"
      :class="['w-[25px] h-[25px]', $attrs.class]"
      :true-value="trueValue"
      :false-value="falseValue"
    />
    <label :for="label" class="ml-2 text-[1.2rem]">{{ label }}</label>
  </div>
  <p v-if="error" class="error">{{ error }}</p>
</template>

<script lang="ts">
export default {
  inheritAttrs: false
};
</script>
<script setup lang="ts">
interface Props {
  label?: string;
  error?: string;
  trueValue?: unknown;
  falseValue?: unknown;
}

const modelValue = defineModel({ required: true });

defineProps<Props>();
// const { label, modelValue, error } = toRefs(props);
</script>
