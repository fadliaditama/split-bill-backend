@echo off
echo 🌱 Running Database Seeders...

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please run dev-setup.bat first.
    pause
    exit /b 1
)

REM Check if database is running
docker-compose ps postgres | findstr "Up" >nul 2>&1
if %errorlevel% neq 0 (
    echo 🐘 Starting PostgreSQL database...
    docker-compose up -d postgres
    
    REM Wait for database to be ready
    echo ⏳ Waiting for database to be ready...
    :wait_loop
    docker-compose exec -T postgres pg_isready -U postgres >nul 2>&1
    if %errorlevel% neq 0 (
        echo    Waiting for PostgreSQL...
        timeout /t 2 /nobreak >nul
        goto wait_loop
    )
    echo ✅ Database is ready!
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Run seeders
echo 🌱 Running seeders...
npm run seed

if %errorlevel% equ 0 (
    echo ✅ Seeders completed successfully!
    echo.
    echo Sample data has been added to the database:
    echo   - Test users
    echo   - Sample bills
    echo   - Sample split details
) else (
    echo ❌ Seeders failed!
    echo.
    echo Troubleshooting:
    echo 1. Check if database connection is correct in .env
    echo 2. Verify database schema exists
    echo 3. Check seeder files in src\seeders\
    pause
    exit /b 1
)
pause 