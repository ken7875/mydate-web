<template>
  <div>
    <p>loading...</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  error: Object
});

console.error('my date web', props.error);

if (props.error?.code === 401) {
  clearError({ redirect: '/auth/login' });
}
</script>
