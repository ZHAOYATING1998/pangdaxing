# ---- 构建阶段 ----
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./

# 安装依赖（包括 devDependencies，构建需要）
RUN npm install --legacy-peer-deps

# 复制源码
COPY server/ server/
COPY client/ client/
COPY shared/ shared/
COPY vite.config.ts ./
COPY nest-cli.json ./

# 构建后端
RUN npx nest build

# 构建前端
RUN npx vite build --config vite.config.ts

# ---- 运行阶段 ----
FROM node:22-alpine

WORKDIR /app

# 复制 package.json 和构建产物
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist

# 只安装生产依赖
RUN npm install --omit=dev --legacy-peer-deps

# 清理 npm 缓存
RUN npm cache clean --force

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/server/main.js"]
