#!/bin/bash

# Backup script for instruire_auto database
BACKUP_DIR="/var/www/instruire-auto--backend/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/instruire_auto_before_import_${DATE}.sql"

echo "🔄 Creating backup before import..."
echo "Backup file: $BACKUP_FILE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create the backup
mysqldump -u instruire_auto -p'ChangeMe!112' instruire_auto > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    echo "📁 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Backup failed!"
    exit 1
fi