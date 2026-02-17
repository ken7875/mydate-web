import { useAuth } from '@/store/auth';
import type { DataType } from './types';
import { useWebsocketSubscribe } from '@/store/websocketSubscribe';
import { useForceKickOut } from '@/utils/forceLogout';

// 允許自動重連的 close code 白名單
const RECONNECTABLE_CLOSE_CODES: ReadonlySet<number> = new Set([
  1001, // Going Away — 伺服器關閉或頁面導航
  1006, // Abnormal Closure — 未收到 close frame（網路斷線）
  1011, // Internal Error — 伺服器內部錯誤
  1012, // Service Restart — 伺服器重啟
  1013, // Try Again Later — 伺服器暫時無法處理
  1014, // Bad Gateway — 代理/閘道錯誤
  4000 // 自訂：心跳超時主動斷開
]);

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

  // 預先綁定事件處理器，避免每次 init/reconnect 時重複建立新的函式物件
  #boundOnOpen = this.onopen.bind(this);
  #boundOnClose = this.onclose.bind(this);
  #boundOnError = this.onerror.bind(this);
  #boundOnMessage = this.onmessage.bind(this);

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

      this.websocket.onopen = this.#boundOnOpen;
      this.websocket.onclose = this.#boundOnClose;
      this.websocket.onerror = this.#boundOnError;
      this.websocket.onmessage = this.#boundOnMessage;
    } catch (error) {
      console.log('websocket建立失敗', error);
      this.reconnect();
    }
  }

  resetHeartBeat() {
    if (this.#heartBeatTimer) clearTimeout(this.#heartBeatTimer);
    if (this.#waitServerHeartBeatTimer) clearTimeout(this.#waitServerHeartBeatTimer);

    this.#heartBeatTimer = null;
    this.#waitServerHeartBeatTimer = null;
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

    // 指數退避 + 隨機抖動，避免多客戶端同時重連造成驚群效應
    const delay = Math.min(
      this.#options.reconnectInterval * Math.pow(2, this.reconnectCount - 1) + Math.random() * 1000,
      30000
    );
    console.log(`websocket reconnecting (attempt ${this.reconnectCount}, delay ${Math.round(delay)}ms)`);

    window.setTimeout(() => {
      this.init(this.#authStore.token);
    }, delay);
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
    this.resetHeartBeat();

    if (!this.isHandleClose && RECONNECTABLE_CLOSE_CODES.has(event.code)) {
      this.reconnect();
    }
  }

  async onmessage(event: MessageEvent) {
    // 統一取得字串：string 直接使用，Blob 透過 text() 解析
    const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();

    if (raw === 'pong') {
      this.startHeartBeat();
      return;
    }

    try {
      const res = JSON.parse(raw);
      const { type, data, code } = res;
      console.log(res, 'onmessage');
      this.notify({ type, data, code });
      if (res.code === 'UNAUTHORIZATION') {
        useForceKickOut();
      }
    } catch (error) {
      console.error('WebSocket 訊息解析失敗:', error, event.data);
    }
  }

  handleSend<T = string, U = 'global'>(
    data: U extends 'video' ? Blob : { type: 'chatRoom' | 'global' | 'video'; data: T }
  ) {
    if (data instanceof Blob) {
      this.websocket?.send?.(data);
      return;
    }

    this.websocket?.send?.(JSON.stringify(data));
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
