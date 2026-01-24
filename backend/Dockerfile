FROM node:18

# 设置工作目录
WORKDIR /app

# 复制后端的 package.json 和 package-lock.json
COPY backend/package.json .
COPY backend/package-lock.json .

# 换国内 npm 源加速安装
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm install

# 复制所有项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "backend/server.js"]
