@echo off
echo 📊 Database Monitor

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

echo 🐘 PostgreSQL Database Status:
echo ================================

REM Get container status
echo Container Status:
docker-compose ps postgres

echo.

REM Get database size
echo Database Size:
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "SELECT pg_size_pretty(pg_database_size('split_bill_db')) as database_size, pg_size_pretty(pg_total_relation_size('bills')) as bills_table_size, pg_size_pretty(pg_total_relation_size('users')) as users_table_size;"

echo.

REM Get table row counts
echo Table Row Counts:
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "SELECT schemaname, tablename, n_tup_ins as rows_inserted, n_tup_upd as rows_updated, n_tup_del as rows_deleted FROM pg_stat_user_tables WHERE tablename IN ('users', 'bills') ORDER BY tablename;"

echo.

REM Get active connections
echo Active Connections:
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "SELECT count(*) as active_connections, state, application_name FROM pg_stat_activity WHERE datname = 'split_bill_db' GROUP BY state, application_name ORDER BY active_connections DESC;"

echo.

REM Get recent activity
echo Recent Activity (last 10 minutes):
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "SELECT query_start, state, query FROM pg_stat_activity WHERE datname = 'split_bill_db' AND query_start > NOW() - INTERVAL '10 minutes' AND state != 'idle' ORDER BY query_start DESC LIMIT 5;"

echo.
echo ✅ Database monitoring completed!
echo.
echo To refresh: Run this script again
pause 