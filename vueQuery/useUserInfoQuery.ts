import { getUserInfo, setUserInfo, setAvatars } from '@/api/modules/auth';
import type { User } from '~/api/types/user';

export default () => {
  const { data: userInfoRes } = useQuery({
    queryKey: ['userInfo'],
    queryFn: getUserInfo,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: true
  });

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
    mutationFn: (body: FormData) => setAvatars(body)
  });

  const avatarsMutateHandler = (body: FormData) => {
    return new Promise((resolve, reject) => {
      avatarsMutate(body, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['userInfo'] });
          resolve('success');
        },
        onError: () => {
          reject('fail');
        }
      });
    });
  };

  return {
    userInfoRes,
    userInfoMutateHandler,
    avatarsMutateHandler
  };
};
