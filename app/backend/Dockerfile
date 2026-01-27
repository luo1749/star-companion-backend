# 基础镜像（保留node:18，如需轻量化可改为node:18-alpine）
FROM node:18

# 工作目录：容器内统一为/app/backend，和本地路径对应
WORKDIR /app/backend

# 复制依赖文件：Dockerfile在app/backend里，本地路径直接写./（当前目录）
COPY package.json package-lock.json ./

# 配置国内镜像+安装依赖（--unsafe-perm解决权限问题，保留）
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --unsafe-perm

# 复制所有代码：Dockerfile在app/backend里，./代表本地的app/backend目录
COPY ./ ./

# 暴露端口（和你的服务端口一致）
EXPOSE 3000

# 启动服务：容器内/app/backend下的server.js（直接写server.js即可）
CMD ["node", "server.js"]