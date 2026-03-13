import type { Pagination } from './common';
export interface GetMessageRecord extends Pagination {
  senderId: string;
  receiverId: string | string[];
}

export interface Message {
  senderId: string;
  receiverId: string;
  message: string;
  sendTime: number;
  status?: 'sending' | 'success' | 'failed';
  localId?: string;
}

export type PreviewMessage = Record<string, Message & { friendId: string }>;
