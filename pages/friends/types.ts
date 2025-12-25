import type { Friends } from '@/api/types/friend';

export type ShowingFriendList = (Friends & {
  page: number;
  index: number;
  idx: string;
})[];
