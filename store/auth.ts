import { defineStore } from 'pinia';
import type { User } from '~/api/types/user';
import { Gender } from '@/enums/user';
import { getAvatarsApi } from '@/api/modules/auth';

const initUserInfo = {
  userName: '',
  avatars: [],
  forWhat: '',
  // hasAccount: false,
  uuid: '',
  phone: '',
  email: '',
  createdAt: '',
  updatedAt: '',
  isPasswordSign: false,
  age: 0,
  gender: Gender.Male,
  description: ''
};

export const useAuth = defineStore(
  'auth',
  () => {
    // state: (): State => ({
    //   token: useCookie<string | null>('memorandum-token').value,
    //   userInfo: null
    // }),
    const token = ref(useCookie<string | null>('access_token').value || '');

    const userInfo = ref<User | null>(useCloneDeep(initUserInfo));

    // UserRsponse: Pick<User, 'uuid' | 'isPasswordSign'>
    const setUserInfo = (userInfoParams: User) => {
      if (!userInfoParams) return;
      userInfo.value = userInfoParams;
    };
    const setToken = (tokenParams: string) => {
      token.value = tokenParams;
    };

    const setAvatars = (avatars: string[]) => {
      userInfo.value!.avatars = avatars;
    };

    const getAvatars = async () => {
      try {
        const res = await getAvatarsApi();
        userInfo.value!.avatars = res.data || [];
      } catch (error) {
        console.error('pinia getAvatars', error);
      }
    };
    const logout = () => {
      setUserInfo(initUserInfo);
      setToken('');
    };

    return {
      token,
      userInfo,
      setUserInfo,
      setToken,
      logout,
      getAvatars,
      setAvatars
    };
  },
  {
    persist: [
      // {
      //   key: 'userInfo',
      //   pick: ['userInfo'],
      //   storage: process.client ? localStorage : undefined,
      //   serializer: {
      //     serialize: JSON.stringify,
      //     deserialize: JSON.parse
      //   }
      //   // storage: process.client ? localStorage : null,
      // },
      {
        key: 'access_token',
        pick: ['token'],
        serializer: {
          serialize: (value) => value.token,
          deserialize: (value) => JSON.parse(value).token
        }
      }
    ]
  }
);
