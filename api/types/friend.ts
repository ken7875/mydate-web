import type { MeetUser } from './user';
import type { FriendStatus } from '~/enums/friend';
export interface Friends extends MeetUser {
  status: FriendStatus;
}
