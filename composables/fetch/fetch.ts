import type { BaseField } from '@/api/types/common';
import errorHandler from '@/utils/errorHandler';
import { useLoadingTool } from '../loading';
import type { Gateway } from './types';

const myFetch = ({
  isMock = false,
  responseType = 'json',
  gateway = 'normal'
}: {
  isMock?: boolean;
  responseType?: 'blob' | 'json' | 'stream';
  gateway?: Gateway;
}) => {
  const runtimeConfig = useRuntimeConfig();
  const apiUrl = runtimeConfig.public.apiBase;
  const mockUrl = runtimeConfig.public.apiMock;
  const gatewayMap = {
    normal: `${apiUrl}/`,
    stream: `${apiUrl}/stream`
  };
  const baseURL = isMock ? mockUrl : gatewayMap[gateway];

  const loadingTool = useLoadingTool();

  const apiFetch = $fetch.create({
    baseURL,
    // credentials: 'include',
    responseType: responseType,
    timeout: 3000,
    // ...fetchOptions,
    onRequest({ options }) {
      // get方法传递数组形式参数
      // options.params = paramsSerializer(options.params);
      // if (!userStore.isLogin) return;
      loadingTool.openLoading();

      const token = useCookie('access_token').value;
      options.headers = new Headers(options.headers);

      if (token) {
        options.headers.set('Authorization', `Bearer ${token}`);
      }
    },
    onRequestError(err) {
      console.error('onRequestError:', err);

      loadingTool.close();

      return Promise.reject(err);
    },
    // 响应拦截
    onResponse({ response }) {
      if (response.headers.get('content-disposition') && response.status === 200) return response;

      loadingTool.close();

      // // 成功返回
      return response._data;
    },
    // 错误处理
    onResponseError({ response, error }) {
      loadingTool.close();
      if (!response.ok && import.meta.client) {
        errorHandler(response.status);
        // throw Promise.reject(response);
      }
      if (error) {
        console.log('onResponseError: ', error);
      }
      return Promise.reject(response ?? null);
    }
  });

  return apiFetch;
};

// 自动导出
export const useHttp = {
  get: <T, HasTotal extends boolean = false>({
    url,
    params,
    isMock,
    responseType
  }: {
    url: string;
    params?: unknown;
    isMock?: boolean;
    responseType?: 'blob' | 'json' | 'stream';
  }) =>
    myFetch({ isMock, responseType })<BaseField<T, HasTotal>>(url, {
      method: 'get',
      params: params as URLSearchParams | undefined
    }),

  post: <T>({
    url,
    body,
    isMock
    // headers = { 'Content-Type': 'application/json' }
  }: {
    url: string;
    body?: BodyInit | Record<string, unknown>;
    isMock?: boolean;
    headers?: HeadersInit;
  }) => {
    return myFetch({ isMock })<BaseField<T>>(url, { method: 'post', body });
  },

  put: <T>({
    url,
    body,
    isMock
    // headers = { 'Content-Type': 'application/json' }
  }: {
    url: string;
    body?: BodyInit | Record<string, unknown>;
    isMock?: boolean;
    headers?: HeadersInit;
  }) => {
    return myFetch({ isMock })<BaseField<T>>(url, { method: 'put', body });
  },

  delete: <T>({ url, body, isMock }: { url: string; body?: Record<string, unknown>; isMock?: boolean }) => {
    return myFetch({ isMock })<BaseField<T>>(url, { method: 'delete', body });
  }
};
