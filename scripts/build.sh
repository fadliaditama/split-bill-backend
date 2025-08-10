#!/bin/bash

echo "🏗️  Building Split Bill Backend..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
if [ -d "dist" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf dist
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "Build output:"
    echo "  - Main: dist/main.js"
    echo "  - Size: $(du -sh dist | cut -f1)"
    echo ""
    echo "To run in production mode:"
    echo "  npm run start:prod"
    echo ""
    echo "To deploy to Vercel:"
    echo "  vercel --prod"
else
    echo "❌ Build failed!"
    exit 1
fi 