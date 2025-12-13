import { defineStore } from 'pinia';
import { StatusCode } from '~/enums/common';
import StreamWebsocket from '~/utils/websocket/stream';
import { createStreamRoom } from '@/api/modules/stream';
import type { CreateStreamRoomBody, GetRoomsResponse } from '@/api/types/stream';

export const useStream = defineStore('stream', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/streamWs` as string;
  const websocketTool = new StreamWebsocket(url);
  // const authStore = useAuth();
  const subscribtion = useSubscribtion();
  const streamRoomMap = reactive<Map<string, GetRoomsResponse>>(new Map());

  const init = (token: string) => {
    console.log('stream init');
    websocketTool.init(token);
  };

  const subscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) => {
    websocketTool.subscribe({ type, fnAry });
  };

  const unSubscribe = ({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) => {
    websocketTool.unSubscribe({ type, fnAry });
  };

  const notify = ({ type, data, code }: { type: string; data: any; code: StatusCode }) => {
    websocketTool.notify({ type, data, code });
  };

  const handleClose = () => {
    websocketTool.handleClose();
  };

  const handleSend = (data: Blob) => {
    websocketTool.handleSend<Blob, 'video'>(data);
  };

  const websocketGlobalMessage = (data: any) => {
    websocketTool.websocketGlobalMessage(data);
  };

  // const getRecord = (data: Buffer) => {
  //   console.log(data, 'data');
  // };

  const openStreamRoom = (body: CreateStreamRoomBody) => {
    createStreamRoom(body);
  };

  const initRoom = (data: GetRoomsResponse[]) => {
    data.forEach((item) => {
      streamRoomMap.set(item.uuid, item);
    });
  };

  // websocket監聽到新房間開放後把新房間加入streamRoomMap
  const addRoom = async (data: GetRoomsResponse) => {
    console.log('addRoom');
    streamRoomMap.set(data.uuid, data);
  };

  // websocket監聽到房間關閉後手動刪除關閉房間
  const deleteRoom = ({ uuid }: { uuid: string }) => {
    console.log('deleteRoom');
    streamRoomMap.delete(uuid);
  };

  const resetRoomStatus = (data: { uuid: string; status: boolean }) => {
    const uuid = data.uuid;
    const room = streamRoomMap.get(data.uuid)!;
    streamRoomMap.set(uuid, {
      ...room,
      status: data.status
    });
  };

  return {
    subscribtion,
    streamRoomMap,
    init,
    handleClose,
    subscribe,
    unSubscribe,
    notify,
    handleSend,
    websocketGlobalMessage,
    // getRecord,
    openStreamRoom,
    addRoom,
    deleteRoom,
    initRoom,
    resetRoomStatus
  };
});
