<template>
  <div class="overlay" @click.stop.self.prevent="handleAction('cancel')">
    <Card
      :class="[
        'relative z-message lg:w-[35%] px-8 py-4 animate-scale top-[30%] left-1/2 -translate-x-1/2 flex flex-col',
        type
      ]"
      :style="{
        width: $props.width,
        height: $props.height
      }"
    >
      <template #header>
        <div class="flex items-center w-full border-b border-darkLight">
          <h3 class="font-bold text-[1.5rem] flex-1">{{ title }}</h3>
          <div @click="handleAction('cancel')">
            <client-only>
              <font-awesome-icon :icon="['fas', 'xmark']" class="text-[1.5rem] cursor-pointer" />
            </client-only>
          </div>
        </div>
      </template>
      <template #body>
        <div class="py-[15px]">
          <div v-if="$slots.body">
            <slot name="body"></slot>
          </div>
          <component v-if="isVNode(content)" :is="() => content" class="text-[1.2rem]" />
          <p v-else class="text-[1.2rem]" ref="normalContent">
            {{ content }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="mt-auto w-full flex justify-end border-t border-darkLight py-2">
          <template v-if="$slots.footer">
            <slot name="footer"></slot>
          </template>
          <template v-else-if="!$slots.footer && hasBtn">
            <BaseButton @click="handleAction('cancel')" class="h-10 w-20 mr-3" :styleType="'cancel'" v-if="hasCancel"
              >取消</BaseButton
            >
            <BaseButton v-if="hasSubmit" @click="handleAction('confirm')" :styleType="'confirm'" class="h-10 w-20"
              >確認</BaseButton
            >
          </template>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { isVNode, type VNode } from 'vue';
import Card from '~~/components/card/index.vue';

defineOptions({
  name: 'message'
});

const props = withDefaults(
  defineProps<{
    title: string;
    content: string | VNode;
    type?: 'normal' | 'success' | 'warning' | 'error';
    hasSubmit?: boolean;
    hasBtn?: boolean;
    hasCancel?: boolean;
    onSave?: () => void;
    onClose?: () => void;
    onDestroy?: () => void;
    width?: string;
    height?: string;
  }>(),
  {
    hasSubmit: true,
    hasBtn: true,
    hasCancel: true,
    type: 'normal',
    width: '80%',
    height: '200px'
  }
);

const handleAction = useThrottleFn((action: 'confirm' | 'cancel') => {
  if (action === 'confirm') {
    props?.onSave?.();
  } else if (action === 'cancel') {
    props?.onClose?.();
  }
}, 500);
</script>
