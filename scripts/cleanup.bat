@echo off
echo 🧹 Cleaning up Split Bill Backend Development Environment...

REM Stop and remove containers
echo 🐳 Stopping Docker containers...
docker-compose down

REM Remove node_modules
if exist "node_modules" (
    echo 🗑️  Removing node_modules...
    rmdir /s /q node_modules
)

REM Remove package-lock.json
if exist "package-lock.json" (
    echo 🗑️  Removing package-lock.json...
    del package-lock.json
)

REM Remove .env file
if exist ".env" (
    echo 🗑️  Removing .env file...
    del .env
)

REM Remove dist folder
if exist "dist" (
    echo 🗑️  Removing dist folder...
    rmdir /s /q dist
)

REM Remove coverage folder
if exist "coverage" (
    echo 🗑️  Removing coverage folder...
    rmdir /s /q coverage
)

echo ✅ Cleanup complete!
echo.
echo To start fresh:
echo 1. Run 'scripts\dev-setup.bat' to setup the environment
echo 2. Run 'scripts\start-dev.bat' to start the application
pause 