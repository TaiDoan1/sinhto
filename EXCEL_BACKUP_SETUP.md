# 📊 Excel Daily Backup - Setup Guide

## Overview

Tự động xuất dữ liệu check-in/out **cuối ngày thành file Excel** cho việc review/audit.

**Chạy**: 6PM hàng ngày → Tạo file Excel với:
- 📋 Tóm tắt hôm nay (tổng check-in, số ảnh...)
- 📊 Chi tiết check-in/out của từng nhân viên
- 📈 Thống kê 7 ngày gần đây

---

## Setup (3 bước)

### 1️⃣ Install Python packages

```bash
pip install openpyxl sqlite3
```

### 2️⃣ Make script executable

```bash
chmod +x /path/to/run-daily-backup.sh
```

### 3️⃣ Add to Crontab (chạy 6PM hàng ngày)

```bash
crontab -e

# Thêm dòng:
0 18 * * * /Users/taidoan/Desktop/sinhtoooo/sinhto/run-daily-backup.sh
```

---

## Output

File Excel được lưu ở: `./backups/excel/backup_YYYYMMDD_HHMMSS.xlsx`

### Sheet 1: Tóm tắt hôm nay
```
📊 Tóm tắt 2026-07-13
- Số nhân viên check-in: 10
- Tổng shifts: 10
- Ảnh check-in: 8
- Ảnh check-out: 7

Chi tiết theo nhân viên:
[Tên NV | Mã | Check-in | Check-out | Ảnh In | Ảnh Out]
```

### Sheet 2: Check-in/out History
```
Ngày | Tên NV | Mã NV | Giờ vào | Giờ tan | Check-in | Check-out | Ảnh In | Ảnh Out | Chi nhánh
...
```

### Sheet 3: Thống kê nhân viên
```
Tên NV | Mã NV | Số ca | Check-in | Check-out | Ảnh In | Ảnh Out
Nguyen Van An | NV-001 | 7 | 7 | 6 | 6 | 5
...
```

---

## Kiểm tra

```bash
# Xem backup đã tạo
ls -lh ./backups/excel/

# Xem log
tail -f ./backups/excel/backup.log

# Chạy manual
python3 backup-excel.py
```

---

## Tùy chỉnh

### Thay đổi thời gian chạy

```bash
# Chạy 5PM thay vì 6PM
0 17 * * * /path/to/run-daily-backup.sh

# Chạy 7AM mỗi sáng
0 7 * * * /path/to/run-daily-backup.sh
```

### Gửi email backup

Bỏ comment trong `run-daily-backup.sh`:

```bash
# Gửi file Excel qua email
LATEST_BACKUP=$(ls -t $PROJECT_DIR/backups/excel/*.xlsx | head -1)
mail -s "Daily Backup - $(date +%Y-%m-%d)" admin@fitblend.com < $LATEST_BACKUP
```

### Upload to Cloud (AWS S3)

```bash
# Cài AWS CLI
brew install awscli

# Bỏ comment trong script
aws s3 cp $LATEST_BACKUP s3://fitblend-backups/
```

---

## Automation Options

### Option 1: Direct Crontab (Hiện tại)
```bash
0 18 * * * /path/to/run-daily-backup.sh
```
✅ Simple, works on any server

### Option 2: Systemd Timer (Linux)
```ini
[Unit]
Description=Daily Excel Backup
After=network.target

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 18:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Option 3: Docker Container
```dockerfile
FROM python:3.11-alpine
COPY backup-excel.py .
CMD ["python3", "backup-excel.py"]
```

```bash
docker run --rm -v /data:/data python-backup
```

---

## Cleanup

Old backups (>30 days) tự động xóa trong script.

Manual cleanup:
```bash
find ./backups/excel -name "backup_*.xlsx" -mtime +30 -delete
```

---

## Troubleshooting

### ❌ "No such file or directory"
- Check path chính xác
- Verify `backup-excel.py` exists

### ❌ "SQLite3 module not found"
- Install: `pip install openpyxl`

### ❌ "Permission denied"
- Make executable: `chmod +x run-daily-backup.sh`

### ❌ Cron không chạy
- Check crontab: `crontab -l`
- Check logs: `log show --predicate 'process == "cron"'` (macOS)
- Check path: Use absolute path, not relative

---

## Example Crontab

```bash
# FitBlend Backup
# Daily Excel backup at 6PM
0 18 * * * cd /Users/taidoan/Desktop/sinhtoooo/sinhto && python3 backup-excel.py >> backups/excel/backup.log 2>&1

# Weekly full backup to S3
0 20 * * 0 /Users/taidoan/Desktop/sinhtoooo/sinhto/run-daily-backup.sh && aws s3 sync backups/excel s3://fitblend-backups/
```

---

## Monitoring

### View recent backups
```bash
ls -lt ./backups/excel/*.xlsx | head -10
```

### Check file size growth
```bash
du -sh ./backups/excel/
```

### Test restore
```bash
# Open latest backup
open $(ls -t ./backups/excel/*.xlsx | head -1)
```

---

## Benefits

✅ **Daily audit trail** - Review check-in/out records
✅ **Photo tracking** - Know which shifts have photos
✅ **Employee stats** - See who checked in/out
✅ **Compliance** - Exportable records for audit
✅ **Easy sharing** - Send Excel to stakeholders
✅ **No code changes** - Pure data export, no app changes

---

## Next Steps

1. ✅ Setup crontab (3 mins)
2. ✅ Test manual run (1 min)
3. ✅ Wait for 6PM tomorrow to see file
4. ✅ Share Excel with team

Done! 🎉
