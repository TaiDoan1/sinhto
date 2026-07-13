# 📸 Storage Strategy - Ảnh Check-in/Out

## Current Status (Local Storage)

### Kích thước ảnh:
- **Sau nén**: 500KB/ảnh
- **Mỗi ca làm**: 2 ảnh (check-in + check-out)
- **Mỗi ngày**: 10 nhân viên × 2 ảnh = 20 ảnh = 10MB

### Dung lượng cần thiết:
```
1 chi nhánh (10 NV): 2.6GB/năm
3 chi nhánh:        8GB/năm
10 chi nhánh:       26GB/năm  ← Bắt đầu cần cloud
```

### Performance:
- ✅ Upload: 500KB nén được trong vài giây
- ✅ Xem lại: Trực tiếp từ /public/images/uploads
- ✅ Bandwidth: Chỉ cần khi xem, không stream

---

## Migration Path

### Phase 1️⃣ (Now - 6 months): LOCAL ✅
```
📁 /public/images/uploads/
   ├── checkin-1-timestamp.jpg (500KB)
   ├── checkout-1-timestamp.jpg (500KB)
   └── ...
```

**Backup Strategy:**
```bash
# Daily 2AM
0 2 * * * /path/to/backup-images.sh

# Result: backups/images/images-backup-20260715.tar.gz
```

---

### Phase 2️⃣ (6-12 months): Cloud Storage

#### **Option A: AWS S3 (CHEAPEST) - $60/năm**
```bash
# Install AWS CLI
brew install awscli

# Configure
aws configure

# Upload script
aws s3 sync /public/images/uploads/ s3://fitblend-photos/
```

**Pros:**
- ✅ $60/năm (500GB)
- ✅ Unlimited scalability
- ✅ 99.9% uptime
- ✅ CloudFront CDN

**Cons:**
- Cần config phức tạp
- Setup IAM roles

---

#### **Option B: Cloudinary (EASIEST) - $99/tháng**
```javascript
// .env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key

// Upload
const result = await cloudinary.uploader.upload(file, {
  resource_type: 'auto',
  folder: 'fitblend/checkin',
  format: 'jpg',
  quality: 'auto:good',
  width: 1024,
  height: 768,
  crop: 'fill'
});
```

**Pros:**
- ✅ Free tier 25GB/tháng
- ✅ Auto optimization
- ✅ CDN global
- ✅ Resize on-the-fly
- ✅ Easy integration

**Cons:**
- Paid sau khi vượt free tier

---

#### **Option C: Google Cloud Storage - $20/100GB**
```bash
gsutil -m cp -r /public/images/uploads/ gs://fitblend-photos/
```

**Pros:**
- ✅ Integration với Google ecosystem
- ✅ Rẻ cho large scale

**Cons:**
- Phức tạp hơn S3

---

## Implementation Checklist

### Phase 1 (Hiện tại):
- [x] Local storage implementation
- [x] Image compression (500KB)
- [ ] **Setup daily backup script** ← DO THIS NOW
- [ ] Test restore từ backup
- [ ] Document backup procedure

### Phase 2 (Khi storage > 50GB):
- [ ] Evaluate S3 vs Cloudinary
- [ ] Setup cloud storage
- [ ] Migrate existing photos
- [ ] Update upload endpoint
- [ ] Setup CDN

---

## Cost Comparison (Năm 1)

| Service | Free Tier | Paid | Recommendation |
|---------|-----------|------|---|
| **Local + Backup** | - | $0 | ✅ NOW |
| **Cloudinary** | 25GB | $99/mo | Good for 3-5 chi nhánh |
| **AWS S3** | - | $60/năm | Best for 10+ chi nhánh |
| **Google Cloud** | 5GB | $20/100GB | Complex setup |

---

## Backup Command Examples

```bash
# Daily backup (add to crontab)
0 2 * * * /path/to/backup-images.sh

# Manual backup
tar -czf images-backup-$(date +%Y%m%d).tar.gz /public/images/uploads/

# Upload to cloud
aws s3 cp images-backup-*.tar.gz s3://fitblend-backups/

# Restore
tar -xzf images-backup-20260715.tar.gz -C /public/images/
```

---

## Monitoring

```bash
# Check disk usage
du -sh /public/images/uploads/

# List by size
ls -lhS /public/images/uploads/ | head -20

# Remove old images (optional)
find /public/images/uploads -mtime +365 -delete
```

---

## Recommendation

**👉 Ngay bây giờ:**
1. Setup daily backup script (5 phút)
2. Test restore (1 lần)
3. Monitor disk usage tháng/tháng

**👉 Khi storage >50GB:**
- Evaluate Cloudinary free tier
- Setup S3 nếu >10 chi nhánh

**👉 Backup recovery test (mỗi tháng):**
```bash
# Test restore procedure
tar -xzf images-backup-latest.tar.gz -C /tmp/
# Verify files
ls -la /tmp/images/uploads/ | wc -l
```
