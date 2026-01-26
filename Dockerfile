# 选择 Node.js 18 官方镜像（自带 npm）
FROM node:18

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存
COPY ./backend/package.json ./backend/package-lock.json ./
# 切换国内镜像源并安装依赖
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps

# 复制项目代码
COPY ./backend/ .

# 启动服务
CMD ["node", "server.js"]