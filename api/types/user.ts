import { Gender } from '@/enums/user';
import type { FriendStatus } from '~/enums/friend';

export interface User {
  avatars: string[];
  createdAt: string;
  updatedAt: string;
  forWhat: string;
  phone: string;
  email: string;
  isPasswordSign: boolean;
  uuid: string;
  userName: string;
  age: number;
  gender: Gender;
  description: string;
  // hasAccount: boolean;
}

export interface MeetingUserQuery {
  gender: Gender;
  age: [number, number];
}

export type MeetUser = Pick<User, 'avatars' | 'uuid' | 'userName' | 'age' | 'gender' | 'description'> & {
  status?: FriendStatus;
};
