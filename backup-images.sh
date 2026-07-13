#!/bin/bash

# Backup script for check-in/out photos
# Run daily via cron: 0 2 * * * /path/to/backup-images.sh

BACKUP_DIR="/Users/taidoan/Desktop/sinhtoooo/sinhto/backups/images"
IMAGES_DIR="/Users/taidoan/Desktop/sinhtoooo/sinhto/public/images/uploads"
DATE=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/images-backup-$DATE.tar.gz"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Compress and backup
tar -czf "$BACKUP_FILE" "$IMAGES_DIR"

echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "images-backup-*.tar.gz" -mtime +30 -delete

echo "[$(date)] Old backups cleaned"
