# 第一步：用Node官方镜像作为构建环境
FROM node:18-alpine AS builder

# 第二步：设置工作目录（必须和项目实际路径一致）
WORKDIR /app/backend

# 第三步：先复制依赖配置文件（缓存优化）
COPY package.json package-lock.json ./

# 第四步：配置国内npm镜像（确保依赖能下载）
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps

# 第五步：复制项目所有代码（注意路径要和实际项目结构匹配）
COPY . .

# 第六步：启动服务（确保启动命令对应你的入口文件）
CMD ["node", "server.js"]