import type { CreateStreamRoomBody, GetRoomsResponse } from '@/api/types/stream';

export const closeStream = () =>
  useHttp.get({
    url: '/stream/close'
  });

export const createStreamRoom = (body: CreateStreamRoomBody) =>
  useHttp.post<null>({
    url: '/stream/createRoom',
    body
  });

export const getAllRooms = () =>
  useHttp.get<GetRoomsResponse[]>({
    url: '/stream/getRooms'
    // params
  });
