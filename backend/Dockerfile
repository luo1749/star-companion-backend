FROM node:18

# 设置工作目录
WORKDIR /app

# 先复制 package.json 以利用缓存
COPY backend/package.json .
COPY backend/package-lock.json .

# 安装依赖
RUN npm install

# 复制其他项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "backend/server.js"]
