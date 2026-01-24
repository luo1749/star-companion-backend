FROM node:18

# Copy package files
COPY ./backend/package.json .
COPY ./backend/package-lock.json .

# Install dependencies
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps --unsafe-perm

# Verify installation
RUN echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    echo "Current directory: $(pwd)" && \
    ls -la

# Copy all backend files
COPY ./backend/ .

# Verify server.js exists
RUN ls -la && test -f server.js && echo "✅ server.js found" || echo "❌ server.js missing"

# Expose port
EXPOSE 3000

# Start service - 
CMD ["node", "server.js"]
