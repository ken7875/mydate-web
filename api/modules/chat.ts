import type {
  ChunkUploadResponse,
  GetMessageRecord,
  InitUploadRequest,
  InitUploadResponse,
  Message,
  PreviewMessage,
  UploadStatusResponse
} from '../types/chat';
import qs from 'qs';
import type { BaseField } from '../types/common';

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

export const initUploadApi = (body: InitUploadRequest) => {
  return useHttp.post<InitUploadResponse>({
    url: '/uploads/init',
    needLoading: false,
    body
  });
};

export const uploadChunkApi = ({
  uploadId,
  localId,
  chunk,
  start,
  end,
  fileSize,
  signal,
  onUploadProgress
}: {
  uploadId: string;
  localId: string;
  chunk: Blob;
  start: number;
  end: number;
  fileSize: number;
  signal?: AbortSignal;
  onUploadProgress?: (progress: { loaded: number; total: number }) => void;
}): Promise<BaseField<ChunkUploadResponse>> => {
  const runtimeConfig = useRuntimeConfig();
  const apiUrl = import.meta.client ? runtimeConfig.public.apiBase : runtimeConfig.public.apiBaseServer;
  const token = useCookie('access_token').value;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onUploadProgress?.({ loaded: event.loaded, total: event.total });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as BaseField<ChunkUploadResponse>);
      } else {
        reject(new Error(`${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.onerror = (e) => reject(e);

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.open('PUT', `${apiUrl}/api/uploads/${uploadId}/${localId}/chunk`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
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
