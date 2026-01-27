FROM node:18
WORKDIR /app/backend
# 只复制package.json，不依赖lock文件
COPY package.json ./
# 安装时关闭锁文件验证
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --no-package-lock
# 复制所有代码
COPY ./ ./
EXPOSE 3000
CMD ["node", "server.js"]