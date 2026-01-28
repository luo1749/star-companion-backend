import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // 保留基础的 Vue 插件配置
  plugins: [vue()],
  
  // 开发服务器配置（方便本地开发）
  server: {
    host: true,        // 允许外部访问（比如局域网其他设备访问）
    port: 5173         // 自定义开发服务器端口
  },
  
  // 构建配置（优化生产打包）
  build: {
    outDir: 'dist',    // 输出目录（和 Vercel 配置的 output 目录对应）
    assetsDir: 'assets', // 静态资源存放目录
    sourcemap: false   // 生产环境不生成 sourcemap（减小打包体积）
  }
})