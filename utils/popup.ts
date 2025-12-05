import { createVNode, render } from 'vue';
import type { VNodeProps } from 'vue';

export default (container: HTMLDivElement, component: Component, props: VNodeProps) => {
  const vnode = createVNode(component, props as VNodeProps);
  const nuxtInstance = tryUseNuxtApp();
  vnode.appContext = nuxtInstance?.vueApp?._context || null;

  document.body.appendChild(container);
  render(vnode, container);
};
