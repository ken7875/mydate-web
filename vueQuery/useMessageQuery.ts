import { getMessageRecordApi } from '@/api/modules/chat';
import type { GetMessageRecord, Message, MessageStatus } from '~/api/types/chat';
import type { BaseField } from '~/api/types/common';
import type { InfiniteData } from '@tanstack/vue-query';

type MessagePage = BaseField<{ data: Message[] }, true>;

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
      staleTime: 1000 * 60 * 5,
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

  const updateMessageQuery = ({
    newMessage,
    senderId,
    receiverId
  }: {
    newMessage: Message[];
    senderId: string;
    receiverId: string;
  }) => {
    queryClient.setQueryData(
      ['messageRecord', { id: [senderId, receiverId].sort().join('_') }],
      (oldData: InfiniteData<MessagePage, number> | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index === 0) {
              return {
                ...page,
                total: (page.total ?? 0) + 1,
                data: {
                  ...page.data,
                  data: [...newMessage, ...(page.data?.data ?? []).slice(0, -newMessage.length)]
                }
              };
            }
            return page;
          })
        };
      }
    );
  };

  const updateMessageQueryStatus = ({
    senderId,
    receiverId,
    status,
    localId
  }: {
    senderId: string;
    receiverId: string;
    status: MessageStatus;
    localId: string;
  }) => {
    queryClient.setQueryData(
      ['messageRecord', { id: [senderId, receiverId].sort().join('_') }],
      (oldData: InfiniteData<MessagePage, number> | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            return {
              ...page,
              data: {
                ...page.data,
                data: (page.data?.data ?? []).map((message) => {
                  if (message.localId === localId) {
                    return { ...message, status };
                  }
                  return message;
                })
              }
            };
          })
        };
      }
    );
  };

  const removeMessageFromQuery = ({
    senderId,
    receiverId,
    localId
  }: {
    senderId: string;
    receiverId: string;
    localId: string;
  }) => {
    queryClient.setQueryData(
      ['messageRecord', { id: [senderId, receiverId].sort().join('_') }],
      (oldData: InfiniteData<MessagePage, number> | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            const filtered = (page.data?.data ?? []).filter((message) => message.localId !== localId);
            const wasRemoved = filtered.length < (page.data?.data ?? []).length;
            return {
              ...page,
              total: wasRemoved && index === 0 ? Math.max((page.total ?? 0) - 1, 0) : page.total,
              data: { ...page.data, data: filtered }
            };
          })
        };
      }
    );
  };

  return {
    getMessageRecordQuery,
    updateMessageQuery,
    updateMessageQueryStatus,
    removeMessageFromQuery
  };
};
