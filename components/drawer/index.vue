<template>
  <aside class="bg-white border border-solid border-gray-300 relative">
    <div
      class="w-[25px] h-[25px] flex justify-center items-center border border-solid border-gray-300 rounded-l-sm absolute -translate-x-[100%]"
    >
      <client-only>
        <font-awesome-icon v-if="needCollapse" :icon="['fas', 'angle-left']" class="text-[1.2rem] cursor-pointer" />
      </client-only>
    </div>
    <div>
      <slot></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    needCollapse?: boolean;
  }>(),
  {
    needCollapse: false
  }
);
</script>

<style scoped lang="scss">
.aside {
  /* 右側 drawer（陰影往左）*/
  // box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);

  /* 左側 drawer（陰影往右） */
  // box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
}
</style>
