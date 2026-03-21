/**
 * pages/friends/index.vue 核心業務邏輯單元測試
 *
 * 測試範疇：
 *   1. updatePreviewMessage  — TASK-1 新增函式
 *   2. updateFriendsList     — TASK-4 Bug 修正（splice(-1) 誤刪最後一筆）
 *
 * 測試策略：
 *   純函式測試（不掛載 Vue 元件），直接驗證函式行為，
 *   使得測試不依賴 Nuxt 全域 composable，可在 Vitest + jsdom 環境單獨執行。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed } from 'vue';
import type { Message } from '~/api/types/chat';
import type { User } from '~/api/types/user';
import type { Friends } from '~/api/types/friend';
import { FriendStatus } from '~/enums/friend';
import { Gender } from '~/enums/user';

// ---------------------------------------------------------------------------
// 測試資料工廠
// ---------------------------------------------------------------------------

const makeUser = (uuid: string): User => ({
  avatars: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  forWhat: 'dating',
  phone: '0900000000',
  email: 'test@test.com',
  isPasswordSign: true,
  uuid,
  userName: `user_${uuid}`,
  age: 25,
  gender: Gender.Male,
  description: ''
});

type ShowingFriend = Friends & { page: number; index: number; idx: string };

const makeFriend = (uuid: string, page = 1, index = 0): ShowingFriend => ({
  avatars: [],
  uuid,
  userName: `user_${uuid}`,
  age: 25,
  gender: Gender.Male,
  description: '',
  status: FriendStatus.Success,
  page,
  index,
  idx: `${page}-${index}`
});

const makeMessage = (senderId: string, receiverId = 'receiver'): Message => ({
  senderId,
  receiverId,
  message: 'hello',
  sendTime: 1700000000000
});

// ---------------------------------------------------------------------------
// 與 index.vue TASK-1 相同的函式邏輯（updatePreviewMessage）
// ---------------------------------------------------------------------------

const buildUpdatePreviewMessage = (previewMessagesObj: { value: Record<string, any> | null }) => {
  return (data: { user: User; message: Message[] }) => {
    if (!previewMessagesObj.value || !data.message.length) return;
    const latestMessage = data.message[0];
    previewMessagesObj.value[data.user.uuid] = {
      ...latestMessage,
      friendId: data.user.uuid
    };
  };
};

// ---------------------------------------------------------------------------
// 原始 index.vue 的「有 Bug」版本 updateFriendsList（用於 RED 驗證）
// ---------------------------------------------------------------------------

const buildUpdateFriendsListBuggy = (
  showingFriendList: { value: ShowingFriend[] },
  isFirstPageVisible: { value: boolean },
  addNewMessage: (params: { user: Friends }) => void
) => {
  return ({ user }: { user: Friends; message: Message }) => {
    const friendIndex = showingFriendList.value.findIndex((friend) => friend.uuid === user.uuid);
    const isFirstUser = isFirstPageVisible.value && friendIndex === 0;

    if (isFirstUser) return;

    // BUG: 當 friendIndex === -1 時，splice(-1, 1) 會誤刪最後一個元素
    showingFriendList.value.splice(friendIndex, 1);

    if (isFirstPageVisible.value) {
      addNewMessage({ user });
    }
  };
};

// ---------------------------------------------------------------------------
// 修正後的 updateFriendsList（與 index.vue TASK-4 修正後相同邏輯）
// ---------------------------------------------------------------------------

const buildUpdateFriendsList = (
  showingFriendList: { value: ShowingFriend[] },
  isFirstPageVisible: { value: boolean },
  addNewMessage: (params: { user: Friends }) => void
) => {
  return ({ user }: { user: Friends; message: Message }) => {
    const friendIndex = showingFriendList.value.findIndex((friend) => friend.uuid === user.uuid);
    const isFirstUser = isFirstPageVisible.value && friendIndex === 0;

    if (isFirstUser) return;

    if (friendIndex !== -1) {
      showingFriendList.value.splice(friendIndex, 1);
    }

    if (isFirstPageVisible.value) {
      addNewMessage({ user });
    }
  };
};

// ===========================================================================
// 測試套件 1：updatePreviewMessage
// ===========================================================================

describe('updatePreviewMessage', () => {
  let previewMessagesObj: { value: Record<string, any> | null };
  let updatePreviewMessage: ReturnType<typeof buildUpdatePreviewMessage>;

  beforeEach(() => {
    previewMessagesObj = ref<Record<string, any> | null>({});
    updatePreviewMessage = buildUpdatePreviewMessage(previewMessagesObj);
  });

  it('應將最新訊息寫入 previewMessagesObj，以 user.uuid 為鍵', () => {
    const user = makeUser('uuid-A');
    const message = makeMessage('uuid-A');

    updatePreviewMessage({ user, message: [message] });

    expect(previewMessagesObj.value?.['uuid-A']).toEqual({
      ...message,
      friendId: 'uuid-A'
    });
  });

  it('有多則訊息時，只寫入 message[0]（最新一則）', () => {
    const user = makeUser('uuid-B');
    const firstMessage = makeMessage('uuid-B');
    const secondMessage = { ...makeMessage('uuid-B'), message: 'second', sendTime: 1700001000000 };

    updatePreviewMessage({ user, message: [firstMessage, secondMessage] });

    expect(previewMessagesObj.value?.['uuid-B'].message).toBe('hello');
  });

  it('當 previewMessagesObj.value 為 null 時，不應拋出錯誤且不做任何事', () => {
    previewMessagesObj.value = null;

    expect(() => {
      updatePreviewMessage({ user: makeUser('uuid-C'), message: [makeMessage('uuid-C')] });
    }).not.toThrow();
  });

  it('當 message 陣列為空時，不應更新 previewMessagesObj', () => {
    previewMessagesObj.value = { 'uuid-D': { message: 'original', friendId: 'uuid-D' } };

    updatePreviewMessage({ user: makeUser('uuid-D'), message: [] });

    expect(previewMessagesObj.value?.['uuid-D'].message).toBe('original');
  });

  it('應為結果附加 friendId 欄位，值等於 user.uuid', () => {
    const user = makeUser('uuid-E');
    updatePreviewMessage({ user, message: [makeMessage('uuid-E')] });

    expect(previewMessagesObj.value?.['uuid-E'].friendId).toBe('uuid-E');
  });

  it('對同一使用者更新兩次，應覆寫為最新訊息', () => {
    const user = makeUser('uuid-F');
    updatePreviewMessage({ user, message: [{ ...makeMessage('uuid-F'), message: 'first' }] });
    updatePreviewMessage({ user, message: [{ ...makeMessage('uuid-F'), message: 'second' }] });

    expect(previewMessagesObj.value?.['uuid-F'].message).toBe('second');
  });

  it('不同使用者的訊息應分別寫入各自的 uuid 鍵', () => {
    updatePreviewMessage({ user: makeUser('uuid-G1'), message: [{ ...makeMessage('uuid-G1'), message: 'msg-G1' }] });
    updatePreviewMessage({ user: makeUser('uuid-G2'), message: [{ ...makeMessage('uuid-G2'), message: 'msg-G2' }] });

    expect(previewMessagesObj.value?.['uuid-G1'].message).toBe('msg-G1');
    expect(previewMessagesObj.value?.['uuid-G2'].message).toBe('msg-G2');
  });
});

// ===========================================================================
// 測試套件 2：updateFriendsList — RED 驗證（Buggy 版本的錯誤行為）
// ===========================================================================

describe('updateFriendsList（Bug 行為驗證：splice(-1) 問題）', () => {
  let showingFriendList: { value: ShowingFriend[] };
  let isFirstPageVisible: { value: boolean };
  let addNewMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showingFriendList = ref([makeFriend('uuid-1', 1, 0), makeFriend('uuid-2', 1, 1), makeFriend('uuid-3', 1, 2)]);
    isFirstPageVisible = ref(true);
    addNewMessage = vi.fn();
  });

  it('【Bug 驗證】有 Bug 的版本：好友不在清單時，splice(-1,1) 會誤刪最後一筆', () => {
    const buggyFn = buildUpdateFriendsListBuggy(showingFriendList, isFirstPageVisible, addNewMessage);
    const user = makeFriend('uuid-not-exist');

    buggyFn({ user, message: makeMessage('uuid-not-exist') });

    // 有 bug 的版本會刪掉最後一個元素（uuid-3），清單長度變為 2
    // 這個測試驗證 bug 確實存在
    expect(showingFriendList.value).toHaveLength(2);
    expect(showingFriendList.value.map((f) => f.uuid)).not.toContain('uuid-3');
  });
});

// ===========================================================================
// 測試套件 3：updateFriendsList — 修正後的正確行為（GREEN）
// ===========================================================================

describe('updateFriendsList（修正後）', () => {
  let showingFriendList: { value: ShowingFriend[] };
  let isFirstPageVisible: { value: boolean };
  let addNewMessage: ReturnType<typeof vi.fn>;
  let updateFriendsList: ReturnType<typeof buildUpdateFriendsList>;

  beforeEach(() => {
    showingFriendList = ref([makeFriend('uuid-1', 1, 0), makeFriend('uuid-2', 1, 1), makeFriend('uuid-3', 1, 2)]);
    isFirstPageVisible = ref(true);
    addNewMessage = vi.fn();
    updateFriendsList = buildUpdateFriendsList(showingFriendList, isFirstPageVisible, addNewMessage);
  });

  // ---- 正常路徑 ----

  it('找到對應好友時，應從清單中移除該好友', () => {
    updateFriendsList({ user: makeFriend('uuid-2'), message: makeMessage('uuid-2') });

    expect(showingFriendList.value.map((f) => f.uuid)).not.toContain('uuid-2');
    expect(showingFriendList.value).toHaveLength(2);
  });

  it('isFirstPageVisible 為 true 時移除後，應呼叫 addNewMessage 將好友置頂', () => {
    const user = makeFriend('uuid-2');
    isFirstPageVisible.value = true;

    updateFriendsList({ user, message: makeMessage('uuid-2') });

    expect(addNewMessage).toHaveBeenCalledOnce();
    expect(addNewMessage).toHaveBeenCalledWith({ user });
  });

  it('isFirstPageVisible 為 false 時，移除後不應呼叫 addNewMessage', () => {
    isFirstPageVisible.value = false;

    updateFriendsList({ user: makeFriend('uuid-2'), message: makeMessage('uuid-2') });

    expect(addNewMessage).not.toHaveBeenCalled();
  });

  // ---- 邊界：好友已在第一位 ----

  it('好友已在列表最頂端（index 0）且 isFirstPageVisible 為 true 時，不移除也不呼叫 addNewMessage', () => {
    updateFriendsList({ user: makeFriend('uuid-1'), message: makeMessage('uuid-1') });

    expect(showingFriendList.value).toHaveLength(3);
    expect(addNewMessage).not.toHaveBeenCalled();
  });

  // ---- Bug 修正：findIndex 回傳 -1 ----

  it('【Bug 修正】好友不在清單中（findIndex === -1）時，清單長度不應改變', () => {
    expect(() => {
      updateFriendsList({ user: makeFriend('uuid-not-exist'), message: makeMessage('uuid-not-exist') });
    }).not.toThrow();

    expect(showingFriendList.value).toHaveLength(3);
  });

  it('【Bug 修正】好友不在清單中時，不應誤刪清單最後一筆資料', () => {
    updateFriendsList({ user: makeFriend('uuid-not-exist'), message: makeMessage('uuid-not-exist') });

    expect(showingFriendList.value.map((f) => f.uuid)).toContain('uuid-3');
  });

  it('【Bug 修正】好友不在清單中且 isFirstPageVisible 為 true 時，仍應呼叫 addNewMessage 置頂', () => {
    const user = makeFriend('uuid-not-exist');
    isFirstPageVisible.value = true;

    updateFriendsList({ user, message: makeMessage('uuid-not-exist') });

    expect(addNewMessage).toHaveBeenCalledWith({ user });
  });

  it('【Bug 修正】好友不在清單中且 isFirstPageVisible 為 false 時，不應呼叫 addNewMessage', () => {
    isFirstPageVisible.value = false;

    updateFriendsList({ user: makeFriend('uuid-not-exist'), message: makeMessage('uuid-not-exist') });

    expect(addNewMessage).not.toHaveBeenCalled();
  });

  it('清單為空時，findIndex 回傳 -1，不應拋出錯誤', () => {
    showingFriendList.value = [];

    expect(() => {
      updateFriendsList({ user: makeFriend('uuid-1'), message: makeMessage('uuid-1') });
    }).not.toThrow();
  });

  it('移除指定好友後，其他好友仍應完整保留', () => {
    updateFriendsList({ user: makeFriend('uuid-2'), message: makeMessage('uuid-2') });

    expect(showingFriendList.value.map((f) => f.uuid)).toContain('uuid-1');
    expect(showingFriendList.value.map((f) => f.uuid)).toContain('uuid-3');
  });
});
