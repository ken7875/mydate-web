<template>
  <Teleport to="body">
    <div class="overlay" @click.stop.self.prevent="closePopoutFunc" data-test="modal-shadow">
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
          <div class="pt-10 h-full overflow-hidden">
            <div class="text-center text-[1.5rem] font-bold mb-6 h-6" data-test="modal-title" v-if="$slots.title">
              <slot name="title" />
            </div>
            <div class="overflow-x-hidden h-[calc(100%-3rem)]" data-test="modal-body">
              <slot />
            </div>
            <div v-if="needOperationBtn">
              <BaseButton :styleType="'confirm'" @click="confirm">確認</BaseButton>
              <BaseButton :styleType="'cancel'" @click="cancel">取消</BaseButton>
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

withDefaults(
  defineProps<{
    needOperationBtn: boolean;
  }>(),
  {
    needOperationBtn: true
  }
);

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
