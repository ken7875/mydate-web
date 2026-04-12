# Implementation Plan: 聊天室圖片上傳功能

## Overview

在聊天室內新增圖片上傳功能，支援檔案選擇、預覽確認、分片上傳（>2MB）、上傳進度條、斷線續傳（sub-chunk 級別）、圖片訊息顯示（含過期狀態）、以及全屏預覽。整體架構遵循現有專案慣例：API 與型別統一歸入現有的 `chat` 模組、業務邏輯封裝為 composable、UI 元件放 `components/`。

## Requirements

- 用戶在聊天室選擇圖片後，彈出確認視窗預覽並確認上傳
- 檔案限制：20MB 上限、僅接受 webp/jpg/jpeg/png
- 檔案 > 2MB 時拆分為 chunks，循序上傳（API 要求依序傳送）
- SHA-256 checksum 驗證（僅整檔，無需分片 checksum）
- 上傳進度條 UI
- 斷線續傳：localStorage 記錄 uploadId，重連後透過 Status API 查詢 `receivedChunkIndices` 與 `chunkProgress`，支援 sub-chunk 級別續傳
- 取消上傳（使用者主動取消 + 元件 unmount 時清理），需處理 409 Conflict（已完成的上傳不可取消）
- 後端合併完成後透過 WebSocket `imageMessage` 事件推播，前端接收並顯示
- 圖片過期狀態提示（24 小時有效期）
- 圖片 lightbox 全屏預覽

## Architecture Changes

- **修改** `api/types/chat.ts` — 新增上傳相關型別定義、Message 型別擴充圖片欄位
- **修改** `api/modules/chat.ts` — 新增上傳相關 API 函式
- **新增** `composables/useChunkUpload.ts` — 分片上傳核心邏輯 composable
- **新增** `utils/crypto.ts` — SHA-256 計算工具函式
- **新增** `components/upload/ImagePreviewModal.vue` — 圖片預覽確認彈窗
- **新增** `components/upload/UploadProgressBar.vue` — 上傳進度條元件
- **新增** `components/chatroom/ImageMessage.vue` — 聊天室圖片訊息泡泡
- **新增** `components/lightbox/index.vue` — 圖片全屏預覽元件
- **修改** `enums/websocket.ts` — 新增 `ImageMessage` channel
- **修改** `pages/chatroom/index.vue` — 整合圖片選擇、上傳、顯示
- **修改** `layouts/default.vue` — 訂閱 `ImageMessage` WebSocket 事件

## Implementation Steps

### Phase 1: 型別定義與 API 層（基礎設施）

#### TASK-001: 新增上傳相關型別定義與擴充 Message 型別

- **檔案**: `api/types/chat.ts`（修改）
- **Action**: 在現有檔案中新增上傳 API 的 request/response 型別，並擴充 Message interface
- **詳細步驟**:
  1. 新增上傳相關型別：
     - `InitUploadRequest`：`{ fileName: string; fileSize: number; mimeType: string; checksum: string; totalChunks: number; receiverId: string; roomId: number }`
     - `InitUploadResponse`：`{ uploadId: string; totalChunks: number; expiresAt: string }`
     - `ChunkUploadResponse`（聯合型別，依 HTTP status 區分）：
       - 206（分片部分接收）：`{ uploadId: string; chunkIndex: number; chunkBytesReceived: number; chunkTotal: number; receivedChunks: number; totalChunks: number }`
       - 206（分片完整接收）：`{ uploadId: string; chunkIndex: number; receivedChunks: number; totalChunks: number }`
       - 200（全部完成）：`{ uploadId: string; receivedChunks: number; totalChunks: number }`
     - `UploadStatusResponse`：`{ status: 'uploading' | 'completed'; fileSize: number; totalChunks: number; receivedChunks: number; receivedChunkIndices: number[]; chunkProgress: Record<string, number>; expiresAt: string }`
     - `ImageMessagePayload`：`{ messageId: string; roomId: number; senderId: string; imageId: string; thumbnailUrl: string; blurHash: string; width: number; height: number; timestamp: string }`
  2. 新增 `MessageType` 型別：`'text' | 'image'`
  3. 在現有 `Message` interface 中新增可選欄位：
     - `type?: MessageType`（預設為 `'text'`，向後相容）
     - `imageId?: string`
     - `thumbnailUrl?: string`
     - `originalUrl?: string`
     - `blurHash?: string`
     - `imageWidth?: number`
     - `imageHeight?: number`
     - `isExpired?: boolean` — 圖片是否已過期
- **Why**: 統一型別確保 API 呼叫與 WebSocket 事件的型別安全，所有新欄位為 optional 確保向後相容
- **Dependencies**: 無
- **Risk**: Low — 只新增 optional 欄位，不影響現有功能
- **驗收標準**: 所有型別定義完整，現有引用 Message 的程式碼無 TypeScript 編譯錯誤

#### TASK-002: 新增上傳 API 函式

- **檔案**: `api/modules/chat.ts`（修改）
- **Action**: 在現有檔案中新增 4 個上傳相關 API 函式
- **詳細步驟**:
  1. `initUploadApi(body: InitUploadRequest)` — POST `/uploads/init`，使用 `useHttp.post<InitUploadResponse>`，`needLoading: false`。body 包含 `fileName`、`fileSize`、`mimeType`、`checksum`、`totalChunks`、`receiverId`、`roomId`
  2. `uploadChunkApi(uploadId: string, chunkIndex: number, chunk: Blob, globalStart: number, globalEnd: number, fileSize: number)` — 此 API 需要發送 raw binary 與 `Content-Range` header，`useHttp` 目前不支援 `application/octet-stream` 與自訂 header 的組合。建議方案：在此函式內使用原生 `$fetch` 封裝，手動從 `useCookie('access_token')` 取得 token 注入 Authorization header，設定 `Content-Type: application/octet-stream` 與 **`Content-Range: bytes ${globalStart}-${globalEnd}/${fileSize}`** header（必填）。PUT `/uploads/${uploadId}/chunks/${chunkIndex}`
  3. `getUploadStatusApi(uploadId: string)` — GET `/uploads/${uploadId}/status`，使用 `useHttp.get<UploadStatusResponse>`，`needLoading: false`
  4. `cancelUploadApi(uploadId: string)` — DELETE `/uploads/${uploadId}`，使用 `useHttp.delete`，`gateway: 'normal'`，`needLoading: false`。需處理 `409 Conflict`（`UPLOAD_ALREADY_COMPLETED`）：已完成的上傳不可取消，呼叫端應捕獲此錯誤並清除本地記錄
  5. 所有 API 的 `needLoading` 設為 `false`（上傳有自己的進度條，不需要全域 loading）
- **Why**: 遵循專案慣例將聊天相關 API 集中在 `chat.ts`
- **Dependencies**: TASK-001
- **Risk**: Medium — `uploadChunkApi` 無法直接使用 `useHttp`，需要特殊處理 binary body 與 `Content-Range` header
- **驗收標準**: 每個 API 函式可正確呼叫對應端點，TypeScript 型別正確，import 路徑無誤

#### TASK-003: 新增 WebSocket channel 列舉

- **檔案**: `enums/websocket.ts`（修改）
- **Action**: 在 `WsChannel` enum 中新增 `ImageMessage`
- **詳細步驟**:
  1. 新增 `ImageMessage = 'imageMessage'`
- **Why**: WebSocket 訊息透過 BroadcastChannel 廣播，需要在 enum 中註冊 channel 名稱，名稱必須與後端事件 `type` 欄位完全一致
- **Dependencies**: 無
- **Risk**: Low
- **驗收標準**: 新增的 enum 值可在 `useWsChannel` 中使用

---

### Phase 2: 核心上傳邏輯（Composable 層）

#### TASK-004: SHA-256 計算工具函式

- **檔案**: `utils/crypto.ts`（新增）
- **Action**: 封裝 Web Crypto API 的 SHA-256 計算
- **詳細步驟**:
  1. `computeSHA256(data: ArrayBuffer): Promise<string>` — 使用 `crypto.subtle.digest('SHA-256', data)` 計算，將結果 `ArrayBuffer` 轉換為 hex 字串（逐 byte 轉 `toString(16).padStart(2, '0')` 後 join）
  2. `computeFileSHA256(file: File): Promise<string>` — 呼叫 `file.arrayBuffer()` 取得 ArrayBuffer 後呼叫 `computeSHA256`（20MB 內可一次讀取，記憶體可接受）
- **Why**: API 規格要求整檔 SHA-256 checksum（init API 的 `checksum` 欄位）
- **Dependencies**: 無
- **Risk**: Low — Web Crypto API 在所有現代瀏覽器皆支援
- **驗收標準**: 對已知輸入產生正確的 SHA-256 hex 字串，可撰寫 unit test 驗證

#### TASK-005: 分片上傳 Composable

- **檔案**: `composables/useChunkUpload.ts`（新增）
- **Action**: 封裝完整的分片上傳生命週期
- **詳細步驟**:
  1. 定義常數與 `Options` interface：
     ```typescript
     const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB，前端自行定義

     interface Options {
       onProgress?: (progress: number) => void;
       onError?: (error: Error) => void;
     }
     ```
  2. `useChunkUpload(options?: Options)` 回傳：
     - `progress: Ref<number>` — 0~100 進度百分比
     - `isUploading: Ref<boolean>`
     - `uploadId: Ref<string | null>`
     - `phase: Ref<'idle' | 'hashing' | 'uploading' | 'done' | 'error' | 'cancelled'>`
     - `startUpload(file: File, receiverId: string, roomId: number): Promise<void>`
     - `cancelUpload(): Promise<void>`
     - `resumeUpload(savedUploadId: string, file: File): Promise<void>`
  3. `startUpload` 流程：
     a. 驗證檔案大小（<= 20MB）與格式（webp/jpg/jpeg/png），驗證失敗直接 throw Error
     b. 設定 `phase = 'hashing'`，呼叫 `computeFileSHA256` 計算整檔 SHA-256
     c. 計算 `totalChunks = Math.ceil(fileSize / CHUNK_SIZE)`
     d. 呼叫 `initUploadApi` 傳入 `{ fileName, fileSize, mimeType, checksum, totalChunks, receiverId, roomId }`，取得 `uploadId`、`totalChunks`、`expiresAt`
     e. 將上傳狀態存入 `localStorage`：key 為 `upload_progress_${uploadId}`，value 為 JSON 序列化的 `UploadRecord`（見 TASK-012）
     f. 設定 `phase = 'uploading'`，**循序上傳**所有 chunks（不並行，API 要求依序傳送）：
        - 依序從 chunkIndex 0 到 totalChunks - 1
        - 每個 chunk：`file.slice(chunkIndex * CHUNK_SIZE, Math.min((chunkIndex + 1) * CHUNK_SIZE, fileSize))` 取出 Blob
        - 計算 `globalStart = chunkIndex * CHUNK_SIZE`
        - 計算 `globalEnd = Math.min(globalStart + chunk.size, fileSize) - 1`
        - 呼叫 `uploadChunkApi(uploadId, chunkIndex, chunk, globalStart, globalEnd, fileSize)`，傳入 AbortController 的 signal
        - 成功後更新 `progress`：`Math.round((chunkIndex + 1) / totalChunks * 100)`
        - 單一 chunk 失敗時重試最多 2 次（因 API 冪等），重試仍失敗則標記為 failed
        - 處理 `416 Range Not Satisfiable`：取回 response 中的 `expectedStart`，從 `expectedStart` 位置重新切片該 chunk 繼續傳送
     g. 若有任何 chunk 最終失敗，設定 `phase = 'error'`，保留 localStorage 記錄供續傳
     h. 所有 chunks 成功後（最後一個 chunk 回傳 200 OK），後端自動合併，設定 `phase = 'done'`，清除 `localStorage` 中的上傳記錄
     i. 函式回傳 void，上傳結果透過 WebSocket `imageMessage` 事件通知
  4. `cancelUpload` 流程：
     a. 設定 `phase = 'cancelled'`
     b. 呼叫 `AbortController.abort()` 中止進行中的 chunk 上傳請求
     c. 呼叫 `cancelUploadApi(uploadId)`，捕獲 409 Conflict（已完成則忽略）
     d. 清除 `localStorage` 中的上傳記錄
     e. 重置所有 ref 狀態（`progress = 0`、`isUploading = false`、`uploadId = null`）
  5. `resumeUpload` 流程（斷線續傳，sub-chunk 級別）：
     a. 從 `localStorage` 讀取上傳記錄
     b. 呼叫 `getUploadStatusApi(savedUploadId)` 取得 `receivedChunkIndices` 和 `chunkProgress`
     c. 循序遍歷 chunkIndex 0 到 totalChunks - 1：
        - 若 `receivedChunkIndices.includes(chunkIndex)` → 跳過（已完整接收）
        - 否則取 `subChunkOffset = chunkProgress[String(chunkIndex)] ?? 0`
        - 從 `file.slice(chunkIndex * CHUNK_SIZE + subChunkOffset, Math.min((chunkIndex + 1) * CHUNK_SIZE, fileSize))` 取出剩餘 Blob
        - 計算 `globalStart = chunkIndex * CHUNK_SIZE + subChunkOffset`
        - 計算 `globalEnd = Math.min((chunkIndex + 1) * CHUNK_SIZE, fileSize) - 1`
        - 呼叫 `uploadChunkApi(uploadId, chunkIndex, chunk, globalStart, globalEnd, fileSize)`
        - 處理 `416 Range Not Satisfiable`：使用 response 中的 `expectedStart` 修正起始位置，重新切片繼續傳送
     d. 完成後設定 `phase = 'done'`，清除 localStorage
  6. AbortController 管理：每次 `startUpload` / `resumeUpload` 建立新的 `AbortController`，所有 `uploadChunkApi` 呼叫共享同一個 signal
  7. 元件 unmount 時的清理：使用 `onBeforeUnmount` hook，若 `isUploading` 為 true，僅中止請求（abort）但保留 localStorage 記錄，以便下次進入頁面時續傳
  8. 錯誤處理：區分網路錯誤（可重試）與業務錯誤（如 uploadId 過期），業務錯誤直接清除記錄
- **Why**: 將複雜的上傳邏輯封裝為 composable，符合專案 `composables/` 慣例與 `composable.md` 規範，讓頁面元件保持簡潔
- **Dependencies**: TASK-001, TASK-002, TASK-004
- **Risk**: High — 循序上傳、sub-chunk 續傳、416 錯誤處理邏輯較複雜，需要仔細處理 AbortController 生命週期
- **驗收標準**:
  - 小檔案（<= 2MB）可成功單一 chunk 上傳
  - 大檔案（> 2MB）以循序方式完成分片上傳
  - `progress` ref 正確反映上傳進度（0→100 遞增）
  - 取消上傳後正確呼叫 DELETE API 並清理狀態（409 Conflict 時不報錯）
  - localStorage 正確記錄/清除上傳進度
  - 上傳完成後回傳 void，等待 WebSocket `imageMessage` 事件通知結果

---

### Phase 3: UI 元件層

#### TASK-006: 圖片預覽確認彈窗

- **檔案**: `components/upload/ImagePreviewModal.vue`（新增）
- **Action**: 用戶選擇圖片後彈出確認視窗，預覽圖片並提供確認/取消按鈕
- **詳細步驟**:
  1. Props 定義：
     - `file: File | null` — 選中的檔案
     - `visible: boolean` — 控制顯示/隱藏
  2. Emits：`confirm`、`cancel`
  3. 使用 `URL.createObjectURL(file)` 產生預覽 URL，用 `computed` 或 `watchEffect` 管理，在 file 變更或元件銷毀時呼叫 `URL.revokeObjectURL` 釋放記憶體
  4. 顯示內容：圖片預覽（限制最大高度避免超出螢幕）、檔案名稱、檔案大小（格式化為 KB/MB）
  5. 驗證邏輯：若超過 20MB 或格式不符，顯示紅色錯誤提示文字並禁用確認按鈕
  6. UI 結構參考現有 `components/message/index.vue` 的 overlay + Card 模式：
     - 外層 `.overlay` 遮罩
     - 內層使用 `Card` 元件，高度根據圖片自適應（移除固定 `h-[200px]`）
  7. 確認按鈕點擊 emit `confirm` 事件
  8. 取消按鈕 / 點擊 overlay 外部 emit `cancel` 事件
- **Why**: 需求要求選擇圖片後先預覽確認再上傳
- **Dependencies**: 無
- **Risk**: Low
- **驗收標準**: 可正確預覽圖片、顯示檔案資訊、確認/取消操作正常、超限檔案顯示錯誤

#### TASK-007: 上傳進度條元件

- **檔案**: `components/upload/UploadProgressBar.vue`（新增）
- **Action**: 顯示上傳進度百分比的進度條
- **詳細步驟**:
  1. Props：
     - `progress: number` — 0~100
     - `phase: string` — 當前上傳階段
     - `visible: boolean`
  2. Emits：`cancel`
  3. 使用 TailwindCSS 實作進度條：
     - 外層：`w-full bg-gray-200 rounded-full h-2.5`（灰底圓角）
     - 內層：`bg-primary h-2.5 rounded-full transition-all duration-300`，`style` 動態綁定 `width: ${progress}%`
  4. 進度條上方顯示階段文字：
     - `hashing` → "計算檔案校驗碼..."
     - `uploading` → "上傳中 {progress}%"
  5. 右側或下方顯示取消按鈕（X 圖示），點擊 emit `cancel`
  6. `v-show="visible"` 控制顯示
- **Why**: 需求明確要求顯示上傳進度條
- **Dependencies**: 無
- **Risk**: Low
- **驗收標準**: 進度條隨 progress prop 平滑更新，不同 phase 顯示對應文字，取消按鈕可觸發事件

#### TASK-008: 圖片訊息泡泡元件

- **檔案**: `components/chatroom/ImageMessage.vue`（新增）
- **Action**: 在聊天室中顯示圖片訊息，支援縮圖、BlurHash placeholder、過期狀態
- **詳細步驟**:
  1. Props：
     - `message: Message` — 包含圖片相關欄位的訊息物件
     - `isSelf: boolean` — 是否為自己發送
  2. Emits：`preview` — 攜帶 `originalUrl`，由父層開啟 lightbox
  3. 顯示邏輯：
     a. 若 `message.isExpired === true`：顯示「圖片已過期」提示文字 + 過期圖示（使用 font-awesome 的 `clock` 或 `image` 圖示），灰色背景區塊，不顯示圖片
     b. 若未過期：使用 `NuxtImg` 或 `<img>` 載入 `thumbnailUrl`
     c. 圖片載入前：使用 CSS `background-color` 加上 `filter: blur()` 作為簡易 placeholder（避免額外引入 blurhash 套件增加 bundle）。備選方案：若團隊決定使用 `blurhash` 套件，則用 canvas 解碼 blurHash 產生 base64 圖片作為 placeholder
     d. 圖片設定 `width` / `height` attribute 避免 CLS（layout shift），使用 `aspect-ratio` CSS 保持比例
  4. 點擊圖片（非過期狀態）emit `preview` 事件
  5. 圖片 URL 組成規則：
     - 原圖：`/images/messageImage/${imageId}/original.webp`
     - 縮圖：`/images/messageImage/${imageId}/thumb.webp`
  6. 樣式：
     - 外層容器最大寬度 70%（與文字訊息泡泡的 `w-[70%]` 一致）
     - 圓角 `rounded-lg`、陰影 `shadow`
     - 自己發送靠右、對方靠左（同現有文字泡泡邏輯）
     - 圖片 `rounded-lg overflow-hidden` 裁切圓角
  7. 圖片載入失敗（`@error` 事件）時顯示 fallback 圖示與「圖片載入失敗」文字
  8. 底部顯示發送時間（同文字訊息格式 `HH:mm`）
- **Why**: 圖片訊息需要獨立元件處理縮圖、過期、載入狀態等邏輯，避免在 chatroom 頁面 slot 中塞入過多判斷
- **Dependencies**: TASK-001（Message 型別擴充）
- **Risk**: Medium — BlurHash placeholder 的實作方案需要決定（CSS blur vs blurhash 套件）
- **驗收標準**: 圖片正確顯示、過期狀態有明確提示、載入中有 placeholder、載入失敗有 fallback

#### TASK-009: 圖片 Lightbox 全屏預覽元件

- **檔案**: `components/lightbox/index.vue`（新增）
- **Action**: 全屏預覽圖片，支援手機端手勢縮放
- **詳細步驟**:
  1. Props：
     - `src: string` — 圖片原始 URL
     - `visible: boolean`
  2. Emits：`close`
  3. UI 結構：
     - 外層 fixed overlay，`inset-0`，背景 `bg-black/90`
     - z-index 使用 tailwind.config 中的 `modal` 層級（`z-modal` = 901）
     - 內層圖片 `object-contain w-full h-full`，保持原始比例置中
     - 右上角 X 關閉按鈕（`position: absolute`）
     - 點擊背景區域也可關閉（`@click.self`）
  4. 手機端：設定 `touch-action: pinch-zoom` 支援原生雙指縮放
  5. 圖片載入中：在圖片區域中央顯示 loading spinner（複用 `components/loading/index.vue` 的 CSS spinner 樣式）
  6. 使用 `<Teleport to="body">` 確保 overlay 不受父層 overflow 影響
  7. 開啟時 `document.body.style.overflow = 'hidden'` 防止背景捲動，關閉時恢復
- **Why**: 需求要求圖片可全屏預覽
- **Dependencies**: 無
- **Risk**: Low
- **驗收標準**: 圖片全屏居中顯示、可關閉、手機端可雙指縮放、背景不可捲動

---

### Phase 4: 頁面整合

#### TASK-010: 聊天室頁面整合圖片上傳

- **檔案**: `pages/chatroom/index.vue`（修改）
- **Action**: 在聊天室輸入區新增圖片選擇入口，串接上傳流程與圖片訊息顯示
- **詳細步驟**:
  1. **輸入區改造**（template 部分）：
     - 在輸入框左側新增圖片按鈕：`<font-awesome-icon :icon="['fas', 'image']">`
     - 按鈕點擊觸發隱藏的 `<input ref="fileInputRef" type="file" accept="image/webp,image/jpeg,image/png" class="hidden">`
     - `@change` 事件取得 `event.target.files[0]` 存入 `selectedFile` ref
  2. **預覽確認流程**：
     - 引入 `ImagePreviewModal` 元件
     - `selectedFile` 有值時 `showPreviewModal = true`
     - `@confirm`：呼叫 `handleUpload()`
     - `@cancel`：`selectedFile = null`、`showPreviewModal = false`、重置 file input
  3. **上傳流程**：
     - 引入 `useChunkUpload` composable，取得 `{ progress, phase, isUploading, startUpload, cancelUpload }`
     - `handleUpload` 內呼叫 `startUpload(selectedFile.value, receiverId, roomId)`
     - 顯示 `UploadProgressBar`：`visible="isUploading"`，綁定 `progress`、`phase`
     - `UploadProgressBar` 的 `@cancel` 呼叫 `cancelUpload()`
     - 上傳完成（`phase === 'done'`）後關閉進度條、重置狀態，等待 WebSocket `imageMessage` 事件推播圖片訊息到聊天列表
  4. **訊息列表圖片渲染**（VirtualList slot 內）：
     - 在現有的訊息泡泡渲染處，根據 `item.type` 判斷：
       - `item.type === 'image'` 或 `item.imageId`：渲染 `ImageMessage` 元件
       - 否則：渲染現有文字泡泡
     - `ImageMessage` 的 `@preview` 事件：設定 `lightboxSrc = originalUrl`、`lightboxVisible = true`
  5. **Lightbox 整合**：
     - 在 template 底部引入 `Lightbox` 元件
     - 綁定 `src="lightboxSrc"`、`visible="lightboxVisible"`
     - `@close`：`lightboxVisible = false`
  6. **新增的 ref 狀態**：
     - `selectedFile: Ref<File | null>`
     - `showPreviewModal: Ref<boolean>`
     - `lightboxSrc: Ref<string>`
     - `lightboxVisible: Ref<boolean>`
  7. **頁面離開處理**：在現有 `onBeforeRouteLeave` 中新增邏輯——若 `isUploading` 為 true，保留 localStorage 記錄（composable 的 `onBeforeUnmount` 已處理 abort）
- **Why**: 聊天室是圖片上傳的主要使用場景
- **Dependencies**: TASK-005, TASK-006, TASK-007, TASK-008, TASK-009
- **Risk**: High — 需要修改現有頁面，整合多個新元件，需確保不破壞現有文字訊息功能與 VirtualList 渲染
- **驗收標準**:
  - 可選擇圖片並預覽確認
  - 上傳過程顯示進度條
  - 上傳完成後等待 WebSocket `imageMessage` 事件，圖片訊息出現在聊天列表
  - 可取消上傳
  - 點擊圖片可開啟 lightbox 全屏預覽
  - 文字訊息功能完全不受影響

#### TASK-011: WebSocket 事件訂閱與處理

- **檔案**: `pages/chatroom/index.vue`（修改）、`layouts/default.vue`（修改）
- **Action**: 訂閱 `imageMessage` WebSocket 事件，將圖片訊息插入聊天記錄
- **詳細步驟**:
  1. **`pages/chatroom/index.vue`**：
     - 在現有 `useWsChannel` 陣列中新增 `WsChannel.ImageMessage` 訂閱項目
     - handler 邏輯：
       a. 解構 `payload.data` 為 `ImageMessagePayload`
       b. 判斷 `roomId`（number 型別）是否為當前聊天室
       c. 若是，將 payload 轉換為 Message 格式：`{ type: 'image', senderId, imageId, thumbnailUrl, blurHash, imageWidth: width, imageHeight: height, sendTime: timestamp, roomId, message: '[圖片]' }`
       d. 圖片 URL 組成：`thumbnailUrl` 直接使用 payload 中的值，`originalUrl` 為 `/images/messageImage/${imageId}/original.webp`
       e. 呼叫 `updateMessageRecord({ message: [imageMessage] })` 插入訊息列表
       f. 觸發 `toggleNewMessageTipsHandler()` 提示新訊息
  2. **`layouts/default.vue`**：
     - 在現有 `useWsChannel` 陣列中新增 `WsChannel.ImageMessage` 訂閱項目
     - handler 邏輯（當不在 chatroom 頁面時）：
       a. `if (route.path === '/chatroom') return;`（由 chatroom 自己處理）
       b. 解構 payload，取得 roomId（number 型別）和訊息內容
       c. 呼叫 `updateMessageQuery` 更新對應 roomId 的訊息快取
       d. 呼叫 `chatStore.incrementTotalUnreadCount()` 增加未讀計數
       e. 呼叫 `chatStore.incrementUnReadCount(roomId)` 增加該房間未讀計數
- **Why**: 圖片上傳完成後，後端自動合併並透過 WebSocket 廣播 `imageMessage` 給聊天室所有成員，前端需接收並即時顯示
- **Dependencies**: TASK-003, TASK-010
- **Risk**: Medium — 需要確保 WebSocket 事件的 data 結構與 Message 型別正確對應，以及 handler 在不同頁面狀態下的行為正確
- **驗收標準**:
  - 對方上傳圖片後，自己的聊天室即時顯示圖片訊息
  - 不在聊天室時收到圖片訊息，未讀計數正確增加
  - 預覽訊息列表顯示 `[圖片]` 文字

---

### Phase 5: 斷線續傳與邊界處理

#### TASK-012: 斷線續傳機制完善

- **檔案**: `composables/useChunkUpload.ts`（修改）、`pages/chatroom/index.vue`（修改）
- **Action**: 完善斷線續傳的 UX 流程與邊界處理
- **詳細步驟**:
  1. localStorage 資料結構定義（在 `api/types/chat.ts` 中新增）：
     ```typescript
     interface UploadRecord {
       uploadId: string;
       roomId: number;
       receiverId: string;
       fileName: string;
       fileSize: number;
       fileChecksum: string; // 整檔 SHA-256，用於續傳時驗證檔案一致性
       totalChunks: number;
       createdAt: number; // timestamp
     }
     ```
     localStorage key 格式：`upload_progress_${uploadId}`
     注意：不再儲存 `completedChunks`，每次續傳時透過 `getUploadStatusApi` 查詢 `receivedChunkIndices` 取得最新狀態
  2. 在 `useChunkUpload` 中新增輔助方法：
     - `getPendingUploads(roomId: number): UploadRecord[]` — 掃描 localStorage 中所有 `upload_progress_*` key，篩選匹配 roomId 且未過期（< 24 小時）的記錄
     - `cleanExpiredUploads()` — 清除 `createdAt` 超過 24 小時的記錄（配合後端圖片 1 天過期）
  3. 在聊天室頁面 `onMounted` 中新增：
     a. 呼叫 `cleanExpiredUploads()` 清除過期記錄
     b. 呼叫 `getPendingUploads(roomId)` 檢查是否有未完成上傳
     c. 若有，使用現有 `Message` 元件彈出確認視窗：「偵測到有未完成的圖片上傳（{fileName}），是否繼續？」
     d. 用戶選擇「繼續」：
        - 顯示 file input 請用戶重新選擇檔案（File 物件無法序列化到 localStorage）
        - 選擇後計算 SHA-256，與 `UploadRecord.fileChecksum` 比對
        - 一致 → 呼叫 `resumeUpload(savedUploadId, file)`
        - 不一致 → 提示「檔案不一致，請選擇原始檔案」
     e. 用戶選擇「取消」 → 呼叫 `cancelUpload()`，清除 localStorage 記錄
  4. 斷線續傳核心流程（在 composable 內）：
     a. 呼叫 `getUploadStatusApi(uploadId)` 取得 `receivedChunkIndices` 和 `chunkProgress`
     b. 循序遍歷所有 chunkIndex：
        - 若 `receivedChunkIndices.includes(chunkIndex)` → 跳過（已完整接收）
        - 否則取 `subChunkOffset = chunkProgress[String(chunkIndex)] ?? 0` 作為已接收 bytes
        - 從 `file.slice(chunkIndex * CHUNK_SIZE + subChunkOffset, ...)` 取出剩餘部分
        - 計算 `globalStart = chunkIndex * CHUNK_SIZE + subChunkOffset`
        - 呼叫 `uploadChunkApi` 帶 `Content-Range: bytes globalStart-globalEnd/fileSize`
        - 處理 `416 Range Not Satisfiable`：取回 `expectedStart`，修正 `subChunkOffset = expectedStart - chunkIndex * CHUNK_SIZE`，重新切片繼續傳送
  5. 監聽網路狀態（在 composable 內）：
     - `window.addEventListener('offline', ...)` — 暫停上傳，呼叫 `AbortController.abort()`，保留 localStorage 記錄
     - `window.addEventListener('online', ...)` — 若之前因斷線暫停，自動嘗試 `resumeUpload`
     - 在 `onBeforeUnmount` 中移除這兩個 event listener
  6. 錯誤邊界：
     - `getUploadStatusApi` 回傳 404（uploadId 已過期）→ 清除 localStorage，提示用戶重新上傳
     - `getUploadStatusApi` 回傳 `status: 'completed'` → 清除 localStorage，不需額外處理（圖片訊息已透過 WebSocket 送達）
- **Why**: 需求明確要求斷線續傳，需要完整的 UX 流程處理各種邊界情境
- **Dependencies**: TASK-005
- **Risk**: High — File 物件無法持久化，續傳需要用戶重新選擇檔案並驗證一致性；sub-chunk 續傳的 Content-Range 計算與 416 錯誤處理需謹慎
- **驗收標準**:
  - 上傳中斷網後重新連線，可自動從中斷處繼續上傳（sub-chunk 級別）
  - 重新進入聊天室可偵測到未完成上傳並提示續傳
  - 選擇不同檔案時會提示不一致
  - 過期記錄（> 24h）自動清除
  - 416 Range Not Satisfiable 錯誤正確處理

---

## Testing Strategy

### Unit Tests

- **`utils/__test__/crypto.spec.ts`**:
  - 測試 `computeSHA256` 對空 ArrayBuffer 產生正確 hash
  - 測試對已知字串（轉 ArrayBuffer）產生預期的 SHA-256 hex
  - 測試 `computeFileSHA256` 對 mock File 物件產生正確 hash

- **`composables/__test__/useChunkUpload.spec.ts`**:
  - 測試檔案驗證：超過 20MB 時 throw Error
  - 測試檔案驗證：不支援的格式（如 gif）時 throw Error
  - 測試 chunk 切割邏輯：驗證切割數量與大小（CHUNK_SIZE = 2MB）
  - 測試進度計算：已上傳 chunk 數增加時 progress 正確更新
  - Mock API 測試完整上傳流程（init → 循序 chunks → 等待 WebSocket）
  - 測試取消上傳：AbortController 被 abort、DELETE API 被呼叫、localStorage 被清除
  - 測試取消已完成上傳：409 Conflict 被正確捕獲
  - 測試 localStorage 讀寫：記錄正確儲存與讀取
  - 測試 sub-chunk 續傳：使用 `receivedChunkIndices` 和 `chunkProgress` 計算正確的起始位置
  - 測試 416 Range Not Satisfiable 處理：使用 `expectedStart` 修正起始位置

- **`components/upload/__test__/ImagePreviewModal.spec.ts`**:
  - 測試 `visible=true` 時渲染、`visible=false` 時不渲染
  - 測試確認/取消按鈕 emit 正確事件
  - 測試超限檔案顯示錯誤提示

- **`components/upload/__test__/UploadProgressBar.spec.ts`**:
  - 測試不同 progress 值時進度條寬度
  - 測試不同 phase 顯示對應文字
  - 測試取消按鈕 emit 事件

- **`components/chatroom/__test__/ImageMessage.spec.ts`**:
  - 測試正常圖片：顯示 thumbnailUrl
  - 測試過期圖片：顯示過期提示，不渲染 img
  - 測試圖片載入失敗：顯示 fallback
  - 測試點擊圖片 emit preview 事件

### Integration Tests

- 完整上傳流程：選擇檔案 → 預覽 → 確認 → 進度條 → 完成 → WebSocket `imageMessage` 接收（Mock API）
- 取消上傳流程：上傳中 → 點取消 → API 呼叫 DELETE → 狀態重置
- WebSocket `imageMessage` 接收 → 聊天列表新增圖片訊息
- 斷線續傳流程：Status API 查詢 → 跳過已完成分片 → sub-chunk 續傳

## Risks & Mitigations

- **風險**: `useHttp` 不支援 binary body 與自訂 header 的組合
  - **Mitigation**: `uploadChunkApi` 內使用原生 `$fetch` 封裝，手動注入 token 與 `Content-Range` header，不修改全域 `useHttp` 以避免影響其他模組

- **風險**: 大檔案 SHA-256 計算阻塞主執行緒
  - **Mitigation**: 20MB 內的 SHA-256 計算在 Web Crypto API 下通常 < 100ms，可接受。若未來需支援更大檔案，可改用 Web Worker

- **風險**: File 物件無法序列化，斷線續傳需重新選擇檔案
  - **Mitigation**: 續傳時引導用戶重新選擇檔案，並透過 SHA-256 比對確認是同一個檔案，不一致時提示用戶

- **風險**: BlurHash 套件增加 bundle 大小
  - **Mitigation**: 優先使用 CSS `filter: blur()` + 主色調背景作為簡易 placeholder，不引入額外套件。若 UX 要求精確 BlurHash 效果再評估引入

- **風險**: 修改 chatroom 頁面可能破壞現有文字訊息功能
  - **Mitigation**: 圖片訊息判斷使用 `item.type === 'image'` 條件渲染，text 路徑完全不變；所有新增 Message 欄位為 optional

- **風險**: 416 Range Not Satisfiable 錯誤導致上傳卡住
  - **Mitigation**: 捕獲 416 錯誤，從 response body 的 `expectedStart` 重新計算切片位置，重試上傳

- **風險**: Cancel API 對已完成上傳回傳 409 Conflict
  - **Mitigation**: `cancelUploadApi` 呼叫端捕獲 409 錯誤，視為「已完成」正常處理，清除本地記錄即可

## Success Criteria

- [ ] 用戶可在聊天室選擇 webp/jpg/jpeg/png 圖片（<= 20MB）
- [ ] 選擇圖片後彈出預覽確認視窗
- [ ] 確認後開始上傳，顯示進度條
- [ ] 檔案 > 2MB 時自動分片，循序上傳
- [ ] SHA-256 checksum 正確計算（僅整檔）
- [ ] 上傳過程可取消，正確呼叫 DELETE API（處理 409 Conflict）
- [ ] 上傳完成後透過 WebSocket `imageMessage` 事件接收圖片訊息並顯示在聊天列表
- [ ] 對方即時收到圖片訊息（透過 WebSocket `imageMessage`）
- [ ] 點擊圖片可全屏預覽
- [ ] 過期圖片顯示「圖片已過期」提示
- [ ] 斷線後可從中斷處續傳（sub-chunk 級別）
- [ ] 離開頁面並重新進入可偵測未完成上傳
- [ ] 現有文字訊息功能完全不受影響
- [ ] 所有核心邏輯有 unit test 覆蓋

## 影響檔案總覽

| 檔案 | 操作 | 說明 |
|------|------|------|
| `api/types/chat.ts` | 修改 | 新增上傳型別、Message 擴充圖片欄位、UploadRecord 型別 |
| `api/modules/chat.ts` | 修改 | 新增 4 個上傳相關 API 函式（init、chunk、status、cancel） |
| `enums/websocket.ts` | 修改 | 新增 ImageMessage channel |
| `utils/crypto.ts` | 新增 | SHA-256 計算工具 |
| `composables/useChunkUpload.ts` | 新增 | 分片上傳 composable |
| `components/upload/ImagePreviewModal.vue` | 新增 | 圖片預覽確認彈窗 |
| `components/upload/UploadProgressBar.vue` | 新增 | 上傳進度條 |
| `components/chatroom/ImageMessage.vue` | 新增 | 圖片訊息泡泡 |
| `components/lightbox/index.vue` | 新增 | 全屏預覽 |
| `pages/chatroom/index.vue` | 修改 | 整合所有圖片上傳功能 |
| `layouts/default.vue` | 修改 | 全域 ImageMessage WS 訂閱 |

## 進度追蹤

- [x] TASK-001: 上傳型別定義與 Message 擴充（`api/types/chat.ts`）— Completed 2026-04-12
- [ ] TASK-002: 上傳 API 函式（`api/modules/chat.ts`）
- [ ] TASK-003: WebSocket channel 列舉（`enums/websocket.ts`）
- [ ] TASK-004: SHA-256 工具函式（`utils/crypto.ts`）
- [ ] TASK-005: 分片上傳 Composable（`composables/useChunkUpload.ts`）
- [ ] TASK-006: 圖片預覽確認彈窗（`components/upload/ImagePreviewModal.vue`）
- [ ] TASK-007: 上傳進度條元件（`components/upload/UploadProgressBar.vue`）
- [ ] TASK-008: 圖片訊息泡泡元件（`components/chatroom/ImageMessage.vue`）
- [ ] TASK-009: Lightbox 全屏預覽（`components/lightbox/index.vue`）
- [ ] TASK-010: 聊天室頁面整合（`pages/chatroom/index.vue`）
- [ ] TASK-011: WebSocket 事件訂閱（`pages/chatroom/index.vue` + `layouts/default.vue`）
- [ ] TASK-012: 斷線續傳機制完善（`composables/useChunkUpload.ts` + `pages/chatroom/index.vue`）

## 約束與注意事項

- `useHttp.delete` 的 `gateway` 參數為必填，呼叫時需傳入 `'normal'`
- `uploadChunkApi` 無法使用 `useHttp`（不支援 binary body + 自訂 header），需用原生 `$fetch` 封裝並手動注入 token
- `Content-Range` header 為 chunk upload API 的必填欄位，格式：`bytes {start}-{end}/{fileSize}`
- 後端不回傳 `chunkSize`，前端自行定義常數 `CHUNK_SIZE = 2 * 1024 * 1024`（2MB）
- 後端自動合併分片，無需前端呼叫 complete API
- 所有上傳 API 的 `needLoading` 應設為 `false`，避免觸發全域 loading overlay
- WebSocket 訊息透過 `BroadcastChannel` 廣播，新增的 `WsChannel` enum 值需與後端 WebSocket 事件的 `type` 欄位名稱完全一致（`imageMessage` 非 `image_message`）
- 現有 `Message` interface 的擴充必須全部使用 optional field（`?:`），確保向後相容
- 專案使用 Nuxt 3 auto-import，`composables/` 與 `components/` 下的檔案會自動可用，不需手動 import
- CSS z-index 需遵循 `tailwind.config.js` 中的層級定義（modal: 901、shadow: 1000）
- 聊天室頁面的 VirtualList 使用 scoped slot 渲染訊息，新增圖片訊息渲染時需注意 slot data 的 `item` 型別
- `composables/useChunkUpload.ts` 需遵循 `composable.md` 規範：Options interface 獨立定義、函式以 `use` 開頭、明確定義回傳值
- `ImageMessagePayload.roomId` 型別為 `number`（非 `string`）
- 圖片 URL 組成規則：`/images/messageImage/${imageId}/original.webp`（原圖）、`/images/messageImage/${imageId}/thumb.webp`（縮圖）
- 圖片有效期 24 小時，過期後 `isExpired: true`
