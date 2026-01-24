FROM node:18

WORKDIR /app/backend

COPY backend/package.json .
COPY backend/package-lock.json .

RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --unsafe-perm

COPY backend/ .

EXPOSE 3000

CMD ["node", "server.js"]