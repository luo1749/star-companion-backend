# 基础镜像（保留node:18即可，alpine更轻量化，可选）
FROM node:18

# 工作目录：容器内的目录，和本地backend对应
WORKDIR /app/backend

# 复制依赖文件：Dockerfile在backend文件夹里，所以本地路径直接写./（当前目录）
COPY package.json package-lock.json ./

# 配置国内镜像+安装依赖（解决下载失败）
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps

# 复制所有代码：同样因为Dockerfile在backend里，本地路径写./即可
COPY ./ ./

# 启动服务（容器内/app/backend下的server.js）
CMD ["node", "server.js"]