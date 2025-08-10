#!/bin/bash

echo "🚀 Setting up Split Bill Backend Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/split_bill_db

# JWT Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Supabase Configuration
SUPABASE_URL=your-supabase-url-here
SUPABASE_KEY=your-supabase-key-here

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key-here

# Application Configuration
PORT=3000
NODE_ENV=development
EOF
    echo "✅ .env file created. Please update with your actual API keys."
else
    echo "✅ .env file already exists."
fi

# Start PostgreSQL database
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "   Waiting for PostgreSQL..."
    sleep 2
done
echo "✅ Database is ready!"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations (if using TypeORM migrations)
echo "🗄️  Running database migrations..."
npm run migration:run || echo "⚠️  No migrations found or migration command not configured."

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual API keys"
echo "2. Run 'npm run start:dev' to start the application"
echo "3. Access the API at http://localhost:3000"
echo ""
echo "To stop the database: docker-compose down"
echo "To view logs: docker-compose logs -f postgres" 