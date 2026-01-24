FROM node:18

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY backend/package.json .
COPY backend/package-lock.json .

# Use domestic npm registry and install dependencies with root permissions
RUN npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps --unsafe-perm

# Copy the rest of the project files
COPY . .

# Expose the service port
EXPOSE 3000

# Start the backend service
CMD ["node", "backend/server.js"]
