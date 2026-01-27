FROM node:18
WORKDIR /app/backend
# 明确指定从GitHub拉取的路径
COPY app/backend/package.json app/backend/package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps
COPY app/backend ./
EXPOSE 3000
CMD ["node", "server.js"]