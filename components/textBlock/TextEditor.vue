<template>
  <!-- <div @input="$emit('update:text', ($event.target as HTMLInputElement)?.textContent)"></div> -->
  <client-only>
    <textBlock />
  </client-only>
</template>

<script setup lang="ts">
interface Props {
  text: string | number;
  textTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
}

const props = defineProps<Props>();
const emit = defineEmits(['update:text']);
const textBlock = h(props.textTag, {
  class: 'outline-none',
  placeholder: 'Press ‘space’ for AI, ‘/’ for commands…',
  contenteditable: 'true',
  onInput: ($event: Event) => emit('update:text', ($event.target as HTMLInputElement)?.textContent)
});
// const emit = defineEmits(['update:text']);

// const inputHandler = ($event: Event) => {
//   emit('update:text', ($event.target as HTMLInputElement)?.textContent);
// };
</script>
