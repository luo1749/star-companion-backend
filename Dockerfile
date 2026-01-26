# 选择 Node.js 18 官方镜像（不使用 Alpine，避免特权依赖）
FROM node:18

# 设置容器工作目录
WORKDIR /app

# 复制本地 app/backend 下的依赖文件
COPY ./app/backend/package.json ./app/backend/package-lock.json ./

# 清空缓存 + 切换国内源 + 安装依赖（无特权操作）
RUN npm cache clean --force && \
    npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps --no-cache-dir

# 复制本地 app/backend 目录的所有代码
COPY ./app/backend/ ./

# 验证文件是否存在（调试用）
RUN ls -la /app

# 启动服务（指定绝对路径）
CMD ["node", "/app/server.js"]