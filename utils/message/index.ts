import { render } from 'vue';
// import type { VNodeProps } from 'vue';
import type { MessageProps, Config } from './types';
import Message from '@/components/message/index.vue';
import popup from '@/utils/popup';

export const messageTool = () => {
  // const showingMessage = shallowRef<MessageProps>({
  //   title: '訊息',
  //   content: '',
  //   type: 'normal',
  //   hasSubmit: true,
  //   hasBtn: true,
  //   hasCancel: false,
  //   onSave: () => {},
  //   onClose: () => {},
  //   onDestroy: () => {}
  // });
  let showingMessage: MessageProps = {
    title: '訊息',
    content: '',
    type: 'normal',
    hasSubmit: true,
    hasBtn: true,
    hasCancel: false,
    onSave: () => {},
    onClose: () => {},
    onDestroy: () => {}
  };

  const beforeClose = (actionHanlder: (value: unknown) => void, action: 'confirm' | 'reject') => {
    actionHanlder(action);
    showingMessage?.onDestroy();
  };

  // Omit<MessageProps, 'onSave' | 'onClose' | 'onDestroy'>
  const openMessage = (config: Config) => {
    // if (!appContext) {
    //   throw new Error('internal Error: 請在元件中使用');
    // }

    return new Promise((resolve, reject) => {
      // // render
      const container = document.createElement('div');

      showingMessage = {
        type: 'normal',
        ...config,
        onSave: () => beforeClose(resolve, 'confirm'),
        onClose: () => beforeClose(reject, 'reject'),
        onDestroy: () => {
          render(null, container);
          document.body.removeChild(container);
        }
      };
      popup(container, Message, showingMessage);
      // const vnode = createVNode(Message, showingMessage.value as VNodeProps);
      // const nuxtInstance = tryUseNuxtApp();
      // vnode.appContext = nuxtInstance?.vueApp?._context || null;

      // document.body.appendChild(container);
      // render(vnode, container);
    });
  };

  return {
    openMessage
  };
};
