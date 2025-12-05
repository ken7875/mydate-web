<template>
  <div>
    <div @click="dropDownTrigger">
      <slot name="trigger"></slot>
    </div>
    <!-- v-show="isDropDownOpen" -->
    <div class="bg-white rounded-sm w-[30%]">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['onClose', 'onOpen']);

const isDropDownOpen = ref(false);
const dropDownTrigger = () => {
  isDropDownOpen.value = !isDropDownOpen.value;
  console.log(isDropDownOpen.value);
  if (isDropDownOpen.value) {
    emit('onOpen');
  } else {
    emit('onClose');
  }
};
</script>
