#!/bin/bash

echo "🔄 Resetting Database..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run dev-setup.sh first."
    exit 1
fi

# Confirm action
read -p "⚠️  This will DELETE ALL DATA in the database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Database reset cancelled."
    exit 1
fi

# Stop and remove containers
echo "🐳 Stopping Docker containers..."
docker-compose down

# Remove volume data
echo "🗑️  Removing database volume..."
docker volume rm split-bill-backend_postgres_data

# Start fresh database
echo "🐘 Starting fresh PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ Database is ready!"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run migrations
echo "🔄 Running migrations..."
npm run migration:run

if [ $? -eq 0 ]; then
    echo "✅ Database reset completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Run 'scripts/seed.sh' to add sample data"
    echo "2. Run 'scripts/start-dev.sh' to start the application"
else
    echo "❌ Database reset failed!"
    exit 1
fi 