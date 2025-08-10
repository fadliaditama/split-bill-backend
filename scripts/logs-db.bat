@echo off
echo 📋 Database Logs

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please run dev-setup.bat first.
    pause
    exit /b 1
)

REM Check if database is running
docker-compose ps postgres | findstr "Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Database is not running. Please start it first.
    pause
    exit /b 1
)

echo 🐘 PostgreSQL Database Logs:
echo =============================

REM Show recent logs
echo Recent logs (last 50 lines):
docker-compose logs --tail=50 postgres

echo.
echo ✅ Logs displayed successfully!
echo.
echo Options:
echo   - To follow logs in real-time: docker-compose logs -f postgres
echo   - To see more logs: docker-compose logs --tail=100 postgres
echo   - To see logs since specific time: docker-compose logs --since=1h postgres
echo.
pause 