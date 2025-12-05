export type CreateStreamRoomBody = {
  title: string;
  description: string;
  image: string | null;
};

export type GetRoomsResponse = {
  uuid: string;
  title: string;
  description: string;
  image: string;
  startTime: string;
};
