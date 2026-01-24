FROM node:18-ubuntu
WORKDIR /app
COPY . .
RUN cd backend && npm install
EXPOSE 3000
CMD ["node", "backend/server.js"]
