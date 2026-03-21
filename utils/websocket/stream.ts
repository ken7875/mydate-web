import BaseWebsocket from '@/utils/websocket/index';
import { StatusCode } from '~/enums/common';

export default class StreamWebsocket extends BaseWebsocket {
  override notify({ type, data, code }: { type: string; data: any; code: StatusCode }) {
    this.subscribeHandler?.broadcast(type, data, code);
  }

  override async onmessage(event: MessageEvent): Promise<void> {
    if (this.websocket?.readyState !== WebSocket.OPEN) {
      console.error(this.websocket?.readyState, 'websocket is closed');
      this.websocket?.close();
      return;
    }

    // 統一取得字串：string 直接使用，Blob 透過 text() 解析
    const raw = typeof event.data === 'string' ? event.data : null;

    if (raw === 'pong') {
      this.startHeartBeat();
      return;
    }

    // 非 string 的情況：可能是 Blob（影音串流）或 JSON 控制訊息
    try {
      // 嘗試解析為 JSON 控制訊息
      const text = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
      const data = JSON.parse(text);

      if (data.type === 'global') {
        this.notify(data);
        return;
      }
    } catch {
      // JSON 解析失敗 — 視為影音串流資料，正常流程
    }

    // 影音串流資料
    this.notify({
      type: 'video',
      data: event.data,
      code: StatusCode.SUCCESS
    });
  }
}
