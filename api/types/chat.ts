import type { Pagination } from './common';
import type { Friends } from './friend';
export interface GetMessageRecord extends Pagination {
  senderId: string;
  receiverId: string | string[];
}

export type MessageStatus = 'sending' | 'success' | 'failed';
export interface Message {
  senderId: string;
  receiverId: string;
  message: string;
  sendTime: number;
  status?: MessageStatus;
  localId?: string;
  seq?: number;
}

export interface WsMessage {
  user: Friends;
  message: Message[];
}

export type PreviewMessage = Record<string, Message & { friendId: string }>;
