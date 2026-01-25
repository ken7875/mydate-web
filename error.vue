<template>
  <div class="flex flex-col items-center w-full h-screen mt-[30%]">
    <h2 class="text-[70px] text-primary">錯誤</h2>
    <p class="text-[50px] mb-[20px]">{{ $props.error?.message }}</p>
    <BaseButton styleType="cancel" @click="backToMeetPage">返回</BaseButton>
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

const backToMeetPage = () => {
  clearError({ redirect: '/meet' });
};
</script>
