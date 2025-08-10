#!/bin/bash

echo "🧪 Running Split Bill Backend Tests..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run unit tests
echo "🔬 Running unit tests..."
npm run test

# Run e2e tests if database is available
if docker-compose ps postgres | grep -q "Up"; then
    echo "🧪 Running e2e tests..."
    npm run test:e2e
else
    echo "⚠️  Database not running. Skipping e2e tests."
    echo "   Run 'scripts/start-dev.sh' to start the database first."
fi

# Run test coverage
echo "📊 Running test coverage..."
npm run test:cov

echo "✅ All tests completed!" 