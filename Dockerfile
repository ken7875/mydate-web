#build stage
FROM node:lts-alpine as build

WORKDIR /app

RUN apk add --no-cache \
    make \
    g++ \
    bash

# RUN apt-get update && apt-get install -y \
#     make \
#     g++ \
#     bash

COPY package.json yarn.lock ./

RUN yarn --version
RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .
RUN yarn build
FROM keymetrics/pm2:latest-alpine AS production

WORKDIR /app

# 複製 build 出來的 .output
COPY --from=build /app/.output ./.output

# 設定 PM2 要跑的 application
COPY ecosystem.config.js .

# 暴露的連接埠
EXPOSE 3000

# 啟動應用程式
ENTRYPOINT ["pm2-runtime", "start", "/app/ecosystem.config.js"]