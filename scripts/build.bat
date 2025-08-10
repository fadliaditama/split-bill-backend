@echo off
echo 🏗️  Building Split Bill Backend...

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Clean previous build
if exist "dist" (
    echo 🧹 Cleaning previous build...
    rmdir /s /q dist
)

REM Build the application
echo 🔨 Building application...
npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful!
    echo.
    echo Build output:
    echo   - Main: dist\main.js
    echo.
    echo To run in production mode:
    echo   npm run start:prod
    echo.
    echo To deploy to Vercel:
    echo   vercel --prod
) else (
    echo ❌ Build failed!
    pause
    exit /b 1
)
pause 