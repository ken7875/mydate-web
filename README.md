# 🚀 HOT DATE
使用nuxt3實作的交友軟體(目前只實作手機版型)

## 預覽
1. cloen專案
```sh
git clone https://github.com/ken7875/hot-date-client.git
```
2. 運行docker compose
```sh
docker compose up
```

## 專案啟動說明
NODE 版本: 22.17.0

1. 安裝依賴：
    ```sh
    yarn
    ```
2. 開發模式：
    ```sh
    yarn dev
    ```
3. 打包：
    ```sh
    yarn build
    ```

## 專案結構

這是一個典型的 Vue CLI 專案結構，您可以依此為基礎進行說明：

```
HOT-DATE/
├── public/              # 靜態資源, 不會經過Vite打包
│   └── image            # 圖片
├── assets/              # 圖片、字體等資源
├── utils/               # 共用函式
│   └── websocket/      
│       └── websocket/   # websocket共用實例
├── composable/          # 元件內共用方法, 含nuxt鉤子函式(auto-import)
├── vueQuery/            # vue-query狀態管理(auto-import)
    ├── useUserInfoQuery.ts # 登入用戶api資料快取
    └── useMessageQuery.ts  # 聊天訊息api資了快取
├── components/          # 可複用的 Vue 元件
├── store/               # Pinia 狀態管理
├── page/                # 頁面級別的 Vue 元件
    ├── auth/            # 登入註冊頁面
        ├── __test__     # 單元測試
        ├── Login.vue    # 登入頁面
        └── SetUserInfo.vue #用戶資料填寫
    ├── chatroom/        # 聊天室頁面
    ├── friends/         # 好友介面
    ├── live/            # 觀看直播
    ├── stream/          # 開直播頁面
    ├── meet/            # 抽卡頁面
├── App.vue              # 根元件
├── main.js              # 應用程式主入口 JS
├── types/
    ├── global.d.ts/     # 對三方套件進行型別擴充
├── .env.local           # 開發環境變數
├── .env.prod            # 生產環境變數
├── package.json         # 專案依賴與腳本
└── README.md            # 就是這個檔案
```