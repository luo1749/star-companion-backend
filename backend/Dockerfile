FROM node:18

# Set working directory
WORKDIR /app

# Copy package files to leverage Docker cache
COPY backend/package.json .
COPY backend/package-lock.json .

# Use domestic npm registry and install dependencies
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --unsafe-perm

# Copy the rest of the project
COPY . .

# Expose service port
EXPOSE 3000

# Start the service
CMD ["node", "backend/server.js"]
