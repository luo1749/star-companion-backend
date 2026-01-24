# 使用官方 Node.js 18 镜像，自带 npm
FROM node:18

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
