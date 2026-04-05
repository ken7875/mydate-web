import type { GetMessageRecord, Message, PreviewMessage } from '../types/chat';
import qs from 'qs';

export const getMessageRecordApi = (message: GetMessageRecord) => {
  const queryString = qs.stringify(message);
  return useHttp.get<{
    data: Message[];
  }>({
    url: `/message?${queryString}`
  });
};

export const getPreviewMessageApi = () => {
  return useHttp.get<PreviewMessage>({
    url: `/message/previewMessage`
  });
};

export const markAsReadApi = (body: { roomId: number; sendTime: number }) => {
  return useHttp.put<null>({
    url: '/message/read',
    body,
    needLoading: false
  });
};

export const getUnreadCount = (params: { roomIds: number[] }) => {
  return useHttp.get<Record<string, { count: number }>>({
    url: '/message/unReadCount',
    needLoading: false,
    params
  });
};

export const getUnreadTotal = () => {
  return useHttp.get<{ total: number }>({
    url: '/message/unreadTotal',
    needLoading: false
  });
};
