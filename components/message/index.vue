<template>
  <div class="popup-shadow" @click.stop.self.prevent="handleAction('cancel')">
    <Card
      :class="[
        'relative z-message lg:w-[35%] w-[80%] h-[200px] px-[2rem] py-[1rem] animate-scale top-[30%] left-1/2 -translate-x-1/2',
        type
      ]"
    >
      <template #header>
        <h3 class="font-bold text-[1.5rem] mb-[15px] border-b border-darkLight">{{ title }}</h3>
      </template>
      <template #body>
        <div>
          <div>
            <div @click="handleAction('cancel')" class="absolute top-[3%] right-[3%]">
              <client-only>
                <font-awesome-icon :icon="['fas', 'xmark']" class="text-[1.5rem] cursor-pointer" />
              </client-only>
            </div>
            <p class="text-[1.2rem]" ref="normalContent">
              {{ content }}
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="absolute bottom-0 w-full flex justify-end border-t border-darkLight py-2" v-if="hasBtn">
          <BaseButton
            @click="handleAction('cancel')"
            class="h-[40px] w-[80px] mr-3"
            :styleType="'cancel'"
            v-if="hasCancel"
            >取消</BaseButton
          >
          <BaseButton v-if="hasSubmit" @click="handleAction('confirm')" :styleType="'confirm'" class="h-10 w-20"
            >確認</BaseButton
          >
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '~~/components/card/index.vue';

defineOptions({
  name: 'message'
});

const props = withDefaults(
  defineProps<{
    title: string;
    content: string;
    type?: 'normal' | 'success' | 'warning' | 'error';
    hasSubmit?: boolean;
    hasBtn?: boolean;
    hasCancel?: boolean;
    onSave?: () => void;
    onClose?: () => void;
    onDestroy?: () => void;
  }>(),
  {
    hasSubmit: true,
    hasBtn: true,
    hasCancel: true,
    type: 'normal'
  }
);

const handleAction = (action: 'confirm' | 'cancel') => {
  if (action === 'confirm') {
    props?.onSave?.();
  } else if (action === 'cancel') {
    props?.onClose?.();
  }
};
</script>
