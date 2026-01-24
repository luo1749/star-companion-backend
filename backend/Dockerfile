# 使用 Ubuntu 22.04 作为基础镜像
FROM ubuntu:22.04

# 安装 Node.js 和 npm
RUN apt-get update && apt-get install -y nodejs npm

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 安装依赖并启动服务
RUN cd backend && npm install
EXPOSE 3000
CMD ["node", "backend/server.js"]
