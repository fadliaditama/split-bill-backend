#!/bin/bash

echo "🗄️  Running Database Migrations..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run dev-setup.sh first."
    exit 1
fi

# Check if database is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo "🐘 Starting PostgreSQL database..."
    docker-compose up -d postgres
    
    # Wait for database to be ready
    echo "⏳ Waiting for database to be ready..."
    until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        echo "   Waiting for PostgreSQL..."
        sleep 2
    done
    echo "✅ Database is ready!"
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run migrations
echo "🔄 Running migrations..."
npm run migration:run

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migrations failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if database connection is correct in .env"
    echo "2. Verify database schema exists"
    echo "3. Check migration files in src/migrations/"
    exit 1
fi 