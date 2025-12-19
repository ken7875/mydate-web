import { getUserInfo } from '@/api/modules/auth';

export default () => {
  const { data: userInfoRes } = useQuery({
    queryKey: ['userInfo'],
    queryFn: getUserInfo,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  return {
    userInfoRes
  };
};
