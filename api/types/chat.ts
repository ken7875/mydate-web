import type { Pagination } from './common';
import type { Friends } from './friend';
export interface GetMessageRecord extends Pagination {
  roomId: number;
}

export type MessageStatus = 'sending' | 'success' | 'failed';
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image'
}

export interface Message {
  senderId: string;
  receiverId: string;
  message: string;
  sendTime: number;
  status?: MessageStatus;
  localId?: string;
  seq?: number;
  roomId: number;
  type: MessageType;
  messageImage?: {
    thumbnailUrl: string;
    originalUrl: string;
    blurHash: string;
    width: number;
    height: number;
    isExpired: boolean;
  };
}

export interface WsMessage {
  roomId: number;
  user: Friends;
  message: Message[];
}

export type PreviewMessage = Record<string, Message>;

export interface InitUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  receiverId: string;
  roomId: number;
  thumbWidth: number;
  thumbHeight: number;
}

export interface InitUploadResponse {
  uploadId: string;
  totalChunks: number;
  expiresAt: string;
}

export interface ChunkUploadRequest {
  uploadId: string;
  chunkIndex: number;
}

export interface ChunkUploadRequestHeader {
  start: number;
  end: number;
  total: number;
}

export interface ChunkUploadPartialResponse {
  uploadId: string;
  chunkIndex: number;
  chunkBytesReceived: number;
  chunkTotal: number;
  receivedChunks: number;
  totalChunks: number;
}

export interface ChunkUploadChunkDoneResponse {
  uploadId: string;
  chunkIndex: number;
  receivedChunks: number;
  totalChunks: number;
}

export interface ChunkUploadAllDoneResponse {
  uploadId: string;
  receivedChunks: number;
  totalChunks: number;
}

export type ChunkUploadResponse =
  | ChunkUploadPartialResponse
  | ChunkUploadChunkDoneResponse
  | ChunkUploadAllDoneResponse;

export interface UploadStatusResponse {
  uploadId: string;
  status: 'uploading' | 'completed';
  fileSize: number;
  receivedBytes: number;
  expiresAt: string;
}

export interface ImageMessagePayload {
  roomId: number;
  messageId: string;
  senderId: string;
  imageId: string;
  thumbnailUrl: string;
  blurHash: string;
  width: number;
  height: number;
  timestamp: string;
}

export interface UploadRecord {
  uploadId: string;
  roomId: number;
  receiverId: string;
  fileName: string;
  fileSize: number;
  fileChecksum: string;
  totalChunks: number;
  createdAt: number;
}
