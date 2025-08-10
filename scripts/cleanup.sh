#!/bin/bash

echo "🧹 Cleaning up Split Bill Backend Development Environment..."

# Stop and remove containers
echo "🐳 Stopping Docker containers..."
docker-compose down

# Remove node_modules
if [ -d "node_modules" ]; then
    echo "🗑️  Removing node_modules..."
    rm -rf node_modules
fi

# Remove package-lock.json
if [ -f "package-lock.json" ]; then
    echo "🗑️  Removing package-lock.json..."
    rm package-lock.json
fi

# Remove .env file
if [ -f ".env" ]; then
    echo "🗑️  Removing .env file..."
    rm .env
fi

# Remove dist folder
if [ -d "dist" ]; then
    echo "🗑️  Removing dist folder..."
    rm -rf dist
fi

# Remove coverage folder
if [ -d "coverage" ]; then
    echo "🗑️  Removing coverage folder..."
    rm -rf coverage
fi

echo "✅ Cleanup complete!"
echo ""
echo "To start fresh:"
echo "1. Run 'scripts/dev-setup.sh' to setup the environment"
echo "2. Run 'scripts/start-dev.sh' to start the application" 