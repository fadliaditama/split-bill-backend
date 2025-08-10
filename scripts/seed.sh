#!/bin/bash

echo "🌱 Running Database Seeders..."

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

# Run seeders
echo "🌱 Running seeders..."
npm run seed

if [ $? -eq 0 ]; then
    echo "✅ Seeders completed successfully!"
    echo ""
    echo "Sample data has been added to the database:"
    echo "  - Test users"
    echo "  - Sample bills"
    echo "  - Sample split details"
else
    echo "❌ Seeders failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if database connection is correct in .env"
    echo "2. Verify database schema exists"
    echo "3. Check seeder files in src/seeders/"
    exit 1
fi 