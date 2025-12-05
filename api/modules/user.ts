import qs from 'qs';
import type { MeetingUserQuery, MeetUser } from '../types/user';

export const getMeetUserList = (query: MeetingUserQuery) => {
  const queryString = qs.stringify(query);
  return useHttp.get<{ list: MeetUser[] }>({
    url: `/user?${queryString}`
  });
};
