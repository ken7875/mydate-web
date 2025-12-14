import type { Friends } from '../types/friend';
import type { Pagination } from '@/api/types/common';
import { FriendStatus } from '@/enums/friend';

export const getFriends = ({ page = 1, pageSize = 25 }: Pagination) =>
  useHttp.get<
    {
      data: Friends[];
    },
    true
  >({
    url: '/friends',
    params: {
      page,
      pageSize
    }
  });

export const getRequestUsers = ({ page = 1, pageSize = 25 }: Pagination) =>
  useHttp.get<{
    data: Friends[];
  }>({
    url: '/friends/requestUsers',
    params: {
      page,
      pageSize
    }
  });

export const getFriend = (id: string) =>
  useHttp.get<{
    data: Friends[];
  }>({
    url: `/friends/${id}`
  });

export const inviteFriend = (body: { friendId: string; status: FriendStatus }) =>
  useHttp.post<{
    list: Friends[];
  }>({
    url: '/friends/inviteFriend',
    body,
    needLoading: false
  });

export const dislikeUser = (body: { friendId: string }) =>
  useHttp.post<{
    list: Friends[];
  }>({
    url: '/friends/dislikeUser',
    body,
    needLoading: false
  });

export const setFriendStatus = (body: { status: 1 | 2; friendId: string; userId: string }) =>
  useHttp.put({
    url: '/friends/setFriendStatus',
    body,
    needLoading: false
  });
