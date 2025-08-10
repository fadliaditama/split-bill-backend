#!/bin/bash

echo "🔄 Restoring Database from Backup..."

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

# Check if backups directory exists
if [ ! -d "backups" ]; then
    echo "❌ Backups directory not found. Please create a backup first."
    exit 1
fi

# List available backups
echo "📁 Available backups:"
ls -la backups/*.sql 2>/dev/null | nl

if [ $? -ne 0 ]; then
    echo "❌ No backup files found in backups directory."
    exit 1
fi

# Ask user to select backup file
echo ""
read -p "Enter backup file number to restore: " BACKUP_NUMBER

# Get the selected backup file
BACKUP_FILE=$(ls backups/*.sql | sed -n "${BACKUP_NUMBER}p")

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Invalid backup file number."
    exit 1
fi

echo "📁 Selected backup: $BACKUP_FILE"

# Confirm action
read -p "⚠️  This will OVERWRITE current database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Database restore cancelled."
    exit 1
fi

# Drop and recreate database
echo "🗑️  Dropping current database..."
docker-compose exec -T postgres dropdb -U postgres split_bill_db --if-exists

echo "🆕 Creating new database..."
docker-compose exec -T postgres createdb -U postgres split_bill_db

# Restore from backup
echo "🔄 Restoring from backup..."
docker-compose exec -T postgres psql -U postgres -d split_bill_db < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    echo "📁 Restored from: $BACKUP_FILE"
else
    echo "❌ Database restore failed!"
    exit 1
fi 