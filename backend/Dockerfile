FROM node:18

# Set working directory
WORKDIR /app

# Copy entire project
COPY . .

# Enter backend directory and install dependencies
RUN cd backend && npm config set registry https://registry.npmmirror.com && npm install

# Expose port
EXPOSE 3000

# Start service
CMD ["node", "backend/server.js"]
