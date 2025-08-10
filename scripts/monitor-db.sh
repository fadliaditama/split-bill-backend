#!/bin/bash

echo "📊 Database Monitor"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run dev-setup.sh first."
    exit 1
fi

# Check if database is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "❌ Database is not running. Please start it first."
    exit 1
fi

echo "🐘 PostgreSQL Database Status:"
echo "================================"

# Get container status
echo "Container Status:"
docker-compose ps postgres

echo ""

# Get database size
echo "Database Size:"
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "
SELECT 
    pg_size_pretty(pg_database_size('split_bill_db')) as database_size,
    pg_size_pretty(pg_total_relation_size('bills')) as bills_table_size,
    pg_size_pretty(pg_total_relation_size('users')) as users_table_size;
"

echo ""

# Get table row counts
echo "Table Row Counts:"
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as rows_inserted,
    n_tup_upd as rows_updated,
    n_tup_del as rows_deleted
FROM pg_stat_user_tables 
WHERE tablename IN ('users', 'bills')
ORDER BY tablename;
"

echo ""

# Get active connections
echo "Active Connections:"
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "
SELECT 
    count(*) as active_connections,
    state,
    application_name
FROM pg_stat_activity 
WHERE datname = 'split_bill_db'
GROUP BY state, application_name
ORDER BY active_connections DESC;
"

echo ""

# Get recent activity
echo "Recent Activity (last 10 minutes):"
docker-compose exec -T postgres psql -U postgres -d split_bill_db -c "
SELECT 
    query_start,
    state,
    query
FROM pg_stat_activity 
WHERE datname = 'split_bill_db' 
    AND query_start > NOW() - INTERVAL '10 minutes'
    AND state != 'idle'
ORDER BY query_start DESC
LIMIT 5;
"

echo ""
echo "✅ Database monitoring completed!"
echo ""
echo "To refresh: Run this script again"
echo "To stop monitoring: Press Ctrl+C" 