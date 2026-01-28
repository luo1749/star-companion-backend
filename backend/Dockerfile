FROM node:18-alpine

RUN apk add --no-cache curl

WORKDIR /app/backend

COPY app/backend/package.json ./

RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps --no-package-lock --unsafe-perm

COPY app/backend ./

EXPOSE ${PORT:-3000}

HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

CMD ["sh", "-c", "node server.js"]