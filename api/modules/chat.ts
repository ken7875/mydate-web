import type {
  ChunkUploadRequest,
  ChunkUploadRequestHeader,
  ChunkUploadResponse,
  GetMessageRecord,
  InitUploadRequest,
  InitUploadResponse,
  Message,
  PreviewMessage,
  UploadStatusResponse
} from '../types/chat';
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

export const initUploadFile = (body: InitUploadRequest) => {
  return useHttp.post<InitUploadResponse>({
    url: '/uploads/init',
    needLoading: false,
    body
  });
};

export const uploadChunks = ({
  headers,
  params,
  chunk
}: {
  headers: ChunkUploadRequestHeader;
  params: ChunkUploadRequest;
  chunk: Blob;
}) => {
  return new Promise((resolve, reject) => {
    const token = useCookie('access_token').value;
    if (!token) {
      useForceKickOut();
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/uploads/${params.uploadId}/chunks/${params.chunkIndex}`, true);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('Content-Range', `bytes ${headers.start}-${headers.end}/${headers.total}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = function () {
      resolve(JSON.parse(xhr.responseText) as ChunkUploadResponse);
    };
    xhr.onerror = function (e) {
      reject(e);
    };
    xhr.send(chunk);
  });
};

export const getUploadStatusApi = (uploadId: string) => {
  return useHttp.get<UploadStatusResponse>({
    url: `/uploads/${uploadId}/status`,
    needLoading: false
  });
};

export const cancelUploadApi = (uploadId: string) => {
  return useHttp.delete<null>({
    url: `/uploads/${uploadId}`,
    needLoading: false
  });
};
