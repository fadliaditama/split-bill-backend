#!/bin/bash

echo "📋 Database Logs"

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

echo "🐘 PostgreSQL Database Logs:"
echo "============================="

# Show recent logs
echo "Recent logs (last 50 lines):"
docker-compose logs --tail=50 postgres

echo ""
echo "✅ Logs displayed successfully!"
echo ""
echo "Options:"
echo "  - To follow logs in real-time: docker-compose logs -f postgres"
echo "  - To see more logs: docker-compose logs --tail=100 postgres"
echo "  - To see logs since specific time: docker-compose logs --since='1h' postgres"
echo ""
echo "To stop viewing logs: Press Ctrl+C" 