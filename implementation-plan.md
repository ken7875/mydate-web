# Implementation Plan: WebSocket 架構重構與修復

## Overview

HOT DATE 專案的 WebSocket 架構存在 20 個已識別問題，涵蓋關鍵 bug（訊息順序、錯誤處理、race condition）、架構耦合（store 與 utility 互相依賴、SSR 安全性）、多頁籤效能（缺乏 Leader Election）以及型別安全與持續改進。本計畫將這些問題分為 4 個 Phase，共 15 個 TASK，每個 TASK 可獨立執行與驗證。

## Requirements

- 修復 UNAUTHORIZATION 訊息廣播順序錯誤，避免未授權訊息洩漏到 UI
- 修復 StreamWebsocket.onmessage 缺少 JSON.parse 錯誤處理
- 修復重連時舊 WebSocket onclose 覆蓋新實例的 race condition
- 解除 BaseWebsocket 對 authStore 和 useForceKickOut 的直接依賴
- 分離訂閱生命週期與連線生命週期
- 消除 ChatRoom handler 在 layout 和 chatroom page 的重複訂閱
- 實作 Leader Election，多頁籤只建立單一 WS 連線
- 重連上限後提供恢復機制與 UI 通知
- 強化型別安全，消除 any 型別
- 高併發訊息批次/節流機制

## Architecture Changes

- `utils/websocket/index.ts` — 移除 authStore/forceKickOut 直接依賴，改為 constructor 注入；修復 onmessage 順序與 onclose race condition
- `utils/websocket/subscribe.ts` — 分離 removeAll 為 closeChannels（只關 BroadcastChannel）與 clearHandlers（清除 handler）
- `utils/websocket/stream.ts` — 加入 JSON.parse 錯誤處理，修正 pong 比對邏輯
- `utils/websocket/types.ts` — 強化 DataType 型別，使用 WsChannel enum 取代 string
- `utils/websocket/leaderElection.ts` — 新增 Leader Election 機制
- `store/notificationWebSocket.ts` — 延遲初始化 BaseWebsocket，注入 token getter 與 onUnauthorized callback
- `store/stream.ts` — 延遲初始化 StreamWebsocket
- `composables/useWsChannel.ts` — Handler 型別強化
- `layouts/default.vue` — 移除 ChatRoom handler，只保留全域通知邏輯
- `pages/chatroom/index.vue` — 承擔完整 ChatRoom 訊息處理
- `pages/live/[uuid].vue` — 改用 useWsChannel composable
- `enums/websocket.ts` — 保持不變，已有正確 enum 定義

## Implementation Steps

### Phase 1: 關鍵修復（High Priority）

#### TASK-001: 修復 UNAUTHORIZATION 訊息先 notify 再處理的順序問題

- **說明**: 目前 `onmessage` 先呼叫 `this.notify()` 廣播訊息到所有訂閱者，然後才檢查 `UNAUTHORIZATION`，導致未授權訊息會被 UI 元件接收處理
- **修改檔案**: `utils/websocket/index.ts`
- **前置依賴**: 無
- **風險**: Low

**實作步驟**:

1. 在 `utils/websocket/index.ts` 第 173-195 行的 `onmessage` 方法中，將 `UNAUTHORIZATION` 檢查移到 `notify` 之前：

```typescript
// 目前程式碼（錯誤順序）:
// L186: this.notify({ type, data, code });
// L187: if (res.code === 'UNAUTHORIZATION') {

// 修正為:
async onmessage(event: MessageEvent) {
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
      this.onUnauthorized?.();
      return;
    }

    this.notify({ type, data, code });
  } catch (error) {
    console.error('WebSocket 訊息解析失敗:', error, event.data);
  }
}
```

2. 注意：此步驟同時涉及問題 #4（`useForceKickOut` 改為 callback），但 callback 注入會在 TASK-004 完成。此處先保留 `useForceKickOut()` 呼叫，僅調整順序。暫時寫為：

```typescript
if (code === 'UNAUTHORIZATION') {
  this.handleClose();
  useForceKickOut();
  return;
}
```

**驗證方式**:
- 單元測試：mock `notify` 方法，發送 `UNAUTHORIZATION` 訊息時驗證 `notify` 未被呼叫
- 手動測試：token 過期後確認不會有未授權訊息閃現在 UI

---

#### TASK-002: StreamWebsocket.onmessage 加入 JSON.parse 錯誤處理

- **說明**: `stream.ts` 第 17-18 行 `JSON.parse` 沒有 try/catch；且當 `event.data` 為 string 類型的 `'pong'` 時，第 17 行 `(event.data as Blob).text()` 會拋出錯誤，因為 pong 檢查（第 12 行）只比對 `event.data === 'pong'`，但如果 data 是 Blob 形式的 pong，會漏掉
- **修改檔案**: `utils/websocket/stream.ts`
- **前置依賴**: 無
- **風險**: Low

**實作步驟**:

1. 重寫 `StreamWebsocket.onmessage` 方法：

```typescript
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
```

**驗證方式**:
- 單元測試：傳入非 JSON 的 Blob 資料，驗證不會拋出未捕獲錯誤且正確走入 video notify
- 單元測試：傳入 string 'pong'，驗證觸發 startHeartBeat
- 單元測試：傳入 JSON `{ type: 'global', ... }`，驗證呼叫 notify 且 type 為 global

---

#### TASK-003: 修復重連時舊 WebSocket onclose 覆蓋新實例（race condition）

- **說明**: `init()` 建立新 WebSocket 時，舊實例的 `onclose` callback 仍然綁定在 `this` 上。舊 WS 的 `onclose` 觸發時執行 `this.websocket = null`（第 165 行），但此時 `this.websocket` 已指向新建立的實例，導致新連線被意外清除
- **修改檔案**: `utils/websocket/index.ts`
- **前置依賴**: 無
- **風險**: Medium — 修改核心連線邏輯

**實作步驟**:

1. 在 `init()` 方法中，建立新 WebSocket 前先清理舊實例的事件監聽：

```typescript
init(token: string) {
  if (this.isConnecting() || this.isOpen()) {
    console.log('WebSocket is already connecting or open.');
    return;
  }

  try {
    // 清理舊實例的事件監聽，防止舊 onclose 覆蓋新實例
    if (this.websocket) {
      this.websocket.onopen = null;
      this.websocket.onclose = null;
      this.websocket.onerror = null;
      this.websocket.onmessage = null;
    }

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
```

2. 在 `onclose` 中加入 identity check，確保只有當前活躍的 WebSocket 觸發的 close 才會操作 `this.websocket`：

```typescript
onclose(event: CloseEvent) {
  console.log(`name: ${this.url} - websocket close`, event.code);

  // Identity check：若觸發 onclose 的不是當前活躍實例，忽略
  // 因為使用 bound function，需要透過 event.target 比對
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
```

**注意**: `#boundOnClose` 使用 `this.onclose.bind(this)`，`onclose` 接收的 `event.target` 就是觸發事件的 WebSocket 實例，可以用來做 identity check。但由於 `onclose` 的參數型別是 `CloseEvent`，`event.target` 的型別是 `EventTarget | null`，需要做型別斷言。

**驗證方式**:
- 單元測試：模擬快速重連場景，舊 WS 的 onclose 觸發時不應將 `this.websocket` 設為 null
- 手動測試：在不穩定網路環境下多次重連，確認連線穩定

---

### Phase 2: 架構解耦（Medium Priority）

#### TASK-004: BaseWebsocket 移除 authStore 和 useForceKickOut 直接依賴

- **說明**: `BaseWebsocket` 在 class field（第 21 行）直接實例化 `useAuth()`，且在 `onmessage`（第 189 行）直接呼叫 `useForceKickOut()`。utility 層不應反向依賴 store 層，且 `useAuth()` 在 SSR 期間缺少 Pinia context 會拋錯
- **修改檔案**:
  - `utils/websocket/index.ts`
  - `store/notificationWebSocket.ts`
  - `store/stream.ts`
- **前置依賴**: TASK-001（onmessage 順序已修正）
- **風險**: Medium

**實作步驟**:

1. 修改 `BaseWebsocket` constructor，接收 `tokenGetter` 和 `onUnauthorized` callback：

```typescript
// utils/websocket/index.ts

// 移除頂部 import:
// import { useAuth } from '@/store/auth';
// import { useForceKickOut } from '@/utils/forceLogout';

export interface BaseWebsocketOptions {
  heartBeatTime?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  tokenGetter?: () => string;
  onUnauthorized?: () => void;
}

export default class BaseWebsocket {
  url: string;
  websocket: WebSocket | null = null;

  // 移除 #authStore
  #tokenGetter: (() => string) | null = null;
  #onUnauthorized: (() => void) | null = null;

  // ... 其餘 field 不變

  constructor(url: string, options?: BaseWebsocketOptions) {
    this.url = url;
    this.isReconnecting = false;
    this.#tokenGetter = options?.tokenGetter ?? null;
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

  // reconnect 中使用 tokenGetter 取代 this.#authStore.token
  reconnect() {
    if (this.isReconnecting || this.isHandleClose) return;
    if (this.reconnectCount >= this.#options.maxReconnectAttempts) {
      console.log('websocket 自動重連次數已達上限, 請手動重連!!');
      return;
    }

    this.isReconnecting = true;
    this.reconnectCount++;

    const delay = Math.min(
      this.#options.reconnectInterval * Math.pow(2, this.reconnectCount - 1) + Math.random() * 1000,
      30000
    );

    window.setTimeout(() => {
      const token = this.#tokenGetter?.();
      if (!token) {
        console.warn('No token available for reconnection');
        return;
      }
      this.init(token);
    }, delay);
  }

  // onmessage 中使用 callback 取代直接呼叫
  async onmessage(event: MessageEvent) {
    const raw = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
    if (raw === 'pong') {
      this.startHeartBeat();
      return;
    }
    try {
      const res = JSON.parse(raw);
      const { type, data, code } = res;
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
}
```

2. 更新 `store/notificationWebSocket.ts`，延遲建立 WebSocket 並注入依賴：

```typescript
// store/notificationWebSocket.ts
import { defineStore } from 'pinia';
import { StatusCode } from '~/enums/common';
import BaseWebsocket from '@/utils/websocket/index';
import { useAuth } from '@/store/auth';
import { useForceKickOut } from '@/utils/forceLogout';

export const useNotification = defineStore('notification', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/notificationWs` as string;

  // 延遲建立，避免 SSR 期間實例化
  let websocketTool: BaseWebsocket | null = null;

  const getWs = (): BaseWebsocket => {
    if (!websocketTool) {
      const authStore = useAuth();
      websocketTool = new BaseWebsocket(url, {
        tokenGetter: () => authStore.token,
        onUnauthorized: () => useForceKickOut()
      });
    }
    return websocketTool;
  };

  const init = (token: string) => {
    getWs().init(token);
  };

  // ... 其餘方法同理，將 websocketTool 替換為 getWs()
  const notify = ({ type, data, code }: { type: string; data: any; code: StatusCode }) => {
    getWs().notify({ type, data, code });
  };

  const handleClose = () => {
    getWs().handleClose();
  };

  const handleSend = <T>(data: { type: 'chatRoom' | 'global'; data: T }) => {
    getWs().handleSend(data);
  };

  const websocketGlobalMessage = (data: any) => {
    getWs().websocketGlobalMessage(data);
  };

  const subscribe = (type: string, handler: (data: any) => void) => {
    getWs().subscribe(type, handler);
  };

  const unsubscribe = (type: string, handler: (data: any) => void) => {
    getWs().unsubscribe(type, handler);
  };

  return { init, handleClose, notify, handleSend, websocketGlobalMessage, subscribe, unsubscribe };
});
```

3. 同理更新 `store/stream.ts`，延遲建立 `StreamWebsocket`：

```typescript
let websocketTool: StreamWebsocket | null = null;

const getWs = (): StreamWebsocket => {
  if (!websocketTool) {
    const authStore = useAuth();
    websocketTool = new StreamWebsocket(url, {
      tokenGetter: () => authStore.token,
      onUnauthorized: () => useForceKickOut()
    });
  }
  return websocketTool;
};
```

**驗證方式**:
- 確認 `utils/websocket/index.ts` 不再 import 任何 store 或 Nuxt composable
- SSR 建置不會因為 WebSocket 實例化而拋錯
- 手動測試：token 過期 → 收到 UNAUTHORIZATION → 正確觸發登出流程

---

#### TASK-005: 分離訂閱生命週期與連線生命週期

- **說明**: `handleClose()` 呼叫 `subscribeHandler.removeAll()` 清除所有訂閱（包括 BroadcastChannel 和 handler）。重連成功後，所有元件的 handler 都已丟失，導致訊息無法送達 UI
- **修改檔案**:
  - `utils/websocket/subscribe.ts`
  - `utils/websocket/index.ts`
- **前置依賴**: 無
- **風險**: Medium

**實作步驟**:

1. 在 `subscribe.ts` 中新增 `closeChannels` 方法，只關閉 BroadcastChannel 但保留 handler：

```typescript
// utils/websocket/subscribe.ts

const createSubscribeHandler = () => {
  const consumers = new Map<string, { ch: BroadcastChannel | null; handlers: Set<Handler> }>();

  const ensureChannel = (type: string): BroadcastChannel => {
    const entry = consumers.get(type);
    if (entry && entry.ch) return entry.ch;

    const ch = new BroadcastChannel(type);
    const handlers = entry?.handlers ?? new Set<Handler>();

    ch.addEventListener('message', ({ data }) => {
      handlers.forEach((h) => {
        try {
          h(data.data);
        } catch (error) {
          console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
        }
      });
    });

    consumers.set(type, { ch, handlers });
    return ch;
  };

  const dispatch = (type: string, data: unknown, code: unknown) => {
    const entry = consumers.get(type);
    if (!entry) return;

    entry.handlers.forEach((h) => {
      try {
        h(data);
      } catch (error) {
        console.error(`Error in BroadcastChannel handler for type ${type}:`, error);
      }
    });

    // 確保 channel 存在再廣播
    const ch = ensureChannel(type);
    ch.postMessage({ type, data, code });
  };

  const broadcast = (type: string, data: unknown, code: unknown) => {
    dispatch(type, data, code);
  };

  const subscribe = (type: string, handler: Handler) => {
    ensureChannel(type);
    consumers.get(type)!.handlers.add(handler);
  };

  const unsubscribe = (type: string, handler: Handler) => {
    const entry = consumers.get(type);
    if (!entry) return;
    entry.handlers.delete(handler);
    if (entry.handlers.size === 0) {
      entry.ch?.close();
      consumers.delete(type);
    }
  };

  // 只關閉 BroadcastChannel，保留 handler 供重連後使用
  const closeChannels = () => {
    consumers.forEach((entry) => {
      entry.ch?.close();
      entry.ch = null;
    });
  };

  // 完全清除（登出時使用）
  const removeAll = () => {
    consumers.forEach(({ ch }) => ch?.close());
    consumers.clear();
  };

  return {
    broadcast,
    subscribe,
    unsubscribe,
    closeChannels,
    removeAll
  };
};
```

2. 修改 `BaseWebsocket.handleClose()`，區分「斷線重連」與「主動登出」：

```typescript
// utils/websocket/index.ts

// 斷線時只關閉 channel，不清除 handler
onclose(event: CloseEvent) {
  // ... identity check (TASK-003)
  this.websocket = null;
  this.resetHeartBeat();
  this.subscribeHandler?.closeChannels(); // 取代 removeAll

  if (!this.isHandleClose && RECONNECTABLE_CLOSE_CODES.has(event.code)) {
    this.reconnect();
  }
}

// 主動關閉（登出）時完全清除
handleClose() {
  this.isHandleClose = true;
  this.resetHeartBeat();
  this.websocket?.close();
  this.websocket = null;
  this.subscribeHandler?.removeAll(); // 完全清除
}
```

**驗證方式**:
- 手動測試：斷網 → 重連成功後，訊息仍能正確送達 UI 元件
- 單元測試：呼叫 `closeChannels` 後 handler 數量不變，呼叫 `removeAll` 後 consumers 為空

---

#### TASK-006: 消除 ChatRoom handler 在 layout 和 page 的重複訂閱

- **說明**: `layouts/default.vue` 第 67-71 行和 `pages/chatroom/index.vue` 第 261 行都訂閱了 `WsChannel.ChatRoom`，導致同一訊息被處理兩次。Layout 應只負責全域級通知（如更新聊天列表 badge），chatroom page 負責即時訊息渲染
- **修改檔案**:
  - `layouts/default.vue`
  - `pages/chatroom/index.vue`
- **前置依賴**: 無
- **風險**: Low

**實作步驟**:

1. 在 `layouts/default.vue` 中，將 `chatRoomMessageHandler` 的邏輯改為「僅在非 chatroom 頁面時更新 query cache」（因為 chatroom page 已有自己的 handler 處理）：

```typescript
// layouts/default.vue

const route = useRoute();

const chatRoomMessageHandler = (payload: WsPayload) => {
  const msg = payload.data?.message;
  if (!msg) return;

  // 若當前在 chatroom 頁面，由 chatroom page 自己的 handler 處理
  if (route.path === '/chatroom') return;

  updateQuery({ newMessage: msg, senderId: msg.senderId, receiverId: msg.receiverId });
};
```

2. `pages/chatroom/index.vue` 的 `chatRoomHandler` 保持不變，負責即時訊息渲染與 query cache 更新。

**驗證方式**:
- 手動測試：在 chatroom 頁面收到訊息時，確認 `updateQuery` 只被呼叫一次
- 手動測試：在其他頁面（如 friends）收到訊息時，確認 badge/列表仍會更新

---

### Phase 3: 多頁籤優化

#### TASK-007: 實作 Leader Election 機制

- **說明**: 目前每個頁籤都獨立建立 WebSocket 連線，造成伺服器資源浪費。應只由 leader 頁籤建立 WS 連線並透過 BroadcastChannel 廣播給 follower
- **修改檔案**:
  - 新增 `utils/websocket/leaderElection.ts`
- **前置依賴**: TASK-005（訂閱生命週期分離）
- **風險**: High — 核心架構變更，需充分測試多頁籤場景

**實作步驟**:

1. 建立 `utils/websocket/leaderElection.ts`：

```typescript
// utils/websocket/leaderElection.ts

interface LeaderElectionOptions {
  /** 用於區分不同 lock 的名稱 */
  name: string;
  /** 成為 leader 時呼叫 */
  onBecomeLeader: () => void;
  /** 失去 leader 身份時呼叫 */
  onLoseLeadership: () => void;
}

/**
 * 使用 Web Locks API 實現 Leader Election。
 * 第一個取得 lock 的頁籤成為 leader，lock 釋放後（頁籤關閉）其他頁籤競爭。
 *
 * 瀏覽器支援：Chrome 69+, Firefox 96+, Safari 15.4+
 * 若不支援，則每個頁籤都當 leader（降級為現有行為）
 */
export function createLeaderElection(options: LeaderElectionOptions) {
  const { name, onBecomeLeader, onLoseLeadership } = options;
  let isLeader = false;
  let abortController: AbortController | null = null;

  const start = () => {
    // 降級：不支援 Web Locks API 時，直接當 leader
    if (!navigator.locks) {
      isLeader = true;
      onBecomeLeader();
      return;
    }

    abortController = new AbortController();

    navigator.locks.request(
      `ws-leader-${name}`,
      { signal: abortController.signal },
      () => {
        isLeader = true;
        onBecomeLeader();

        // 回傳一個永遠不會 resolve 的 Promise，保持 lock 直到頁籤關閉
        return new Promise<void>(() => {});
      }
    ).catch((err) => {
      if (err.name === 'AbortError') return; // 正常取消
      console.error('Leader election error:', err);
    });
  };

  const stop = () => {
    if (isLeader) {
      onLoseLeadership();
    }
    isLeader = false;
    abortController?.abort();
    abortController = null;
  };

  return {
    start,
    stop,
    get isLeader() {
      return isLeader;
    }
  };
}
```

2. 此 TASK 僅建立基礎設施，整合到 store 在 TASK-008 處理。

**驗證方式**:
- 單元測試：mock `navigator.locks`，驗證 `onBecomeLeader` 被呼叫
- 單元測試：不支援 `navigator.locks` 時，直接成為 leader

---

#### TASK-008: 整合 Leader Election 到 notificationWebSocket store

- **說明**: 將 Leader Election 整合到 notification store，只有 leader 頁籤建立 WS 連線。Follower 頁籤透過 BroadcastChannel 接收訊息（已由 `subscribe.ts` 支援）
- **修改檔案**:
  - `store/notificationWebSocket.ts`
  - `layouts/default.vue`
- **前置依賴**: TASK-004, TASK-007
- **風險**: High

**實作步驟**:

1. 修改 `store/notificationWebSocket.ts`：

```typescript
import { createLeaderElection } from '@/utils/websocket/leaderElection';

export const useNotification = defineStore('notification', () => {
  const runtimeConfig = useRuntimeConfig();
  const url = `${runtimeConfig.public.wsBase}/notificationWs` as string;

  let websocketTool: BaseWebsocket | null = null;
  let leaderElection: ReturnType<typeof createLeaderElection> | null = null;

  const getWs = (): BaseWebsocket => {
    if (!websocketTool) {
      const authStore = useAuth();
      websocketTool = new BaseWebsocket(url, {
        tokenGetter: () => authStore.token,
        onUnauthorized: () => useForceKickOut()
      });
    }
    return websocketTool;
  };

  const init = (token: string) => {
    if (leaderElection) return; // 已經啟動

    leaderElection = createLeaderElection({
      name: 'notification',
      onBecomeLeader: () => {
        console.log('This tab is now the WS leader');
        getWs().init(token);
      },
      onLoseLeadership: () => {
        console.log('This tab lost WS leadership');
        getWs().handleClose();
      }
    });

    leaderElection.start();
  };

  const handleClose = () => {
    leaderElection?.stop();
    leaderElection = null;
    websocketTool?.handleClose();
    websocketTool = null;
  };

  // ... 其餘方法保持不變
});
```

2. `layouts/default.vue` 的 `watch(authStore.token)` 不需要修改，因為 `init()` 內部已處理 leader election。

**驗證方式**:
- 手動測試：開啟 2 個頁籤，確認只有 1 個建立 WS 連線（透過瀏覽器 DevTools Network 面板檢查）
- 手動測試：關閉 leader 頁籤，確認另一個頁籤接管連線
- 手動測試：兩個頁籤都能正常收到訊息

---

#### TASK-009: 重連達上限後的恢復機制與 UI 通知

- **說明**: 目前重連 3 次失敗後只 console.log，使用者無感知且無法恢復
- **修改檔案**:
  - `utils/websocket/index.ts`
  - `store/notificationWebSocket.ts`
- **前置依賴**: TASK-004
- **風險**: Low

**實作步驟**:

1. 在 `BaseWebsocket` 中加入 `onReconnectExhausted` callback 和網路恢復監聽：

```typescript
// utils/websocket/index.ts — constructor options 新增:
export interface BaseWebsocketOptions {
  // ... 既有欄位
  onReconnectExhausted?: () => void;
}

// constructor 中存儲:
this.#onReconnectExhausted = options?.onReconnectExhausted ?? null;

// reconnect() 中，達上限時觸發 callback:
if (this.reconnectCount >= this.#options.maxReconnectAttempts) {
  console.log('websocket 自動重連次數已達上限');
  this.#onReconnectExhausted?.();
  return;
}

// 新增網路恢復自動重連方法:
enableAutoRecovery() {
  if (!process.client) return;

  const handleOnline = () => {
    if (!this.isOpen() && !this.isConnecting() && !this.isHandleClose) {
      console.log('Network restored, attempting reconnection');
      this.reconnectCount = 0; // 重設計數
      const token = this.#tokenGetter?.();
      if (token) this.init(token);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !this.isOpen() && !this.isConnecting() && !this.isHandleClose) {
      console.log('Tab visible, checking connection');
      this.reconnectCount = 0;
      const token = this.#tokenGetter?.();
      if (token) this.init(token);
    }
  };

  window.addEventListener('online', handleOnline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 返回清理函式
  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
```

2. 在 `store/notificationWebSocket.ts` 中使用 `onReconnectExhausted` 觸發 UI 通知：

```typescript
const getWs = (): BaseWebsocket => {
  if (!websocketTool) {
    const authStore = useAuth();
    const messageStore = useMessage();
    websocketTool = new BaseWebsocket(url, {
      tokenGetter: () => authStore.token,
      onUnauthorized: () => useForceKickOut(),
      onReconnectExhausted: () => {
        messageStore.openMessage({
          title: '連線中斷',
          content: '即時訊息連線已中斷，將在網路恢復時自動重連',
          type: 'error',
          hasCancel: false
        });
      }
    });
    websocketTool.enableAutoRecovery();
  }
  return websocketTool;
};
```

**驗證方式**:
- 手動測試：斷網 → 等待 3 次重連失敗 → 確認 UI 顯示「連線中斷」提示
- 手動測試：恢復網路 → 確認自動重連成功
- 手動測試：切換到其他頁籤再切回 → 確認連線恢復

---

### Phase 4: 持續改進

#### TASK-010: 強化 WsPayload 型別安全（消除 any）

- **說明**: `DataType<T>` 的 `type` 欄位是 `string`，`WsPayload` 的 `data` 是 `any`，無法在編譯時期發現型別錯誤
- **修改檔案**:
  - `utils/websocket/types.ts`
  - `composables/useWsChannel.ts`
  - `enums/websocket.ts`
- **前置依賴**: 無
- **風險**: Low

**實作步驟**:

1. 更新 `utils/websocket/types.ts`：

```typescript
import { StatusCode } from '@/enums/common';
import type { WsChannel } from '@/enums/websocket';

export interface DataType<T = unknown> {
  type: WsChannel | string; // 逐步遷移：允許 string 但優先使用 enum
  data: T;
  code: StatusCode;
}
```

2. 在 `composables/useWsChannel.ts` 中，為已知 channel 建立型別映射：

```typescript
import type { WsChannel, WSCode } from '~/enums/websocket';
import type { Message } from '@/api/types/chat';
import type { GetRoomsResponse } from '@/api/types/stream';

// 已知 channel 的 payload data 型別映射
export interface WsChannelDataMap {
  [WsChannel.Global]: unknown;
  [WsChannel.InviteFriend]: { uuid: string; userName: string };
  [WsChannel.SetFriendStatus]: void;
  [WsChannel.AddRoom]: GetRoomsResponse;
  [WsChannel.DeleteRoom]: { uuid: string };
  [WsChannel.ChatRoom]: { user?: unknown; message: Message[] };
  [WsChannel.StreamRoomStatus]: { uuid: string; status: boolean };
  [WsChannel.OpenStatus]: unknown;
}

export type WsPayload<T extends WsChannel = WsChannel> = {
  data: WsChannelDataMap[T];
  code: WSCode;
  type: T;
};

// 向後相容：通用型別
export type WsPayloadGeneric = { data: any; code: WSCode; type: WsChannel };
export type Handler<T extends WsChannel = WsChannel> = (payload: WsPayload<T>) => void;
```

3. 此為漸進式遷移，既有程式碼使用 `WsPayloadGeneric` 維持向後相容，新程式碼使用泛型 `WsPayload<T>`。

**驗證方式**:
- `yarn lint` 無新增錯誤
- 確認既有元件的 handler 型別相容

---

#### TASK-011: live/[uuid].vue 改用 useWsChannel composable

- **說明**: `pages/live/[uuid].vue` 第 145-146 行直接呼叫 `streamStore.subscribe('streamRoomStatus', startVideo)`，未使用 `useWsChannel` composable，不一致且未自動清理
- **修改檔案**: `pages/live/[uuid].vue`
- **前置依賴**: 無
- **風險**: Low

**實作步驟**:

1. 將直接訂閱改為 `useWsChannel`：

```typescript
// pages/live/[uuid].vue

// 移除:
// const startVideoHandler = () => { ... streamStore.subscribe('streamRoomStatus', startVideo); }
// onUnmounted(() => { streamStore.unSubscribe('streamRoomStatus', startVideo); ... })

// 改為:
const streamStore = useStream();

const streamRoomStatusHandler = (payload: WsPayload) => {
  startVideo(payload.data as { uuid: string; status: boolean });
};

useWsChannel(
  [{ type: WsChannel.StreamRoomStatus, handler: streamRoomStatusHandler }],
  { subscribe: streamStore.subscribe, unsubscribe: streamStore.unSubscribe }
);

onMounted(() => {
  getRoomInfo().then(() => {
    if (import.meta.client && isVideoStart.value) {
      startVideo({ uuid: roomInfo.value?.uuid || '', status: true });
    }
  });
});

onUnmounted(() => {
  hls && hls.destroy();
});
```

**驗證方式**:
- 手動測試：進入直播間，開播時影片正常播放
- 手動測試：離開直播間後，不再收到 streamRoomStatus 訊息

---

#### TASK-012: Timer 型別修正

- **說明**: `#heartBeatTimer` 和 `#waitServerHeartBeatTimer` 宣告為 `number | null`，但 `setTimeout` 在不同環境回傳 `NodeJS.Timeout`（SSR）或 `number`（browser）。目前第 115 行已用 `as unknown as number` 強制轉型，不夠安全
- **修改檔案**: `utils/websocket/index.ts`
- **前置依賴**: 無
- **風險**: Low

**實作步驟**:

1. 使用 `ReturnType<typeof setTimeout>` 統一型別：

```typescript
// utils/websocket/index.ts

#heartBeatTimer: ReturnType<typeof setTimeout> | null = null;
#waitServerHeartBeatTimer: ReturnType<typeof setTimeout> | null = null;
```

2. 移除第 115 行的 `as unknown as number` 強制轉型，改用 `window.setTimeout`（因為只在 client 端執行，`window.setTimeout` 回傳 `number`）：

```typescript
startHeartBeat() {
  this.resetHeartBeat();
  this.#heartBeatTimer = window.setTimeout(() => {
    this.websocket?.send('ping');
    this.#waitServerHeartBeatTimer = window.setTimeout(() => {
      console.warn('伺服器心跳回覆超時，主動斷開');
      this.websocket?.close(4000, '等待心跳超時');
    }, 5000);
  }, this.#options.heartBeatTime);
}
```

**驗證方式**:
- `yarn lint` 與 `yarn build` 通過，無型別錯誤

---

#### TASK-013: 高併發訊息批次/節流機制

- **說明**: 聊天室活躍時可能短時間收到大量訊息，每條訊息都觸發 handler 和 DOM 更新，造成效能問題
- **修改檔案**:
  - 新增 `utils/websocket/batchNotifier.ts`
  - `utils/websocket/index.ts`（可選整合）
- **前置依賴**: 無
- **風險**: Medium

**實作步驟**:

1. 建立 `utils/websocket/batchNotifier.ts`：

```typescript
// utils/websocket/batchNotifier.ts

interface BatchNotifierOptions {
  /** 批次間隔時間（ms），預設 100ms */
  interval?: number;
  /** 單批次最大訊息數，預設 50 */
  maxBatchSize?: number;
}

/**
 * 將高頻訊息合併為批次處理。
 * 在 interval 時間內收集訊息，統一 flush 給 handler。
 */
export function createBatchNotifier<T>(
  handler: (batch: T[]) => void,
  options: BatchNotifierOptions = {}
) {
  const { interval = 100, maxBatchSize = 50 } = options;
  let buffer: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    timer = null;
    handler(batch);
  };

  const push = (item: T) => {
    buffer.push(item);

    if (buffer.length >= maxBatchSize) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
      return;
    }

    if (!timer) {
      timer = setTimeout(flush, interval);
    }
  };

  const destroy = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    buffer = [];
  };

  return { push, flush, destroy };
}
```

2. 在 `pages/chatroom/index.vue` 的 chatRoomHandler 中使用：

```typescript
// pages/chatroom/index.vue
import { createBatchNotifier } from '@/utils/websocket/batchNotifier';

const batchNotifier = createBatchNotifier<Message>((batch) => {
  updateMessageRecord({ message: batch });
  toggleNewMessageTipsHandler();
}, { interval: 100 });

const chatRoomHandler = (body: { data: { user: Friends; message: Message[]; type: 'chatRoom' } }) => {
  if (routes.query?.uuid !== body.data.user?.uuid) return;
  body.data.message.forEach((msg) => batchNotifier.push(msg));
};

onBeforeUnmount(() => {
  batchNotifier.destroy();
});
```

**驗證方式**:
- 單元測試：100ms 內 push 10 條訊息，handler 只被呼叫 1 次且收到 10 條
- 單元測試：push 超過 maxBatchSize 時立即 flush

---

#### TASK-014: Store API 精簡與靜默失敗修正

- **說明**: `store/notificationWebSocket.ts` 和 `store/stream.ts` 暴露過多 API（如 `notify`、`websocketGlobalMessage`），store 應只暴露必要的公開介面。另外 `handleSend` 在 WebSocket 未連接時靜默失敗
- **修改檔案**:
  - `store/notificationWebSocket.ts`
  - `store/stream.ts`
  - `utils/websocket/index.ts`
- **前置依賴**: TASK-004
- **風險**: Medium — 需確認所有 store 消費者

**實作步驟**:

1. 在 `BaseWebsocket.handleSend` 中加入連線狀態檢查：

```typescript
handleSend<T = string, U = 'global'>(
  data: U extends 'video' ? Blob : { type: 'chatRoom' | 'global' | 'video'; data: T }
) {
  if (!this.isOpen()) {
    console.warn('WebSocket is not open, message not sent');
    return false;
  }

  if (data instanceof Blob) {
    this.websocket?.send?.(data);
  } else {
    this.websocket?.send?.(JSON.stringify(data));
  }
  return true;
}
```

2. 精簡 store 對外 API，移除不應暴露的方法：

```typescript
// store/notificationWebSocket.ts
// 移除對外暴露: notify, websocketGlobalMessage
// 保留: init, handleClose, handleSend, subscribe, unsubscribe
return { init, handleClose, handleSend, subscribe, unsubscribe };
```

3. 檢查 `layouts/default.vue` 第 61 行 `notificationStore.websocketGlobalMessage` 的使用，確認 `globalMessageHandler` 內部邏輯是否可直接內聯或改用其他方式。

**驗證方式**:
- `yarn lint` 無錯誤
- 確認所有使用 `notify` 和 `websocketGlobalMessage` 的地方都已遷移

---

#### TASK-015: 補充單元測試

- **說明**: 為前述修改補充測試覆蓋
- **修改檔案**:
  - 新增 `utils/websocket/__test__/baseWebsocket.spec.ts`
  - 新增 `utils/websocket/__test__/subscribe.spec.ts`
  - 新增 `utils/websocket/__test__/leaderElection.spec.ts`
  - 新增 `utils/websocket/__test__/batchNotifier.spec.ts`
- **前置依賴**: TASK-001 ~ TASK-013
- **風險**: Low

**實作步驟**:

1. `baseWebsocket.spec.ts` 測試項目：
   - UNAUTHORIZATION 訊息不觸發 notify
   - onclose identity check 防止舊實例覆蓋
   - reconnect 使用 tokenGetter
   - reconnect exhausted 觸發 callback
   - JSON parse 錯誤被捕獲

2. `subscribe.spec.ts` 測試項目：
   - subscribe/unsubscribe 正常運作
   - closeChannels 保留 handler
   - removeAll 完全清除
   - 跨頁籤廣播（mock BroadcastChannel）

3. `leaderElection.spec.ts` 測試項目：
   - 取得 lock 後觸發 onBecomeLeader
   - 不支援 navigator.locks 時降級
   - stop 觸發 onLoseLeadership

4. `batchNotifier.spec.ts` 測試項目：
   - 批次合併與定時 flush
   - 超過 maxBatchSize 立即 flush
   - destroy 清理

**驗證方式**:
- `yarn test:ci` 全部通過

---

## Testing Strategy

- **Unit tests**: `utils/websocket/__test__/` 目錄下的所有測試檔案（TASK-015）
- **Integration tests**:
  - 多頁籤 Leader Election 場景（手動測試，開 2-3 個頁籤）
  - 斷網重連流程（手動測試，使用 DevTools Network throttling）
  - Token 過期 → UNAUTHORIZATION → 登出流程

## Risks & Mitigations

- **風險**: Leader Election（TASK-007/008）改變核心連線機制，可能導致部分瀏覽器不支援
  - Mitigation: `navigator.locks` 不支援時降級為每個頁籤獨立連線（現有行為）

- **風險**: TASK-005 分離訂閱生命週期後，重連時 BroadcastChannel 需要重建，可能短暫丟失跨頁籤訊息
  - Mitigation: `ensureChannel` 在 broadcast 時自動重建 channel

- **風險**: TASK-006 修改 layout ChatRoom handler 可能影響非 chatroom 頁面的訊息通知
  - Mitigation: 用 `route.path` 判斷，確保非 chatroom 頁面仍能更新 query cache

- **風險**: TASK-014 精簡 store API 可能遺漏消費者
  - Mitigation: 全域搜尋 `notificationStore.notify`、`notificationStore.websocketGlobalMessage` 確認無遺漏

## Success Criteria

- [ ] UNAUTHORIZATION 訊息不會被廣播到 UI 元件
- [ ] StreamWebsocket JSON.parse 錯誤被正確捕獲，不影響影音串流
- [ ] 快速重連時舊 WebSocket 的 onclose 不會清除新實例
- [ ] `utils/websocket/index.ts` 不再直接 import 任何 store 或 Nuxt composable
- [ ] 斷線重連後所有 handler 仍然有效
- [ ] ChatRoom 訊息不會被重複處理
- [ ] 多頁籤場景只有 leader 建立 WS 連線，follower 透過 BroadcastChannel 收到訊息
- [ ] 重連 3 次失敗後顯示 UI 通知，網路恢復後自動重連
- [ ] 新增至少 15 個單元測試案例
- [ ] `yarn lint` 與 `yarn build` 無錯誤
- [ ] 所有手動測試場景驗證通過

## 影響檔案總覽

| 檔案 | 修改類型 | 涉及 TASK |
|------|----------|-----------|
| `utils/websocket/index.ts` | 修改 | 001, 003, 004, 005, 009, 012, 014 |
| `utils/websocket/subscribe.ts` | 修改 | 005 |
| `utils/websocket/stream.ts` | 修改 | 002 |
| `utils/websocket/types.ts` | 修改 | 010 |
| `utils/websocket/leaderElection.ts` | 新增 | 007 |
| `utils/websocket/batchNotifier.ts` | 新增 | 013 |
| `store/notificationWebSocket.ts` | 修改 | 004, 008, 009, 014 |
| `store/stream.ts` | 修改 | 004, 014 |
| `composables/useWsChannel.ts` | 修改 | 010 |
| `layouts/default.vue` | 修改 | 006 |
| `pages/live/[uuid].vue` | 修改 | 011 |
| `pages/chatroom/index.vue` | 修改 | 013 |
| `utils/websocket/__test__/*.spec.ts` | 新增 | 015 |

## 進度追蹤

- [ ] **Phase 1**: 關鍵修復
  - [x] TASK-001: UNAUTHORIZATION 訊息順序修正
  - [x] TASK-002: StreamWebsocket JSON.parse 錯誤處理
  - [x] TASK-003: 重連 race condition 修復
- [ ] **Phase 2**: 架構解耦
  - [ ] TASK-004: BaseWebsocket 依賴注入重構
  - [ ] TASK-005: 訂閱生命週期分離
  - [ ] TASK-006: ChatRoom handler 去重
- [ ] **Phase 3**: 多頁籤優化
  - [ ] TASK-007: Leader Election 機制
  - [ ] TASK-008: 整合 Leader Election 到 store
  - [ ] TASK-009: 重連恢復機制與 UI 通知
- [ ] **Phase 4**: 持續改進
  - [ ] TASK-010: WsPayload 型別強化
  - [ ] TASK-011: live/[uuid].vue 改用 useWsChannel
  - [ ] TASK-012: Timer 型別修正
  - [ ] TASK-013: 高併發訊息批次機制
  - [ ] TASK-014: Store API 精簡
  - [ ] TASK-015: 補充單元測試
