#!/bin/bash

echo "💾 Creating Database Backup..."

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

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate backup filename with timestamp
BACKUP_FILE="backups/split_bill_db_$(date +%Y%m%d_%H%M%S).sql"

echo "📁 Creating backup: $BACKUP_FILE"

# Create backup
docker-compose exec -T postgres pg_dump -U postgres -d split_bill_db > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "📁 File: $BACKUP_FILE"
    echo "📏 Size: $FILE_SIZE"
    echo ""
    echo "To restore this backup:"
    echo "  docker-compose exec -T postgres psql -U postgres -d split_bill_db < $BACKUP_FILE"
else
    echo "❌ Backup failed!"
    # Remove failed backup file
    rm -f "$BACKUP_FILE"
    exit 1
fi 