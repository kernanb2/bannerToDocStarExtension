@echo off
title Moving Banner Extension Files
color 0A

echo.
echo ========================================
echo   Banner to DocStar Extension
echo   File Mover
echo ========================================
echo.
echo This will move the extension files to:
echo C:\BannerExtension
echo.
pause

:: Create destination directory
if not exist "C:\BannerExtension" mkdir "C:\BannerExtension"

:: Get the directory where this script is located
set SOURCE_DIR=%~dp0

:: Move files
echo.
echo Moving files...
move "%SOURCE_DIR%manifest.json" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%background.js" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%content.js" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%popup.html" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%popup.js" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%icon16.png" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%icon48.png" "C:\BannerExtension\" >nul 2>&1
move "%SOURCE_DIR%icon128.png" "C:\BannerExtension\" >nul 2>&1

echo Done!
echo.
echo Files moved to C:\BannerExtension
echo.
echo You can now close this window and return
echo to the installation instructions webpage.
echo.
pause
