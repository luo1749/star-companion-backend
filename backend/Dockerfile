# 使用 Node.js 18 + Ubuntu 镜像，自带 npm，兼容现有环境
FROM node:18-ubuntu

# 设置容器内的工作目录
WORKDIR /app

# 复制项目的所有文件到容器内
COPY . .

# 进入后端目录并安装依赖
RUN cd backend && npm install

# 暴露后端服务的端口（与项目配置一致）
EXPOSE 3000

# 启动后端服务（入口文件路径与项目一致）
CMD ["node", "backend/server.js"]
