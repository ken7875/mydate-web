import type { User } from '~/api/types/user';

// export const loginApi = myFetch('/api');
export const loginWithEmail = (body: { email: string; password: string }) =>
  useHttp.post<Pick<User, 'email' | 'isPasswordSign' | 'uuid' | 'userName' | 'phone'> & { token: string }>({
    url: '/auth/loginWithEmail',
    body
  });
// myFetch<{
//   data: Pick<User, 'email' | 'hasAccount' | 'isPasswordSign' | 'uuid'> & { token: string };
// }>({
//   url: '/auth/loginWithEmail',
//   options: {
//     method: 'post',
//     body
//   }
// });

// export const verifyCode = (body: { email: string; userCode: string }) =>
//   myFetch('/auth/verfiyCode', {
//     method: 'post',
//     body
//   });

export const loginMethods = (body: { email: string }) =>
  useHttp.post<{ hasAccount: boolean; isPasswordSign: boolean }>({
    url: '/auth/loginMethods',
    body
  });
// myFetch<{ hasAccount: boolean; isPasswordSign: boolean }>({
//   url: '/auth/loginMethods',
//   options: {
//     method: 'post',
//     body
//   }
// });

export const getUserInfo = () => {
  return useHttp.get<User>({
    url: `/auth/userInfo`
  });
};
// myFetch<User>({
//   url: '/auth/userInfo',
//   options: {
//     method: 'get',
//     body
//   }
// });

export const setUserInfo = (body: { userName: string; email: string; uuid: User['uuid'] }) =>
  useHttp.put<User>({
    url: '/auth/userInfo',
    body
  });
// myFetch<{ userName: string }>({
//   url: '/auth/userInfo',
//   options: {
//     method: 'post',
//     body
//   }
// });

export const setPassword = (body: { email: string; password: string }) => {
  return useHttp.put<{ hasAccount: boolean; isPasswordSign: boolean }>({
    url: '/auth/password',
    body
  });
  // return myFetch<{ hasAccount: boolean; isPasswordSign: boolean }>({
  //   url: '/auth/password',
  //   options: {
  //     method: 'post',
  //     body
  //   }
  // });
};

export const getAvatarsApi = () => {
  return useHttp.get<string[]>({
    url: '/auth/avatars'
  });
};

export const setAvatars = (avatars: FormData) => {
  return useHttp.put<Blob>({
    url: '/auth/avatars',
    body: avatars
    // headers: { 'Content-Type': 'multipart/form-data' }
  });
};
