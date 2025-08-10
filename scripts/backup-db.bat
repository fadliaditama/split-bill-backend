@echo off
echo 💾 Creating Database Backup...

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

REM Create backups directory if it doesn't exist
if not exist "backups" mkdir backups

REM Generate backup filename with timestamp
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "BACKUP_FILE=backups\split_bill_db_%YYYY%%MM%%DD%_%HH%%Min%%Sec%.sql"

echo 📁 Creating backup: %BACKUP_FILE%

REM Create backup
docker-compose exec -T postgres pg_dump -U postgres -d split_bill_db > "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo ✅ Backup created successfully!
    echo 📁 File: %BACKUP_FILE%
    echo.
    echo To restore this backup:
    echo   docker-compose exec -T postgres psql -U postgres -d split_bill_db ^< %BACKUP_FILE%
) else (
    echo ❌ Backup failed!
    REM Remove failed backup file
    if exist "%BACKUP_FILE%" del "%BACKUP_FILE%"
    pause
    exit /b 1
)
pause 