FROM node:18

# 设置工作目录
WORKDIR /app

# 复制整个项目
COPY . .

# 进入后端目录并安装依赖
RUN cd backend && npm config set registry https://registry.npmmirror.com && npm install

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "backend/server.js"]
