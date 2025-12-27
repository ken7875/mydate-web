import { defineStore } from 'pinia';
import { getFriends, getRequestUsers } from '@/api/modules/friend';
import type { Friends, getFriendsParams } from '@/api/types/friend';
import { useMessageStore } from './message';
import type { ShowingFriendList } from '@/pages/friends/types';

export const useFriends = defineStore('friends', () => {
  const messageStore = useMessageStore();
  const friends = ref<ShowingFriendList>([]);
  const requestUsers = ref<Friends[]>([]);
  const totalFriends = ref(0);

  const getAllFriendsHandler = async ({ page = 1, pageSize = 15, userName }: getFriendsParams) => {
    // 只需判斷是否到最後一頁, 若有新好友加入會被移動到最前面, 所以不需要更新請求
    if (page * pageSize - totalFriends.value >= pageSize && friends.value.length > 0) return;

    const res = await getFriends({ page, pageSize, ...(userName?.trim() && { userName: userName.trim() }) });
    totalFriends.value = res.total;
    friends.value = (res.data?.data || []).map((item, index) => ({
      ...item,
      idx: `${page}` + `-${index}`,
      page,
      index
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
    console.log('getNewFriendInvite', data);
    requestUsers.value.unshift({
      ...data
    });
  };

  return {
    friends,
    // showingFriendList,
    requestUsers,
    totalFriends,
    getAllFriendsHandler,
    getFriendById,
    getRequestUsersHandler,
    getNewFriendInvite
  };
});
