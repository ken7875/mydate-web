import type { Pagination } from './common';
import type { User } from './user';
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

export interface WsMessage {
  user: User;
  message: Message[];
}

export type PreviewMessage = Record<string, Message & { friendId: string }>;
