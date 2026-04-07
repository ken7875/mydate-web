import qs from 'qs';
import type { MeetingUserQuery, MeetUser } from '../types/user';

export const getMeetUserList = (query: MeetingUserQuery) => {
  const queryString = qs.stringify(query);
  return useHttp.get<{ list: MeetUser[] }>({
    url: `/user?${queryString}`
  });
};

export const getAvatarsApi = () => {
  return useHttp.get<string[]>({
    url: '/user/avatars'
  });
};

export const setAvatars = ({ uuid, avatars }: { uuid: string; avatars: FormData }) => {
  return useHttp.post<{ avatarUrl: string[] }>({
    url: `/user/${uuid}/avatars`,
    body: avatars
    // headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const reorderAvatars = ({ uuid, order }: { uuid: string; order: number[] }) => {
  return useHttp.put<void>({
    url: `/user/${uuid}/avatars/order`,
    body: { order }
  });
};
