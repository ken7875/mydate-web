import type { DataType } from './types';
import createSubscribeHandler from './subscribe';
import { tokenCookie } from '@/utils/cookies/index';

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

export interface BaseWebsocketOptions {
  heartBeatTime?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onUnauthorized?: () => void;
}

export default class BaseWebsocket {
  url: string;
  websocket: WebSocket | null = null;

  #onUnauthorized: (() => void) | null = null;

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
  protected subscribeHandler: ReturnType<typeof createSubscribeHandler> | null = null;

  constructor(url: string, options?: BaseWebsocketOptions) {
    this.url = url;
    this.isReconnecting = false;
    this.#onUnauthorized = options?.onUnauthorized ?? null;
    this.#options = {
      heartBeatTime: options?.heartBeatTime ?? 25000,
      reconnectInterval: options?.reconnectInterval ?? 5000,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 3
    };
    this.reconnectCount = 0;
    this.isHandleClose = true;
    if (process.client) {
      this.subscribeHandler = createSubscribeHandler();
    }
  }

  // TODO 需要補上 broadcastChannel 避免開多頁籤 ws 重連
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
      // 使用 Sec-WebSocket-Protocol header 傳遞 token，避免 token 暴露在 URL log 中
      this.websocket = new WebSocket(this.url, [`bearer-${token}`]);
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
      const token = tokenCookie().getItem();
      if (!token) {
        console.warn('No token available in cookie for reconnection');
        return;
      }
      this.init(token);
    }, delay);
  }

  notify({ type, data, code }: DataType<unknown>) {
    console.log(`get type: ${type} | data: ${JSON.stringify(data)} | code: ${code}`);
    this.subscribeHandler?.broadcast(type, data, code);
  }

  subscribe(type: string, handler: (data: any) => void) {
    this.subscribeHandler?.subscribe(type, handler);
  }

  unsubscribe(type: string, handler: (data: any) => void) {
    this.subscribeHandler?.unsubscribe(type, handler);
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

    // Identity check：若觸發 onclose 的不是當前活躍實例，忽略（防禦舊實例誤觸發）
    if (event.target !== this.websocket) {
      console.log('Ignoring onclose from stale WebSocket instance');
      return;
    }

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
      // 先檢查未授權，阻止訊息廣播
      if (code === 'UNAUTHORIZATION') {
        this.handleClose();
        this.#onUnauthorized?.();
        return;
      }

      this.notify({ type, data, code });
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
    this.subscribeHandler?.removeAll();
  }

  websocketGlobalMessage(data: any) {
    console.log(`websocket global message data: ${JSON.stringify(data)}`);
  }
}
