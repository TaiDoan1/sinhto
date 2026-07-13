# 📸 Tính Năng Chụp Ảnh Check-in/Check-out Nhân Viên

## ✅ Tổng Quan Tính Năng

Tính năng này cho phép nhân viên **chụp ảnh khuôn mặt** khi **check-in** và **check-out** để xác thực danh tính và lưu bằng chứng tham gia làm việc.

## 🎯 Chức Năng Chính

### 1. **Chụp Ảnh Camera**
- Mở camera trực tiếp từ trình duyệt (sử dụng Web API `getUserMedia`)
- Có gợi ý khung hình để giúp nhân viên đặt khuôn mặt vào đúng vị trí
- Tự động xử lý và nén ảnh (giảm kích thước xuống 0.5MB)

### 2. **Preview Ảnh Trước Xác Nhận**
- Hiển thị xem trước ảnh vừa chụp
- Cho phép **Chụp Lại** nếu ảnh không tốt
- Cho phép **Xác Nhận** để upload lên server

### 3. **Lưu Trữ Ảnh**
- Ảnh được upload lên server
- Lưu URL trong database (field `checkInPhoto` / `checkOutPhoto`)
- Ảnh được lưu tại `/public/images/uploads/`

### 4. **Xem Lịch Sử Chấm Công Với Ảnh**
- Hiển thị ảnh trong lịch sử chấm công gần đây
- Click vào ảnh để xem full size
- Tính năng tải xuống ảnh

## 📁 Các File Thay Đổi

### Frontend Components

#### 1. **`src/app/components/staff/AttendanceCamera.tsx`** (Enhanced)
```typescript
// Cải tiến:
- Thêm preview ảnh sau khi chụp
- Nút "Chụp lại" để retake
- Nút "Xác nhận" để upload
- Hiển thị kích thước ảnh và timestamp
- Nén ảnh tự động với browser-image-compression
```

#### 2. **`src/app/components/staff/EmployeePortal.tsx`** (Updated)
```typescript
// Cập nhật:
- Thêm hiển thị ảnh check-in/check-out hôm nay
- Cải tiến lịch sử chấm công để show ảnh
- Tích hợp ImageViewer modal
- Click ảnh để xem full size
```

#### 3. **`src/app/components/staff/ImageViewer.tsx`** (New)
```typescript
// Component mới:
- Modal xem ảnh full size
- Nút tải xuống ảnh
- Hiển thị thông tin timestamp
```

### Backend (Unchanged - Already Supports)
- ✅ `/api/upload` - Upload ảnh
- ✅ `/api/shifts/:id/checkin` - Lưu ảnh vào database (PATCH)
- ✅ Database fields: `checkInPhoto`, `checkOutPhoto`

### Dependencies
- ✅ `browser-image-compression` - Nén ảnh trước upload (newly added)

## 🚀 Cách Sử Dụng

### Nhân Viên Chấm Công

1. **Vào màn hình "Chấm Công"**
   - Click tab "Chấm Công" ở bottom navigation

2. **Check-in**
   - Nếu chưa check-in, click nút "Check-in" 🟢
   - Camera sẽ mở
   - Đặt khuôn mặt vào khung hình
   - Click "Chụp ảnh"
   - Xem preview
   - Click "Xác nhận" để hoàn thành

3. **Check-out**
   - Khi đã check-in, nút "Check-out" sẽ sáng
   - Lặp lại quy trình tương tự

4. **Xem Ảnh**
   - Ảnh check-in/out hôm nay sẽ hiển thị bên dưới thời gian
   - Lịch sử chấm công gần đây sẽ show thumbnail ảnh
   - Click ảnh để xem full size + tải xuống

## 🔧 Cách Phát Triển Thêm

### Nâng Cấp Tương Lai
1. **Facial Recognition** - Phát hiện khuôn mặt tự động
2. **Geolocation** - Ghi lại vị trí GPS khi check-in
3. **Biometric Integration** - Tích hợp vân tay/khuôn mặt
4. **Photo Quality Check** - Cảnh báo nếu ảnh mờ/không rõ
5. **Liveness Detection** - Kiểm tra ảnh có phải người thực
6. **Admin Dashboard** - Xem ảnh tất cả nhân viên trên dashboard

### Cấu Hình Nén Ảnh
```typescript
// File: AttendanceCamera.tsx
const options = {
  maxSizeMB: 0.5,           // Tối đa 0.5MB
  maxWidthOrHeight: 1024,   // Tối đa 1024px
  useWebWorker: true        // Xử lý async
};
```

## 📊 Database Schema

```sql
CREATE TABLE shifts (
  ...
  checkInPhoto TEXT DEFAULT '',      -- URL ảnh check-in
  checkOutPhoto TEXT DEFAULT '',     -- URL ảnh check-out
  ...
);
```

## 🧪 Test Cases

- ✅ Chụp ảnh check-in
- ✅ Chụp ảnh check-out
- ✅ Retake ảnh
- ✅ Xem preview ảnh
- ✅ Download ảnh
- ✅ Xem lịch sử ảnh
- ✅ Resize/nén ảnh tự động
- ✅ Responsive trên mobile

## 📱 Responsive Design

- ✅ Desktop (1280px+)
- ✅ Tablet (768px)
- ✅ Mobile (375px) - **Primary Use Case**

## 🔒 Security & Privacy

- Ảnh chỉ được lưu trên server
- Không gửi ảnh đến bên thứ 3 (ngoại trừ được config)
- HTTPS recommended khi deploy
- Camera permission managed by browser

## 📈 Performance

- Image compression giảm kích thước ~80% (5MB → 0.5MB)
- Lazy loading lịch sử ảnh
- WebWorker untuk nén không block UI
- Canvas API cho efficient image processing

## 🐛 Known Issues & Workarounds

- **Safari** - Cần HTTPS để dùng camera
- **Older browsers** - Fallback file upload
- **Low internet** - Nén giúp upload nhanh hơn

## 📝 Commit History

- Enhanced `AttendanceCamera` component với preview & retake
- Added `ImageViewer` component
- Updated `EmployeePortal` để show ảnh check-in/out
- Installed `browser-image-compression` dependency
