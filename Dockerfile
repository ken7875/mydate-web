#build stage
FROM node:lts-alpine AS build

WORKDIR /app

RUN apk add --no-cache \
    curl \
    bash

# RUN apt-get update && apt-get install -y \
#     make \
#     g++ \
#     bash

COPY package.json yarn.lock ./

RUN yarn --version
RUN yarn install --frozen-lockfile && yarn cache clean

COPY . .
RUN yarn build:prod

FROM node:lts-alpine

WORKDIR /app

# 只複製 build 結果（關鍵）
COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]