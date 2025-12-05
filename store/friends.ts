import { defineStore } from 'pinia';
import { getFriends, getRequestUsers } from '@/api/modules/friend';
import type { Friends } from '@/api/types/friend';
import { useMessageStore } from './message';
import type { Pagination } from '~/api/types/common';

export const useFriends = defineStore('friends', () => {
  const messageStore = useMessageStore();
  const friends = ref<Friends[]>([]);
  const requestUsers = ref<Friends[]>([]);
  const searchingFriend = ref('');
  const totalFriends = ref(0);

  const getAllFriendsHandler = async ({ page = 1, pageSize = 15 }: Pagination) => {
    // 只需判斷是否到最後一頁, 若有新好友加入會被移動到最前面, 所以不需要更新請求
    if (page * pageSize > totalFriends.value && friends.value.length > 0) return;

    const res = await getFriends({ page, pageSize });
    totalFriends.value = res.total;
    friends.value = res.data?.data || [];
    // TODO for test
    friends.value = friends.value.map((item, index) => ({
      ...item,
      idx: `${page}` + `-${index}`
    }));

    return res;
  };

  const getRequestUsersHandler = async () => {
    const res = await getRequestUsers({ page: 1, pageSize: 100 });
    requestUsers.value = res.data?.data || [];
    return res.data?.data || [];
  };

  const getFriendById = (uuid?: string) => {
    const prevFocusFriend = friends.value?.find((friend) => friend.uuid === uuid);
    if (!prevFocusFriend) {
      messageStore.openMessage({
        title: '錯誤',
        content: '找不到此用戶'
      });
    }
  };

  // websocket用, 當有新用戶加好友會即時通知
  const getNewFriendInvite = (data: Friends) => {
    requestUsers.value.unshift({
      ...data
    });
  };

  // 輸入框篩選, 若輸入框為空值則顯示全部
  // const showingFriendList = computed(() =>
  //   friends.value.filter((friend) => {
  //     const regex = new RegExp(searchingFriend.value, 'i');
  //     return regex.test(friend.userName);
  //   })
  // );

  return {
    friends,
    searchingFriend,
    // showingFriendList,
    requestUsers,
    totalFriends,
    getAllFriendsHandler,
    getFriendById,
    getRequestUsersHandler,
    getNewFriendInvite
  };
});
