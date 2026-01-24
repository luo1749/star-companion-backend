FROM node:18

WORKDIR /app

COPY . .

RUN cd backend && npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --timeout=60000 --maxsockets=1

EXPOSE 3000

CMD ["node", "backend/server.js"]
