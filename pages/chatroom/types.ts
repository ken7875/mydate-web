import type { Message } from '~/api/types/chat';

type BaseMessage = Message & {
  idx: string;
};

type ImageMessage = BaseMessage & {
  type: 'image';
  progressLoad: number; // image 時必填
};

type OtherMessage = BaseMessage & {
  type: Exclude<Message['type'], 'image'>;
  progressLoad?: never; // image 以外時不可用
};

export type MessageWithProgress = ImageMessage | OtherMessage;
