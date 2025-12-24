import { getMessageRecordApi } from '@/api/modules/chat';
import type { GetMessageRecord, Message } from '~/api/types/chat';
import type { BaseField } from '~/api/types/common';

export default () => {
  const queryClient = useQueryClient();
  const getMessageRecordQuery = ({ senderId, receiverId, pageSize }: Omit<GetMessageRecord, 'page'>) => {
    const { data, isPending, isSuccess, fetchNextPage, fetchPreviousPage } = useInfiniteQuery({
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
      getNextPageParam: () => undefined,

      // 前一頁邏輯 (往新訊息找)
      getPreviousPageParam: (page) => {
        const currentPage = Number(page.page);
        // 假設最後一頁的資料長度小於 pageSize，代表沒資料了，回傳 undefined 停止
        if (Number(page.data?.data?.length) < pageSize) return undefined;
        return currentPage + 1;
      }
      //   getPreviousPageParam: (firstPage, allPages) => {
      //   // 假設 firstPage 裡有紀錄它自己的頁碼
      //   const firstPageNum = firstPage.data?.page || 1;

      //   // 如果第一頁的頁碼大於 1，代表上方還有資料可以載回
      //   return firstPageNum > 1 ? firstPageNum - 1 : undefined;
      // },
    });

    return {
      data,
      isPending,
      isSuccess,
      fetchNextPage,
      fetchPreviousPage
    };
  };

  const updateQuery = ({
    newMessage,
    senderId,
    receiverId
  }: {
    newMessage: Message;
    senderId: string;
    receiverId: string;
  }) => {
    queryClient.setQueryData(['messageRecord', { id: [senderId, receiverId].sort().join('_') }], (oldData: any) => {
      console.log(oldData, 'oldData');
      // console.log(oldData, { senderId, receiverId }, 'oldData');
      // 如果目前沒資料，直接回傳
      if (!oldData) return oldData;

      // 3. 重新構建 pages 陣列
      return {
        ...oldData,
        pages: oldData.pages.map(
          (page: any, index: number, array: { pages: BaseField<Message[]>[]; pageParams: number[] }[]) => {
            // 我們通常將新訊息塞入「第一頁 (index 0)」
            if (index === array.length - 1) {
              return {
                ...page,
                // 假設你的 API 資料結構中，訊息存在 data.data 陣列裡
                data: {
                  ...page.data,
                  data: [newMessage, ...page.data.data] // 將新訊息放到最前面
                }
              };
            }
            return page;
          }
        )
      };
    });
  };

  // const queryClient = useQueryClient();

  // const { mutate: getMessageRecord } = useMutation({
  //   mutationFn: (body: { senderId, receiverId, page, pageSize }: GetMessageRecord) => setUserInfo(body)
  // });

  // const messageRecordMutate = () => {};

  return {
    getMessageRecordQuery,
    updateQuery
    // getMessageRecord,
  };
};
