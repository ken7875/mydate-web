// import { myFetch } from '@/utils/fetch';
import type { User } from '~/api/types/user';
import { type Group } from '../types/group';

// ?uuid=${uuid}
export const getGroupList = ({ uuid }: { uuid: User['uuid'] }) =>
  useHttp.get<Group[]>({
    url: `/group?uuid=${uuid}`
  });

export const setGroup = (body: Pick<Group, 'name' | 'member'>) =>
  useHttp.put<Group[]>({
    url: `/group`,
    body
  });
