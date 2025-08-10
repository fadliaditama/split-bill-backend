@echo off
echo 🚀 Starting Split Bill Backend in Development Mode...

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

REM Start the application
echo 🔥 Starting NestJS application...
npm run start:dev 