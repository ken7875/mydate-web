import type { CreateStreamRoomBody, GetRoomsResponse } from '@/api/types/stream';

export const closeStream = () =>
  useHttp.get({
    url: '/stream/close',
    gateway: 'stream'
  });

export const createStreamRoom = (body: CreateStreamRoomBody) =>
  useHttp.post<null>({
    url: '/stream/createRoom',
    body,
    gateway: 'stream'
  });

export const getAllRooms = () =>
  useHttp.get<GetRoomsResponse[]>({
    url: '/stream/getRooms',
    gateway: 'stream'
    // params
  });
