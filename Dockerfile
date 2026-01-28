FROM node:18-alpine

WORKDIR /app/backend

COPY app/backend/package.json ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps --no-package-lock --unsafe-perm

COPY app/backend ./

EXPOSE 3000

CMD ["node", "server.js"]