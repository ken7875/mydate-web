import BaseWebsocket from '@/utils/websocket/index';
import { StatusCode } from '~/enums/common';

export default class StreamWebsocket extends BaseWebsocket {
  override notify({ type, data, code }: { type: string; data: any; code: StatusCode }) {
    this.subscribtion.notify({ type, data, code });
  }

  override async onmessage(event: MessageEvent): Promise<void> {
    console.log(event.data, 'event data');
    if (this.websocket?.readyState === WebSocket.OPEN) {
      if (event.data === 'pong') {
        this.startHeartBeat();
        return;
      }

      const text = await (event.data as Blob).text();
      const data = JSON.parse(text);

      if (data.type === 'global') {
        this.notify(data);
        return;
      }

      this.notify({
        type: 'video',
        data: event.data,
        code: StatusCode.SUCCESS
      });
    } else {
      console.error(this.websocket?.readyState, 'websocket is closed');
      this.websocket?.close();
    }
  }
}
