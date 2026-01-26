# 选择 Node.js 18 官方镜像（Alpine 版本更小、更稳定）
FROM node:18-alpine

# 安装基础依赖（解决 Alpine 系统可能的依赖缺失）
RUN apk add --no-cache git

# 设置容器工作目录
WORKDIR /app

# 复制本地 app/backend 下的依赖文件
COPY ./app/backend/package.json ./app/backend/package-lock.json ./

# 清空 npm 缓存 + 切换国内源 + 强制重新安装依赖（无缓存）
RUN npm cache clean --force && \
    npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps --no-cache-dir

# 复制本地 app/backend 目录的所有代码
COPY ./app/backend/ ./

# 验证文件是否存在（调试用）
RUN ls -la /app

# 启动服务（指定绝对路径）
CMD ["node", "/app/server.js"]