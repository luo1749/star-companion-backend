@echo off
echo ============================================
echo       星伴平台 - 比赛打包脚本
echo ============================================
echo.

echo [1/6] 创建打包目录...
mkdir "比赛提交材料" 2>nul
cd "比赛提交材料"
mkdir "1-项目文档"
mkdir "2-演示材料"
mkdir "3-源代码"
mkdir "4-部署文件"
mkdir "5-比赛表格"

echo [2/6] 复制项目文档...
xcopy "..\docs\项目文档\*" "1-项目文档\" /E /Y
xcopy "..\docs\比赛材料\*" "5-比赛表格\" /E /Y

echo [3/6] 复制演示材料...
xcopy "..\docs\演示材料\*" "2-演示材料\" /E /Y

echo [4/6] 复制源代码...
xcopy "..\backend\*" "3-源代码\backend\" /E /Y /EXCLUDE:..\scripts\exclude.txt
xcopy "..\frontend\*" "3-源代码\frontend\" /E /Y /EXCLUDE:..\scripts\exclude.txt
xcopy "..\database\*" "3-源代码\database\" /E /Y

echo [5/6] 创建部署包...
copy "..\scripts\deploy.bat" "4-部署文件\"
copy "..\scripts\start-all.bat" "4-部署文件\"
copy "..\scripts\demo.bat" "4-部署文件\"

echo [6/6] 创建说明文件...
echo 星伴平台 - 比赛提交材料 > README.txt
echo. >> README.txt
echo 提交时间: %date% %time% >> README.txt
echo 版本号: 1.0.0 >> README.txt
echo 提交团队: [你的团队名] >> README.txt
echo. >> README.txt
echo 目录说明: >> README.txt
echo 1-项目文档: 项目说明、技术文档、用户手册等 >> README.txt
echo 2-演示材料: PPT、演示视频、产品原型图 >> README.txt
echo 3-源代码: 完整项目源代码 >> README.txt
echo 4-部署文件: 一键部署脚本 >> README.txt
echo 5-比赛表格: 商业计划书、市场分析等 >> README.txt

echo.
echo ============================================
echo     ✅ 比赛材料打包完成！
echo     请检查"比赛提交材料"目录
echo ============================================
echo.
pause