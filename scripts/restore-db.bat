@echo off
echo 🔄 Restoring Database from Backup...

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

REM Check if backups directory exists
if not exist "backups" (
    echo ❌ Backups directory not found. Please create a backup first.
    pause
    exit /b 1
)

REM List available backups
echo 📁 Available backups:
dir /b backups\*.sql 2>nul | findstr /n ".*"

if %errorlevel% neq 0 (
    echo ❌ No backup files found in backups directory.
    pause
    exit /b 1
)

REM Ask user to select backup file
echo.
set /p backup_number="Enter backup file number to restore: "

REM Get the selected backup file
for /f "tokens=1 delims=:" %%a in ('dir /b backups\*.sql 2^>nul ^| findstr /n ".*" ^| findstr "^%backup_number%:"') do set "backup_file=%%a"
set "backup_file=!backup_file:%backup_number%:=!"

if not exist "backups\!backup_file!" (
    echo ❌ Invalid backup file number.
    pause
    exit /b 1
)

echo 📁 Selected backup: !backup_file!

REM Confirm action
set /p confirm="⚠️  This will OVERWRITE current database. Are you sure? (y/N): "
if /i not "!confirm!"=="y" (
    echo ❌ Database restore cancelled.
    pause
    exit /b 1
)

REM Drop and recreate database
echo 🗑️  Dropping current database...
docker-compose exec -T postgres dropdb -U postgres split_bill_db --if-exists

echo 🆕 Creating new database...
docker-compose exec -T postgres createdb -U postgres split_bill_db

REM Restore from backup
echo 🔄 Restoring from backup...
docker-compose exec -T postgres psql -U postgres -d split_bill_db < "backups\!backup_file!"

if %errorlevel% equ 0 (
    echo ✅ Database restored successfully!
    echo 📁 Restored from: !backup_file!
) else (
    echo ❌ Database restore failed!
    pause
    exit /b 1
)
pause 