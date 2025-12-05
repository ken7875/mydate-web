import type { User } from '~/api/types/user';

export interface Group {
  id: string;
  name: string;
  member: User['uuid'][];
  memberNums: 12;
}
