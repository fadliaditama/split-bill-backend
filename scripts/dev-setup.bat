@echo off
echo 🚀 Setting up Split Bill Backend Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    (
        echo # Database Configuration
        echo DATABASE_URL=postgresql://postgres:password@localhost:5432/split_bill_db
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=dev-jwt-secret-key-change-in-production
        echo JWT_EXPIRES_IN=7d
        echo.
        echo # Supabase Configuration
        echo SUPABASE_URL=your-supabase-url-here
        echo SUPABASE_KEY=your-supabase-key-here
        echo.
        echo # Gemini AI Configuration
        echo GEMINI_API_KEY=your-gemini-api-key-here
        echo.
        echo # Application Configuration
        echo PORT=3000
        echo NODE_ENV=development
    ) > .env
    echo ✅ .env file created. Please update with your actual API keys.
) else (
    echo ✅ .env file already exists.
)

REM Start PostgreSQL database
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

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Run database migrations (if using TypeORM migrations)
echo 🗄️  Running database migrations...
npm run migration:run 2>nul || echo ⚠️  No migrations found or migration command not configured.

echo.
echo 🎉 Development environment setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your actual API keys
echo 2. Run 'npm run start:dev' to start the application
echo 3. Access the API at http://localhost:3000
echo.
echo To stop the database: docker-compose down
echo To view logs: docker-compose logs -f postgres
pause 