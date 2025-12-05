import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Config } from '~/utils/message/types';
import { messageTool } from '~/utils/message';

export const useMessageStore = defineStore('message', () => {
  const messageMap = ref(new Map<string, Config>());

  const openMessage = (config: Config) => {
    if (messageMap.value.has(config.content)) return;
    messageMap.value.set(config.content, config);

    return messageTool()
      .openMessage(config)
      .finally(() => {
        messageMap.value.delete(config.content);
      });
  };

  return {
    messageMap,
    openMessage
  };
});
