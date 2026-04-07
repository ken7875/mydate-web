import { getUserInfo, setUserInfo } from '@/api/modules/auth';
import { setAvatars, reorderAvatars } from '@/api/modules/user';
import type { User } from '~/api/types/user';

export default () => {
  const { data: userInfoRes } = useQuery({
    queryKey: ['userInfo'],
    queryFn: getUserInfo,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: true
  });
  console.log(userInfoRes.value, 'userInfoRes');

  const queryClient = useQueryClient();

  const { mutate: userInfoMutate } = useMutation({
    mutationFn: (body: { userName: string; email: string; uuid: User['uuid'] }) => setUserInfo(body)
  });

  // Mutation
  const userInfoMutateHandler = (body: { userName: string; email: string; uuid: User['uuid'] }) => {
    return new Promise((resolve, reject) => {
      userInfoMutate(body, {
        onSuccess: () => {
          console.log('onSuccess');
          queryClient.invalidateQueries({ queryKey: ['userInfo'] });
          resolve('success');
        },
        onError: () => {
          reject('fail');
        }
      });
    });
  };

  const { mutate: avatarsMutate } = useMutation({
    mutationFn: ({ uuid, avatars }: { uuid: string; avatars: FormData }) => setAvatars({ uuid, avatars })
  });

  const { mutate: avatarsOrderMutate } = useMutation({
    mutationFn: ({ uuid, order }: { uuid: string; order: number[] }) => reorderAvatars({ uuid, order })
  });

  const mutateCallBack = <TData>(
    resolve: (value: TData) => void,
    reject: (reason?: unknown) => void,
    fallback?: TData
  ) => ({
    onSuccess: (data: { data?: TData }) => {
      queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      resolve((data.data ?? fallback) as TData);
    },
    onError: () => {
      reject('fail');
    }
  });

  const avatarsMutateHandler = ({ uuid, avatars }: { uuid: string; avatars: FormData }) => {
    return new Promise<{ avatarUrl: string[] }>((resolve, reject) => {
      avatarsMutate({ uuid, avatars }, mutateCallBack<{ avatarUrl: string[] }>(resolve, reject, { avatarUrl: [] }));
    });
  };

  const avatarsOrderMutateHandler = ({ uuid, order }: { uuid: string; order: number[] }) => {
    return new Promise<void>((resolve, reject) => {
      avatarsOrderMutate({ uuid, order }, mutateCallBack<void>(resolve, reject));
    });
  };

  return {
    userInfoRes,
    userInfoMutateHandler,
    avatarsMutateHandler,
    avatarsOrderMutateHandler
  };
};
