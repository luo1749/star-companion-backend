@echo off
echo ============================================
echo       星伴手表应用 - 构建脚本
echo ============================================
echo.

echo [1/5] 检查Android环境...
where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 未找到adb，请安装Android SDK
    pause
    exit /b 1
)

echo [2/5] 清理构建缓存...
cd star-companion-watch
gradlew clean

echo [3/5] 构建应用...
gradlew assembleDebug

echo [4/5] 安装到手表...
adb devices
adb install -r app\build\outputs\apk\debug\app-debug.apk

echo [5/5] 启动应用...
adb shell am start -n com.starcompanion.watch/.MainActivity

echo.
echo ============================================
echo     ✅ 手表应用构建完成！
echo     应用已安装并启动
echo ============================================
echo.
pause