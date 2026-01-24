FROM node:18

# Set working directory
WORKDIR /app/backend

# Copy package files
COPY ./backend/package.json .
COPY ./backend/package-lock.json .

# Install dependencies
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --unsafe-perm

# Copy all backend files
COPY ./backend/ .

# Expose port
EXPOSE 3000

# Start service 
CMD ["node", "server.js"]
