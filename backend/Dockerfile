# 使用 Ubuntu 22.04 作为基础镜像
FROM ubuntu:22.04

# 更新系统并安装 Node.js 和 npm
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 进入后端目录并安装依赖
RUN cd backend && npm install

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "backend/server.js"]
