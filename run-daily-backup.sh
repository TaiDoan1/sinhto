#!/bin/bash

# Daily Excel backup script
# Chạy: 0 18 * * * /path/to/run-daily-backup.sh (6PM hàng ngày)

PROJECT_DIR="/Users/taidoan/Desktop/sinhtoooo/sinhto"
BACKUP_SCRIPT="$PROJECT_DIR/backup-excel.py"
LOG_FILE="$PROJECT_DIR/backups/excel/backup.log"

mkdir -p "$PROJECT_DIR/backups/excel"

echo "========================================" >> $LOG_FILE
echo "Backup started: $(date)" >> $LOG_FILE
echo "========================================" >> $LOG_FILE

# Run Python backup
python3 $BACKUP_SCRIPT >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully" >> $LOG_FILE

    # Optional: Send email with backup file
    # LATEST_BACKUP=$(ls -t $PROJECT_DIR/backups/excel/*.xlsx | head -1)
    # mail -s "Daily Backup - $(date +%Y-%m-%d)" admin@fitblend.com < /dev/null

    # Optional: Upload to cloud
    # aws s3 cp $LATEST_BACKUP s3://fitblend-backups/

else
    echo "❌ Backup failed!" >> $LOG_FILE
    # Send error notification
    # echo "Backup failed at $(date)" | mail -s "ERROR: Backup Failed" admin@fitblend.com
fi

# Cleanup old backups (keep last 30 days)
find $PROJECT_DIR/backups/excel -name "backup_*.xlsx" -mtime +30 -delete

echo "Backup finished: $(date)" >> $LOG_FILE
