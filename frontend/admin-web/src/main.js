import { createApp } from 'vue'
import App from './App.vue'
// 引入路由配置
import router from './router'

// 创建应用并挂载路由
const app = createApp(App)
app.use(router)
app.mount('#app')