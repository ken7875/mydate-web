export enum WsChannel {
  OpenStatus = 'openStatus',
  Global = 'global',
  InviteFriend = 'inviteFriend', // 受到好友邀請
  SetFriendStatus = 'setFriendStatus', // 其他用戶接收我的好友邀請
  AddRoom = 'addRoom', // 其他直播主新增房間
  DeleteRoom = 'deleteRoom', // 其他直播主刪除房間
  ChatRoom = 'chatRoom', // 接收到聊天訊息
  StreamRoomStatus = 'streamRoomStatus' // 當前直播室主播的播放狀態
}

export enum WSCode {
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL'
}
