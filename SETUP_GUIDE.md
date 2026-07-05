# 🚀 SETUP GUIDE - FitBlend Production Ready

## 📋 Tóm tắt công việc cần làm

Để web hoạt động ổn định, bạn cần làm theo đúng thứ tự này:

```
Step 1: Admin Account Setup ✅ (DONE - sẵn sàng)
        ↓
Step 2: Create Branches → 1-2 chi nhánh chính
        ↓
Step 3: Create/Configure Employees → gán vào chi nhánh
        ↓
Step 4: Create Shifts → nhân viên vào lịch làm
        ↓
Step 5: Configure Inventory → nhập stock ban đầu
        ↓
Step 6: POS Setup & Testing → test bán hàng
        ↓
Step 7: Go Live!
```

---

## ✅ STEP 1: Admin Account (Sẵn sàng - không cần setup)

Admin account đã được tạo sẵn:

```
Username: vanan
Password: 123
Position: manager
```

**Hành động**: 
1. Vào `/admin`
2. Login bằng tài khoản trên
3. Bạn sẽ thấy Admin Dashboard

---

## 2️⃣ STEP 2: Create Branches (Chi nhánh)

### Cách 1: Dùng Admin UI (Khuyên dùng)
```
1. Login Admin → /admin
2. Click "Branch Overview" (mặc định)
3. Click "Create New Branch"
4. Nhập:
   - Tên: "Chi nhánh chính" hoặc "TP.HCM"
   - Địa chỉ: (tùy cửa hàng)
   - SĐT: 0901234567
5. Click "Create"
```

### Cách 2: API (Nếu muốn script)
```bash
curl -X POST http://localhost:5005/api/branches \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chi nhánh chính",
    "address": "123 Đường A, Quận 1",
    "phone": "0901234567"
  }'
```

**Kết quả**: 
- Branch được lưu vào database
- ID: `CN4`, `CN5`, etc. (auto-generated)

---

## 3️⃣ STEP 3: Configure Employees

### Employees hiện có (sample data)
Có 14 nhân viên sample sẵn:

| Username | Tên | Position | Chi nhánh |
|----------|-----|----------|----------|
| `vanan` | Nguyễn Văn An | **manager** | CN1 |
| `thibinh` | Trần Thị Bình | cashier | CN1 |
| `minhcuong` | Lê Minh Cường | bartender | CN2 |
| `thudung` | Phạm Thu Dung | bartender | CN1 |
| `quochung` | Hoàng Quốc Hùng | **manager** | CN2 |
| (và 8 nhân viên khác...) | | | |

**Tất cả password**: `123`

### Thêm nhân viên mới

**Cách 1: Admin UI**
```
1. Admin → "Employee Management"
2. Click "Add Employee"
3. Nhập:
   - Tên: Trần Văn A
   - ID: NV-001
   - Email: (optional)
   - SĐT: 0901234567
   - Chức vụ: bartender, cashier, manager, server, cleaner
   - Chi nhánh: CN1 (chọn)
   - Lương cơ bản: 8,000,000 VNĐ
   - Username: trananew
   - Password: ❗ GHI NHỚ password!
4. Click "Create"
```

**Cách 2: API**
```bash
curl -X POST http://localhost:5005/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Trần Văn A",
    "username": "trananew",
    "password": "123456",
    "position": "cashier",
    "branch": "CN1",
    "baseSalary": 8000000,
    "phone": "0901234567"
  }'
```

---

## 4️⃣ STEP 4: Create Shifts (Lịch làm việc)

**Mục đích**: Ghi nhận nhân viên vào ca làm, chấm công (check-in/check-out)

### Cách 1: Admin UI
```
1. Admin → "Shift Schedule"
2. Click "Create Shift"
3. Nhập:
   - Nhân viên: (select)
   - Ngày: 2024-07-05
   - Ca làm: Morning (8:00 - 17:00)
   - Trạng thái: scheduled
4. Click "Create"
```

### Cách 2: API
```bash
curl -X POST http://localhost:5005/api/shifts \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "1",
    "employeeName": "Nguyễn Văn An",
    "date": "2024-07-05",
    "shiftType": "morning",
    "startTime": "08:00",
    "endTime": "17:00",
    "branch": "CN1"
  }'
```

**Kết quả**: 
- Shift được tạo, status = "scheduled"
- Nhân viên có thể check-in/check-out
- Chấm công được lưu

---

## 5️⃣ STEP 5: Configure Inventory (Nhập stock)

### Inventory products hiện có
Có ~25 sản phẩm sample:
- Fruit: Dâu tây, Xoài, Chuối, ...
- Dairy: Sữa tươi, Sữa chua, ...
- Protein: Whey, Collagen, ...
- Toppings: Mật ong, Hạt chia, ...

**Tất cả stock = 0 ban đầu** (cần nhập hàng)

### Nhập stock lần đầu

**Cách 1: Admin UI**
```
1. Admin → "Inventory"
2. Chọn sản phẩm (e.g., "Dâu tây")
3. Click "Receive Stock"
4. Nhập:
   - Số lượng: 10 (kg)
   - Giá: 80,000 VNĐ/kg
5. Click "Confirm"
```

**Kết quả**: 
- currentStock = 10 kg
- Tạo inventory_movement record
- Sản phẩm sẵn sàng bán

### API - Receive Stock
```bash
curl -X POST http://localhost:5005/api/inventory/update \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "INV-001",
    "type": "receive",
    "quantity": 10,
    "reason": "Purchase",
    "performedBy": "admin"
  }'
```

**Lưu ý**: 
- Luôn nhập stock trước khi bán
- Stock auto-deduct khi có đơn hàng
- Alert nếu stock < minStock

---

## 6️⃣ STEP 6: POS Setup & Testing

### POS Login
```
1. Vào /pos
2. Login bằng nhân viên POS:
   - Username: vanan hoặc thibinh
   - Password: 123
3. Chọn chi nhánh: CN1
```

### Test Order Flow (Tạo đơn hàng)

**Từ POS**:
```
1. Dashboard → Product Grid
2. Chọn sản phẩm (e.g., "Dâu tây - Smoothie")
3. Add to cart
4. Checkout:
   - Payment Method: Cash / Card
   - Khách hàng phone: (optional - để tích điểm)
5. Click "Finalize Order"
```

**Kết quả**:
- ✅ Order tạo, status = "pending"
- ✅ Stock tự động trừ
- ✅ In hóa đơn (nếu có printer)
- ✅ SSE broadcast order → admin/staff

### Test Checklist
```
[ ] Login POS với 2+ accounts
[ ] Tạo order với các loại sản phẩm khác nhau
[ ] Check stock deduction (Admin → Inventory)
[ ] Test payment methods
[ ] Test refund order
[ ] Verify order in database
```

---

## 7️⃣ STEP 7: Data Persistence & Backup

### Database Mode
- **Local Dev**: SQLite (auto-sync)
- **Production**: PostgreSQL (Supabase)

### Local SQLite (Development)
```bash
# Data lưu tại: backend/database.db
# Auto-backup khi restart

# Backup manual:
cp backend/database.db backup-$(date +%Y%m%d-%H%M%S).db
```

### Production PostgreSQL (Supabase)
```
1. Setup .env:
   DATABASE_URL=postgresql://user:pass@host/db
   
2. Backend sẽ auto-migrate & persist
3. Backup tự động (Supabase)
```

---

## 📊 Quick Reference - Default Accounts

### Admin
```
Username: vanan
Password: 123
Role: manager
```

### POS Staff (for testing)
```
Username: thibinh
Password: 123
Position: cashier
Branch: CN1
```

### All Sample Employees
```
All have password: 123
Usernames: vanan, thibinh, minhcuong, thudung, quochung, thikim, vanlong, thimai, minhnam, thioanh, vanphuc, thiquynh, thilan, vanhieu
```

---

## 🔧 Troubleshooting

### Issue: Không login được Admin
**Giải pháp**:
- Check username/password: `vanan` / `123`
- Employee position phải là "manager"
- Database có sẵn dữ liệu không?
  ```bash
  # Debug: Check if employee exists
  curl http://localhost:5005/api/employees | grep vanan
  ```

### Issue: Branch không lưu
**Giải pháp**:
- Database connected? → `curl /api/health`
- Kiểm tra API response: có error không?
  ```bash
  curl -i -X POST http://localhost:5005/api/branches \
    -H "Content-Type: application/json" \
    -d '{"name":"Test"}'
  ```

### Issue: Stock không trừ khi tạo order
**Giải pháp**:
- Product ID có đúng không?
- Stock có đủ không? (check inventory)
- Order create success? (check /api/orders)

### Issue: POS chậm / lag
**Giải pháp**:
- Check server logs: `tail -f backend/server.log`
- Kill & restart backend
- Database connection pool đủ không?

---

## 📝 Setup Workflow Summary

```
PHASE 1: INITIALIZATION (Day 1)
├─ Login Admin ✅
├─ Create 1-2 branches
├─ Configure 5-10 key employees
└─ Set employee passwords

PHASE 2: INVENTORY (Day 1-2)
├─ Receive initial stock for all products
├─ Set minStock thresholds
└─ Verify inventory totals

PHASE 3: TESTING (Day 2-3)
├─ Test POS order flow
├─ Test multiple concurrent POS sessions
├─ Test inventory deduction
├─ Test payment methods
└─ Test refund/void

PHASE 4: SOFT LAUNCH (Day 3-4)
├─ Limited staff training
├─ Monitor orders in real-time
├─ Check data persistence
└─ Fix any critical bugs

PHASE 5: FULL LAUNCH (Day 5+)
├─ All staff trained
├─ All branches operational
├─ Shift scheduling active
├─ Backup schedule active
└─ Monitor 24/7
```

---

## 🎯 Success Metrics

You're ready for production when:

- ✅ Admin can login & access all features
- ✅ Create branch & see in database
- ✅ Add employee & can login as them
- ✅ Create shift & track attendance
- ✅ Inventory stock received & deducted correctly
- ✅ POS order flow works end-to-end
- ✅ Data persists after server restart
- ✅ No console errors or warnings
- ✅ SSE real-time updates working
- ✅ Backup & recovery tested

---

**🚀 Once above is done → Ready to Go Live!**
