@echo off
echo ============================================
echo       星伴平台 - 一键启动脚本
echo ============================================
echo.

echo [1/3] 启动后端服务器...
start cmd /k "cd /d C:\star-companion\backend && echo 🔧 正在启动后端... && npm start"

timeout /t 5 /nobreak >nul

echo [2/3] 启动管理后台...
start cmd /k "cd /d C:\star-companion\frontend\admin-web && echo 🎨 正在启动前端... && npm run dev"

timeout /t 5 /nobreak >nul

echo [3/3] 打开浏览器...
start http://localhost:5173
start http://localhost:3000/api/docs

echo.
echo ============================================
echo       所有服务已启动！
echo.
echo       访问地址：
echo       后端API文档：http://localhost:3000/api/docs
echo       管理后台：http://localhost:5173
echo       登录账号：admin / 123456
echo ============================================
echo.
pause