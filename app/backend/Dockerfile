FROM node:18
WORKDIR /app/backend
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --no-package-lock
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]