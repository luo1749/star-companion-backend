@echo off
echo ============================================
echo       星伴平台 - 系统优化脚本
echo ============================================
echo.

echo [1/6] 清理node_modules缓存...
cd backend
if exist node_modules rmdir /s /q node_modules
npm cache clean --force

echo [2/6] 重新安装依赖...
call npm install

echo [3/6] 运行数据库优化...
node utils/dbOptimizer.js

echo [4/6] 运行API测试...
node tests/test-api.js

echo [5/6] 编译前端...
cd ..\frontend\admin-web
if exist node_modules rmdir /s /q node_modules
call npm install
call npm run build

echo [6/6] 清理临时文件...
cd ..\..\
del /q *.log 2>nul
del /q *.tmp 2>nul

echo.
echo ============================================
echo     ✅ 系统优化完成！
echo ============================================
echo.
pause