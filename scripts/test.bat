@echo off
echo 🧪 Running Split Bill Backend Tests...

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Run unit tests
echo 🔬 Running unit tests...
npm run test

REM Run e2e tests if database is available
docker-compose ps postgres | findstr "Up" >nul 2>&1
if %errorlevel% equ 0 (
    echo 🧪 Running e2e tests...
    npm run test:e2e
) else (
    echo ⚠️  Database not running. Skipping e2e tests.
    echo    Run 'scripts\start-dev.bat' to start the database first.
)

REM Run test coverage
echo 📊 Running test coverage...
npm run test:cov

echo ✅ All tests completed!
pause 