import { defineStore } from 'pinia';
import { StatusCode } from '~/enums/common';
import StreamWebsocket from '~/utils/websocket/stream';
import { createStreamRoom } from '@/api/modules/stream';
import type { CreateStreamRoomBody, GetRoomsResponse } from '@/api/types/stream';
import { useForceKickOut } from '@/utils/forceLogout';

export const useStream = defineStore('stream', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/streamWs` as string;

  // 延遲建立，避免 SSR 期間實例化
  let websocketTool: StreamWebsocket | null = null;

  const getWs = (): StreamWebsocket => {
    if (!websocketTool) {
      websocketTool = new StreamWebsocket(url, {
        onUnauthorized: () => useForceKickOut()
      });
    }
    return websocketTool;
  };

  const streamRoomMap = reactive<Map<string, GetRoomsResponse>>(new Map());

  const init = (token: string) => {
    console.log('stream init');
    getWs().init(token);
  };

  const subscribe = (type: string, handler: (...args: any[]) => void) => {
    getWs().subscribe(type, handler);
  };

  const unSubscribe = (type: string, handler: (...args: any[]) => void) => {
    getWs().unsubscribe(type, handler);
  };

  const notify = ({ type, data, code }: { type: string; data: any; code: StatusCode }) => {
    getWs().notify({ type, data, code });
  };

  const handleClose = () => {
    getWs().handleClose();
  };

  const handleSend = (data: Blob) => {
    getWs().handleSend<Blob, 'video'>(data);
  };

  const websocketGlobalMessage = (data: any) => {
    getWs().websocketGlobalMessage(data);
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

  const resetRoomStatus = ({ data }: WsPayload<{ uuid: string; status: boolean }>) => {
    const uuid = data.uuid;
    const room = streamRoomMap.get(data.uuid)!;
    streamRoomMap.set(uuid, {
      ...room,
      status: data.status
    });
  };

  return {
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
