<template>
  <Teleport to="body">
    <div class="popup-shadow" @click.stop.self.prevent="closePopoutFunc" v-if="isOpen" data-test="modal-shadow">
      <Card
        :class="[
          'overflow-scroll bg-white rounded-lg h-[90vh] w-[90vw] relative z-modal animate-scale top-[50%] left-[50%] -translate-1/2 p-3'
        ]"
        v-bind="$attrs"
      >
        <template #body>
          <div class="text-[2rem] absolute top-[3px] right-[10px]" @click="closePopoutFunc">
            <font-awesome-icon :icon="['fas', 'xmark']" class="cursor-pointer" />
          </div>
          <div class="pt-[2.5rem] h-full overflow-hidden">
            <div class="text-center text-[1.5rem] font-bold mb-[1.5rem] h-[1.5rem]" data-test="modal-title">
              <slot name="title" />
            </div>
            <div class="overflow-x-hidden h-[calc(100%-3rem)]" data-test="modal-body">
              <slot />
            </div>
            <div>
              <BaseButton @click="confirm">確認</BaseButton>
              <BaseButton @click="cancel">取消</BaseButton>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});

const emit = defineEmits(['confirm', 'cancel']);
const isOpen = defineModel('isOpen', { required: true, default: false });
const closePopoutFunc = () => {
  isOpen.value = false;
};

const confirm = () => {
  emit('confirm');
  closePopoutFunc();
};
const cancel = () => {
  emit('cancel');
  closePopoutFunc();
};
</script>
