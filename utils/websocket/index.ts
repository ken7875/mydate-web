import { useAuth } from '@/store/auth';
import type { DataType } from './types';
import { useWebsocketSubscribe } from '@/store/websocketSubscribe';
import { useForceKickOut } from '@/utils/forceLogout';

export default class BaseWebsocket {
  url: string;
  maxReconnectCount?: number;
  reconnectTimeout?: number;
  websocket: WebSocket | null = null;
  subscribtion = useWebsocketSubscribe();

  // private
  #authStore = useAuth();

  #heartBeatTimeout: number | null = null;
  #waitServerHeartBeatTimeout: number | null = null;
  #isForceClose = false;
  #reconnectCount = 0;

  #options: {
    heartBeatTime: number;
    reconnectInterval: number;
    reconnectTimes: number;
  };
  constructor(
    url: string,
    maxReconnectCount?: number,
    reconnectTimeout?: number,
    options?: {
      heartBeatTime: number;
      reconnectInterval: number;
      reconnectTimes: number;
    }
  ) {
    this.url = url;
    this.maxReconnectCount = maxReconnectCount || 3;
    this.reconnectTimeout = reconnectTimeout || 5;
    this.#options = options || {
      heartBeatTime: 60000,
      reconnectInterval: 5000,
      reconnectTimes: 3
    };
  }

  public isConnecting(): boolean {
    return this.websocket?.readyState === WebSocket.CONNECTING;
  }

  init(token: string) {
    if (this.isConnecting()) {
      console.log('WebSocket is already connected.');
      return;
    }

    this.websocket = new WebSocket(`${this.url}?token=${token}`);
    this.websocket.binaryType = 'blob';
    this.#isForceClose = false;

    this.websocket.onopen = this.onopen.bind(this);
    this.websocket.onclose = this.onclose.bind(this);
    this.websocket.onmessage = this.onmessage.bind(this);
  }

  resetHeartBeat() {
    if (this.#heartBeatTimeout) clearTimeout(this.#heartBeatTimeout);
    if (this.#waitServerHeartBeatTimeout) clearTimeout(this.#waitServerHeartBeatTimeout);
  }

  startHeartBeat() {
    this.resetHeartBeat();

    this.#heartBeatTimeout = setTimeout(() => {
      this.websocket?.send('ping');

      this.#waitServerHeartBeatTimeout = setTimeout(() => {
        this.handleClose();
        if (this.websocket?.readyState === WebSocket.CLOSED) {
          this.reconnect();
        }
      }, 5000) as unknown as number;
    }, this.#options.heartBeatTime) as unknown as number;
  }

  reconnect() {
    console.log('websocket reconnecting!!');
    setTimeout(() => {
      if (this.#reconnectCount < this.maxReconnectCount!) {
        this.#reconnectCount++;
        this.init(this.#authStore.token);
      }
    }, this.reconnectTimeout);
  }

  subscribe({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) {
    this.subscribtion.subscribe({ type, fnAry });
  }

  unSubscribe({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) {
    this.subscribtion.unSubscribe({ type, fnAry });
  }

  notify({ type, data, code }: DataType<unknown>) {
    console.log(`get type: ${type} | data: ${data} | code: ${code}`);
    this.subscribtion.notify({ type, data, code });
  }

  onopen() {
    console.log(`name: ${this.url} - socket on open`);
    console.log('options');
    this.#options.reconnectTimes = 0;
    this.startHeartBeat();
  }

  onerror(event: Event) {
    console.error('Websocket error:', event);
  }

  onclose(event: Event) {
    console.log(`name: ${this.url} - websocket close`, event.code);
    console.log(event, 'event');

    // this.reconnect();

    clearInterval(this.#heartBeatTimeout!);
  }

  async onmessage(event: MessageEvent) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      if (event.data === 'pong') {
        this.startHeartBeat();
        return;
      }

      // if (event.data instanceof Blob && event.data.type === 'video/webm') {
      //   this.notify({ type: 'video', data: event.data, code: StatusCode.SUCCESS });
      //   return;
      // }

      const res = await new Response(event.data).json();
      const { type, data, code } = res;
      console.log(res, 'res');
      this.notify({ type, data, code });
      if (res.code === 'UNAUTHORIZATION') {
        useForceKickOut();
      }
    } else {
      console.error(this.websocket?.readyState, 'websocket is closed');
      this.websocket?.close();
    }
  }

  handleSend<T = string, U = 'global'>(
    data: U extends 'video' ? Blob : { type: 'chatRoom' | 'global' | 'video'; data: T }
  ) {
    // JSON → Uint8Array
    if (data instanceof Blob) {
      this.websocket?.send?.(new Blob([data], { type: 'video/webm;codecs=vp8,opus' }));
      return;
    }

    const encoder = new TextEncoder();
    const uint8 = encoder.encode(JSON.stringify(data));

    // 建立 Blob application/octet-stream
    const blob = new Blob([uint8], { type: 'text/plain' });

    // if (data.type === 'video') {
    //   sendData = data.data as ArrayBuffer;
    // }
    this.websocket?.send?.(blob);
  }

  handleClose() {
    console.log('handle close');
    this.resetHeartBeat();
    this.websocket?.close(1000, 'Bye');
    this.websocket = null;
  }

  unAuthHandler = () => {
    this.#authStore.logout();
    this.handleClose();
    // this.#message.openMessage({
    //   title: '錯誤',
    //   content: '請重新登入!',
    //   type: 'error',
    //   hasCancel: false
    // });
  };

  websocketGlobalMessage(data: any) {
    switch (data.code) {
      case 'UNAUTHORIZATION':
        this.unAuthHandler();
        break;
    }
    console.log(`websocket status: ${data.code} | websocket data: ${data.data}`);
  }
}
