import Message from '@/components/message/index.vue';

interface MsgConfig {
  onSave: (fn: () => void) => void;
  onClose: (fn: () => void) => void;
  onDestroy: () => void;
}

export type MessageProps = InstanceType<typeof Message>['$props'] & MsgConfig;
export type Config = Omit<InstanceType<typeof Message>['$props'], 'onSave' | 'onClose' | 'onDestroy'>;
