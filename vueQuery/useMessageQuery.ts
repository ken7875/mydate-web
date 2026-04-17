import { getMessageRecordApi } from '@/api/modules/chat';
import type { GetMessageRecord, Message, MessageStatus } from '~/api/types/chat';
import type { BaseField } from '~/api/types/common';
import type { InfiniteData } from '@tanstack/vue-query';

type MessagePage = BaseField<{ data: Message[] }, true>;

export default () => {
  const queryClient = useQueryClient();
  const getMessageRecordQuery = ({ roomId, pageSize }: Omit<GetMessageRecord, 'page'>) => {
    const { data, isPending, isSuccess, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
      queryKey: ['messageRecord', { id: roomId }],
      queryFn: ({ pageParam = 1 }) =>
        getMessageRecordApi({
          roomId,
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
            (page?.data?.data ?? [])
              .filter((message) => message.status !== 'failed')
              .map((item, index) => ({
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

  const updateMessageQuery = ({ newMessage, roomId }: { newMessage: Message[]; roomId: number }) => {
    queryClient.setQueryData(
      ['messageRecord', { id: roomId }],
      (oldData: InfiniteData<MessagePage, number> | undefined) => {
        if (!oldData) return oldData;

        const res = {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index === 0) {
              const oldMessageData = page.data?.data ?? [];
              const repeatIndex = oldMessageData.findIndex((message) => message.localId === newMessage[0].localId);
              if (repeatIndex > -1) {
                oldMessageData.splice(repeatIndex, 1);
              }

              return {
                ...page,
                total: (page.total ?? 0) + 1,
                data: {
                  ...page.data,
                  data: [...newMessage, ...oldMessageData]
                }
              };
            }
            return page;
          })
        };

        return res;
      }
    );
  };

  const updateMessageQueryStatus = ({
    roomId,
    status,
    localId
  }: {
    roomId: number;
    status: MessageStatus;
    localId: string;
  }) => {
    queryClient.setQueryData(
      ['messageRecord', { id: roomId }],
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

  const removeMessageFromQuery = ({ roomId, localId }: { roomId: number; localId: string }) => {
    queryClient.setQueryData(
      ['messageRecord', { id: roomId }],
      (oldData: InfiniteData<MessagePage, number> | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page, index) => {
            if (index !== 0) return page;
            const filtered = (page.data?.data ?? []).filter((msg) => msg.localId !== localId);
            return {
              ...page,
              total: Math.max(0, (page.total ?? 0) - 1),
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
