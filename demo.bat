@echo off
echo ============================================
echo       星伴平台 - 一键演示脚本
echo ============================================
echo.
echo 请按顺序打开以下窗口进行演示：
echo.
echo 1. 后端服务器（API服务）
echo 2. 管理后台（数据展示）
echo 3. 微信小程序（移动端）
echo 4. Postman（API测试）
echo.
echo 按任意键启动后端服务器...
pause >nul

:: 启动后端服务器
start cmd /k "cd /d C:\star-companion\backend && echo [后端] 启动中... && npm start"

timeout /t 3 /nobreak >nul

echo.
echo 按任意键启动管理后台...
pause >nul

:: 启动管理后台
start cmd /k "cd /d C:\star-companion\frontend\admin-web && echo [前端] 启动中... && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo 按任意键打开微信开发者工具...
pause >nul

:: 打开微信开发者工具（需要手动路径）
echo 请手动打开微信开发者工具，导入项目：
echo 目录：C:\star-companion\frontend\mini-program
echo.

echo 按任意键打开Postman...
pause >nul

:: 打开Postman
start postman

echo.
echo ============================================
echo      所有组件已启动！
echo.
echo      访问以下地址：
echo      后端API：http://localhost:3000
echo      管理后台：http://localhost:5173
echo      微信小程序：在开发者工具中查看
echo ============================================
echo.
echo 按任意键退出...
pause >nul