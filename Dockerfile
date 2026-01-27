FROM node:18
# 直接将工作目录设为/app/backend，与本地路径一致
WORKDIR /app/backend
# 复制本地app/backend下的依赖文件到当前工作目录
COPY ./app/backend/package.json ./app/backend/package-lock.json ./
# 安装依赖
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps
# 复制本地app/backend的所有代码到当前工作目录
COPY ./app/backend/ ./
# 启动服务（当前工作目录下的server.js）
CMD ["node", "server.js"]