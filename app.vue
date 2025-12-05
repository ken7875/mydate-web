<template>
  <NuxtLayout>
    <NuxtPage />
    <Loading v-show="loadingState"></Loading>
  </NuxtLayout>
</template>

<script setup lang="ts">
import useLoadingState from './composables/loading/loadingState';

const loadingState = useLoadingState();
</script>
