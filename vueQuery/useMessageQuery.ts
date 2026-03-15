import { getMessageRecordApi } from '@/api/modules/chat';
import type { GetMessageRecord, Message } from '~/api/types/chat';
// import type { BaseField } from '~/api/types/common';

export default () => {
  const queryClient = useQueryClient();
  const getMessageRecordQuery = ({ senderId, receiverId, pageSize }: Omit<GetMessageRecord, 'page'>) => {
    const { data, isPending, isSuccess, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
      queryKey: ['messageRecord', { id: [senderId, receiverId].sort().join('_') }],
      queryFn: ({ pageParam = 1 }) =>
        getMessageRecordApi({
          senderId,
          receiverId,
          page: pageParam,
          pageSize
        }),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const currentPage = Number(lastPage.page);
        if (Number(lastPage.data?.data?.length) < pageSize) return undefined;
        return currentPage + 1;
      },
      getPreviousPageParam: () => undefined,
      select: (data) => {
        const messages: (Message & { idx: string })[] = data.pages
          .flatMap((page, pageIdx) =>
            (page?.data?.data ?? []).map((item, index) => ({
              ...item,
              idx: `${data.pageParams[pageIdx]}-${index}`
            }))
          )
          .reverse();
        const total = data.pages[0]?.total ?? 0;
        return { messages, total };
      }
    });

    return {
      data,
      isPending,
      isSuccess,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage
    };
  };

  const updateQuery = ({
    newMessage,
    senderId,
    receiverId
  }: {
    newMessage: Message[];
    senderId: string;
    receiverId: string;
  }) => {
    queryClient.setQueryData(['messageRecord', { id: [senderId, receiverId].sort().join('_') }], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any, index: number) => {
          if (index === 0) {
            return {
              ...page,
              total: page.total + 1,
              data: {
                ...page.data,
                data: [...newMessage, ...page.data.data]
              }
            };
          }
          return page;
        })
      };
    });
  };

  return {
    getMessageRecordQuery,
    updateQuery
  };
};
