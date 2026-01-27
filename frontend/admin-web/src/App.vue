<template>
  <!-- 路由出口：登录页、仪表盘都会在这里渲染 -->
  <router-view />
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
/* 全局样式重置，适配登录页和后台页面 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}
</style>