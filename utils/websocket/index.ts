import { useAuth } from '@/store/auth';
import type { DataType } from './types';
import { useWebsocketSubscribe } from '@/store/websocketSubscribe';
import { useForceKickOut } from '@/utils/forceLogout';

export default class BaseWebsocket {
  url: string;
  websocket: WebSocket | null = null;
  subscribtion = useWebsocketSubscribe();

  // private
  #authStore = useAuth();

  #heartBeatTimer: number | null = null;
  #waitServerHeartBeatTimer: number | null = null;
  reconnectCount: number;
  isReconnecting: boolean;
  isHandleClose: boolean;

  #options: {
    heartBeatTime: number;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  constructor(
    url: string,
    options?: Partial<{
      heartBeatTime: number;
      reconnectInterval: number;
      maxReconnectAttempts: number;
    }>
  ) {
    this.url = url;
    this.isReconnecting = false;
    this.#options = {
      heartBeatTime: 25000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 3,
      ...options
    };
    this.reconnectCount = 0;
    this.isHandleClose = true;
  }

  public isConnecting(): boolean {
    return this.websocket?.readyState === WebSocket.CONNECTING;
  }

  public isOpen(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  init(token: string) {
    if (this.isConnecting() || this.isOpen()) {
      console.log('WebSocket is already connecting or open.');
      return;
    }

    try {
      this.websocket = new WebSocket(`${this.url}?token=${token}`);
      this.websocket.binaryType = 'blob';
      this.isHandleClose = false;
      this.isReconnecting = false;

      this.websocket.onopen = this.onopen.bind(this);
      this.websocket.onclose = this.onclose.bind(this);
      this.websocket.onerror = this.onerror.bind(this);
      this.websocket.onmessage = this.onmessage.bind(this);
    } catch (error) {
      console.log('websocket建立失敗', error);
      this.reconnect();
    }
  }

  resetHeartBeat() {
    if (this.#heartBeatTimer) clearTimeout(this.#heartBeatTimer);
    if (this.#waitServerHeartBeatTimer) clearTimeout(this.#waitServerHeartBeatTimer);
  }

  startHeartBeat() {
    this.resetHeartBeat();
    console.log('startHeartBeat');

    this.#heartBeatTimer = window.setTimeout(() => {
      this.websocket?.send('ping');
      this.#waitServerHeartBeatTimer = window.setTimeout(() => {
        console.warn('伺服器心跳回覆超時，主動斷開');
        this.websocket?.close(4000, '等待心跳超時'); // 觸發 onclose 進行重連
      }, 5000);
    }, this.#options.heartBeatTime) as unknown as number;
  }

  reconnect() {
    if (this.isReconnecting || this.isHandleClose) return;
    if (this.reconnectCount >= this.#options.maxReconnectAttempts) {
      console.log('websocket 自動重連次數已達上限, 請手動重連!!');
      return;
    }

    this.isReconnecting = true;
    this.reconnectCount++;
    console.log('websocket reconnecting!!');
    // window.setTimeout避免型別錯誤
    window.setTimeout(() => {
      console.log('is reconnected!!');
      this.init(this.#authStore.token);
    }, this.#options.reconnectInterval);
  }

  subscribe({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) {
    this.subscribtion.subscribe({ type, fnAry });
  }

  unSubscribe({ type, fnAry }: { type: string; fnAry: ((...args: any[]) => void)[] }) {
    this.subscribtion.unSubscribe({ type, fnAry });
  }

  notify({ type, data, code }: DataType<unknown>) {
    console.log(`get type: ${type} | data: ${JSON.stringify(data)} | code: ${code}`);
    this.subscribtion.notify({ type, data, code });
  }

  onopen() {
    console.log(`name: ${this.url} - socket on open`);
    this.reconnectCount = 0;
    this.startHeartBeat();
  }

  onerror(event: Event) {
    console.error('Websocket error:', event);
  }

  onclose(event: CloseEvent) {
    console.log(`name: ${this.url} - websocket close`, event.code);
    this.websocket = null;

    if (!this.isHandleClose) {
      this.reconnect();
    }

    this.resetHeartBeat();
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

      try {
        const res = await new Response(event.data).json();
        const { type, data, code } = res;
        console.log(res, 'onmessage');
        this.notify({ type, data, code });
        if (res.code === 'UNAUTHORIZATION') {
          useForceKickOut();
        }
      } catch (error) {
        console.error('WebSocket 訊息解析失敗:', error, event.data);
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
    this.isHandleClose = true; // 標記為人為關閉
    this.resetHeartBeat();
    this.websocket?.close();
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
