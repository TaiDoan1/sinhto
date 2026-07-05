# 🚀 Production Readiness Guide - FitBlend

## I. PRE-LAUNCH CHECKLIST

### 1. **Data Setup Flow** (Thứ tự thiết lập dữ liệu)

#### Phase 1: Chuẩn bị cơ sở dữ liệu
```
1. Tạo PostgreSQL database trên Supabase
   └─ Chọn region Singapore (nếu ở VN)
   └─ Lưu connection string (DATABASE_URL)

2. Chạy migration từ SQLite sang Postgres (nếu có data cũ)
   └─ npm run db:migrate
   
3. Khởi tạo schema (bảng) từ initDb.js
   └─ Tất cả tables: employees, products, orders, branches, inventory, shifts, etc.
```

#### Phase 2: Dữ liệu Master (bắt buộc nhập trước)
```
A. BRANCHES (Chi nhánh)
   - Tạo ≥1 chi nhánh chính (tối thiểu 1 để POS hoạt động)
   - Nhập địa chỉ, SĐT, tên chi nhánh
   - POST /api/branches

B. PRODUCTS (Sản phẩm)
   - Nhập tất cả sản phẩm (nguyên liệu, finished goods)
   - Chia loại: base juice, topping, combo components
   - Upload hình ảnh sản phẩm
   - POST /api/products
   
C. EMPLOYEES (Nhân viên)
   - Nhập danh sách nhân viên + tài khoản đăng nhập
   - Format: username/password chuẩn (email hoặc ID)
   - Gán vị trí: POS staff, manager, admin
   - POST /api/employees
   
D. INVENTORY (Tồn kho ban đầu)
   - Nhập stock hiện tại của từng sản phẩm
   - Theo branch nếu có nhiều chi nhánh
   - Unit: cup, liter, pack, etc.
   - POST /api/inventory
```

#### Phase 3: Cấu hình hệ thống
```
Settings (chuẩn bị sẵn các key):
- "business_name": "FitBlend" → tên hiển thị
- "business_phone": "0123456789" → SĐT chính
- "business_address": "123 Đường X, TP HCM" → địa chỉ
- "pos_print_format": "80mm" hoặc "58mm" → tùy máy in
- "loyalty_points_ratio": "1000" → 1000 VNĐ = 1 điểm
- "default_delivery_fee": "25000" → phí ship mặc định
```

---

## II. AUTHENTICATION & USER FLOW

### User Roles & Access

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN (Quản trị)                                            │
│  └─ Quản lý tất cả: branch, employee, inventory, order     │
│  └─ Xem analytics, payroll, loyalty                         │
│  └─ Login: /admin → AdminLogin → verify credentials         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  POS STAFF (Nhân viên bán hàng)                              │
│  └─ Bán hàng, quản lý order, kiểm tra stock                │
│  └─ Chỉ xem dữ liệu của chi nhánh mình                      │
│  └─ Login: /pos → PosLogin → username/password              │
│  └─ Quyền: order.create, order.checkout, inventory.view    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  STAFF (Nhân viên tổng quát)                                │
│  └─ Xem combo, combo subscriptions, pending orders           │
│  └─ Chấm công, xem lịch làm việc                            │
│  └─ Login: /staff → EmployeeLogin → username/password       │
│  └─ Quyền: order.view, shift.checkin                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER (Khách hàng)                                       │
│  └─ Mua sắm, tạo combo, thanh toán                          │
│  └─ Xem combo đã mua, loyalty points, history               │
│  └─ Không cần login, dùng phone number để track             │
│  └─ Login: optional (loyalty lookup by phone)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CSKH - Online Sales (Phục vụ khách)                        │
│  └─ Tạo order thay khách, quản lý delivery                 │
│  └─ Xem customer history, loyalty info                      │
│  └─ Login: /online-sales → OnlineSalesLogin                │
│  └─ Quyền: order.create, customer.view                     │
└─────────────────────────────────────────────────────────────┘
```

### Credential Standards

**Admin Account (tạo sẵn):**
```json
{
  "username": "admin",
  "password": "SecureAdminPass123!" (tối thiểu 12 ký tự)
}
```

**POS Accounts (ít nhất 2 tài khoản):**
```json
[
  { "username": "pos_main", "password": "POS123456!" },
  { "username": "pos_backup", "password": "POS123456!" }
]
```

**Staff Accounts:**
```json
[
  { "username": "staff_001", "password": "Staff123456!" },
  { "username": "staff_002", "password": "Staff123456!" }
]
```

---

## III. CORE BUSINESS FLOW

### A. Customer Order Flow (Khách hàng đặt hàng)

```
STEP 1: Customer browsing
  ├─ GET /api/products (lấy menu)
  ├─ GET /api/combos (lấy combo sẵn)
  └─ Display: Product grid + Combo list

STEP 2: Build order
  ├─ Select product/combo
  ├─ Choose modifiers (size, topping, protein)
  └─ Add to cart

STEP 3: Checkout
  ├─ View cart total
  ├─ Enter delivery address (nếu delivery)
  ├─ Nhập phone → check loyalty points
  └─ Select payment method (cash, card, points)

STEP 4: Payment
  ├─ POST /api/orders (create order)
  ├─ Deduct stock từ inventory (real-time)
  ├─ Calculate loyalty points earned
  └─ Confirm with order ID, receipt

STEP 5: Order status tracking
  ├─ GET /api/orders/:id
  ├─ Status: pending → confirmed → preparing → ready → completed
  └─ Real-time update via SSE /api/events
```

**Critical Checks:**
- ✅ Stock availability TRƯỚC khi confirm order
- ✅ Phone validation (Vietnamese format: 10 digits)
- ✅ Loyalty points validity check
- ✅ Delivery fee calculation

---

### B. POS Staff Flow (Nhân viên bán hàng)

```
STEP 1: Login
  ├─ POST /api/auth/employee-login
  ├─ Username: pos_main, Password: ***
  ├─ Verify: username + password match + role = "pos_staff"
  └─ Store sessionToken, branchId in localStorage

STEP 2: POS Dashboard
  ├─ GET /api/orders (chỉ order của chi nhánh)
  ├─ GET /api/inventory (stock of branch)
  └─ Display: Product grid + Order queue

STEP 3: Create order
  ├─ Manual order entry hoặc từ QR code scan
  ├─ Pick items, set price (có override option)
  ├─ Tính toán loyalty (nếu customer cũ)
  └─ Save temp order (chưa checkout)

STEP 4: Checkout
  ├─ Select payment method (cash/card/points)
  ├─ POST /api/orders (finalize order)
  ├─ Deduct stock
  ├─ Print receipt (ESC/POS command)
  └─ Order ID hiển thị để customer

STEP 5: Order fulfillment
  ├─ GET /api/orders (watch pending orders)
  ├─ Staff prepare items
  ├─ Confirm ready → POST /api/orders/:id (status: ready)
  └─ Customer pickup or delivery

STEP 6: End of day
  ├─ GET /api/orders (filter by date & branch)
  ├─ Total revenue, orders count
  ├─ Export to admin
  └─ Logout
```

**Critical Checks:**
- ✅ branchId isolation (không xem order chi nhánh khác)
- ✅ Stock deduction accuracy (by cup volume & bag size)
- ✅ Price override audit log
- ✅ Printer connectivity

---

### C. Admin Dashboard Flow (Quản trị)

```
STEP 1: Admin Login
  ├─ POST /api/auth/admin-login
  ├─ Username: admin, Password: ***
  └─ Unlock all admin features

STEP 2: Branch Overview
  ├─ GET /api/branches (list all)
  ├─ Display: branch cards with quick stats
  ├─ Orders today, revenue, stock alerts
  └─ Click → BranchDetail

STEP 3: Branch Detail
  ├─ View: employees, inventory, orders
  ├─ Edit branch info: name, address, phone
  ├─ Manage inventory per branch
  └─ Export reports

STEP 4: Inventory Management
  ├─ GET /api/inventory (all products)
  ├─ Sort by: stock level, expiry, category
  ├─ Alerts: low stock (< minStock)
  ├─ Receive stock: POST /api/inventory/update (type: "receive")
  ├─ Adjust: POST /api/inventory/update (type: "adjust")
  └─ Track movements: GET /api/inventory/movements

STEP 5: Order Management
  ├─ GET /api/orders (filter: date, branch, status)
  ├─ Refund order: POST /api/orders/:id/refund
  ├─ Void order: POST /api/orders/:id/void
  └─ Analytics: revenue by date, product, customer

STEP 6: Employee Management
  ├─ GET /api/employees
  ├─ Create/Edit employee: POST /api/employees
  ├─ Assign branch & role
  ├─ View payroll: base salary, bonus, deductions
  └─ Shift scheduling: POST /api/shifts

STEP 7: Product & Combo Management
  ├─ Manage products: name, price, image, category
  ├─ Create combos: select products + pricing
  ├─ Set menu: canonical menu sync
  └─ Version control: track changes

STEP 8: Loyalty Program
  ├─ GET /api/customers (customer list)
  ├─ View loyalty balance: points & vouchers
  ├─ Create voucher: discount %, expiry
  ├─ Redeem points: deduct from customer
  └─ Export: customer list, redemption history
```

---

### D. Attendance & HR Flow (Chấm công)

```
STEP 1: Staff Check-in
  ├─ Staff app → Attendance module
  ├─ Click "Check-in"
  ├─ Camera capture → photo
  ├─ POST /api/shifts/:id/checkin (with photo URL)
  └─ Record timestamp

STEP 2: Check-out
  ├─ End of day
  ├─ Staff app → "Check-out"
  ├─ Camera capture → photo
  ├─ POST /api/shifts/:id/checkout (with photo URL)
  └─ Calculate hours worked

STEP 3: Admin review
  ├─ GET /api/shifts (filter by date, employee)
  ├─ View check-in/out photos
  ├─ Approve or flag discrepancies
  └─ Calculate payroll: base + bonus - deductions

STEP 4: Payroll
  ├─ Generate: aggregate shift data → salary
  ├─ Apply rules: overtime, bonus, leaves
  ├─ Export: salary slip per employee
  └─ Payment: mark as paid
```

---

## IV. DEPLOYMENT FLOW

### Pre-Deployment Checklist

```
[ ] Database
    [ ] PostgreSQL created on Supabase
    [ ] Connection string in .env
    [ ] Tables initialized (run migrations)
    [ ] Master data loaded (branches, products, employees)
    [ ] Backup taken

[ ] Backend
    [ ] Environment variables set
        - DATABASE_URL ✓
        - NODE_ENV = "production"
        - PORT = 5000
    [ ] API tested locally (npm run backend)
    [ ] All endpoints responding
    [ ] CORS configured for frontend domain
    [ ] Image upload storage configured

[ ] Frontend
    [ ] API endpoint updated (vercel.json)
    [ ] Environment variables set
    [ ] Build succeeds (npm run build)
    [ ] Tests passing (if any)
    [ ] No console errors

[ ] Deployment
    [ ] Push all code to GitHub
    [ ] Create Render service (backend)
    [ ] Create Vercel project (frontend)
    [ ] Configure environment variables
```

### Deployment Steps

**1. Render (Backend API)**
```bash
# Create new Web Service on render.com
Name: fitblend-api
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
Instance Type: Free (or Starter for production)

# Environment Variables
DATABASE_URL=postgresql://...
NODE_ENV=production
CORS_ORIGIN=https://yourfitblend.vercel.app
```

**2. Vercel (Frontend)**
```bash
# Update vercel.json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://fitblend-api.onrender.com/api/:path*"
    }
  ]
}

# Deploy on vercel.com
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

**3. Verify Deployment**
```bash
# Health check backend
curl https://fitblend-api.onrender.com/api/health

# Test frontend
Visit: https://yourfitblend.vercel.app/customer
Login as admin: /admin (username: admin, password: ***)
```

---

## V. OPERATIONAL FLOW (Hàng ngày)

### Morning Checklist (8:00 AM)
```
1. Backend/Database
   └─ Check: Render logs, database status
   
2. Stock verification
   └─ GET /api/inventory
   └─ Compare with physical count
   └─ Alert if discrepancies
   
3. POS Setup
   └─ Login test: pos_main account
   └─ Printer test: print dummy receipt
   └─ Inventory sync: branch stock updated
   
4. Staff Check
   └─ All staff logged in
   └─ Attendance camera working
   └─ Network connectivity OK
```

### Throughout Day
```
1. Monitor Orders
   └─ GET /api/orders (real-time via SSE)
   └─ Alert: high order volume
   └─ Alert: payment failures
   
2. Stock Management
   └─ Deduct stock on each order (automatic)
   └─ Alert: low stock products
   └─ Receive new stock as needed
   
3. Customer Service
   └─ Monitor: customer complaints (CSKH module)
   └─ Refund/replace requests
   └─ Loyalty redemptions
```

### Evening Checklist (6:00 PM)
```
1. End of Day Report
   └─ Total orders today: count & revenue
   └─ Top products sold
   └─ Payment breakdown
   └─ Stock consumption
   
2. Data Reconciliation
   └─ POS orders count = actual sales
   └─ Stock in system = physical count
   └─ Cash register = expected
   
3. Backup
   └─ Export orders data
   └─ Backup database (Supabase auto-backup)
   └─ Archive logs
   
4. Close Shift
   └─ All staff check-out
   └─ Finalize payroll for the day
   └─ Reset POS for next day
```

---

## VI. CRITICAL DATA FLOWS

### Stock Management Flow

```
FLOW 1: Receive Stock (Nhận hàng)
├─ Admin selects: product, branch, quantity, cost
├─ POST /api/inventory/update (type: "receive")
├─ Create inventory_movement record
└─ Update currentStock

FLOW 2: Deduct Stock on Sale (Trừ hàng khi bán)
├─ Order placed
├─ For each item:
│  ├─ Calculate quantity by cup volume & bag size
│  ├─ Check: currentStock >= quantity
│  ├─ Deduct from inventory
│  └─ Create movement record
└─ If stock < 0 → CANCEL ORDER

FLOW 3: Manual Adjustment (Điều chỉnh hàng)
├─ Reason: damaged, expiry, loss, theft
├─ Admin inputs: product, quantity, reason
├─ POST /api/inventory/update (type: "adjust")
└─ Track in movements with "performedBy"

FLOW 4: Alert System (Cảnh báo)
├─ Watch: currentStock < minStock
├─ Trigger alert in admin dashboard
├─ Email notification to manager
└─ Suggest reorder quantity
```

### Loyalty Program Flow

```
FLOW 1: Earn Points (Tích điểm)
├─ Order completed
├─ Identify customer by phone number
├─ Calculate points: totalPrice / loyalty_points_ratio
├─ POST /api/customers/:phone/earn
├─ Add points to loyalty_balance

FLOW 2: Redeem Points (Sử dụng điểm)
├─ Customer selects: point redemption or voucher
├─ Check: available balance >= redemption amount
├─ Discount applied at checkout
├─ POST /api/customers/:phone/redeem
├─ Deduct points

FLOW 3: Voucher Management (Quản lý voucher)
├─ Admin creates: discount %, expiry date
├─ Customer redeems: enter voucher code
├─ Validate: code exists, expiry not passed, usage < limit
├─ Apply discount to order
└─ Mark as used
```

---

## VII. ERROR HANDLING & RECOVERY

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Stock deduction fails** | Database unavailable | Retry queue, queue to process later |
| **Payment incomplete** | Network timeout | Save order as "pending", retry payment |
| **Printer offline** | USB/network disconnection | Re-queue print job, show on screen |
| **Inventory mismatch** | Manual adjustment not recorded | Force resync: audit & correct in DB |
| **SSE not updating** | Connection lost | Refresh page, manual poll |
| **Backend slow** | High load | Scale Render instance, optimize queries |
| **Image upload fails** | Storage full | Setup Supabase Storage, cleanup old files |

### Backup & Recovery

```
Daily Backups:
- Time: 2:00 AM (off-peak)
- Database: Supabase auto-backup + manual export
- Files: S3 or Supabase Storage
- Retention: 30 days

Recovery Procedure:
1. Identify issue & time
2. Backup current state (for forensics)
3. Restore from backup
4. Verify data integrity
5. Notify affected users
6. Resume operations
```

---

## VIII. SCALABILITY & PERFORMANCE

### Before Launch
```
- [ ] Load test: simulate 100 concurrent users
- [ ] API response time: < 500ms for most endpoints
- [ ] Database query optimization (add indexes)
- [ ] Cache strategy: menu products (rarely change)
- [ ] Image optimization: compress images
```

### Monitoring
```
Setup alerts for:
- API error rate > 1%
- Response time > 1 second
- Database connection pool exhausted
- Disk space < 10%
- Unhandled exceptions
```

### Upgrade Path (when needed)
```
Free → Starter (~$7-15/month):
├─ Render: Free → Starter
├─ Supabase: Free → Pro (~$25/month)
└─ Result: No sleep on idle, better performance

Then → Production ($50-100/month):
├─ Render: Starter → Standard
├─ Supabase: Pro → Team
├─ CDN for static assets
└─ Result: High availability, SLA
```

---

## IX. TESTING BEFORE GO-LIVE

### User Acceptance Testing (UAT)

**POS Testing:**
```
[ ] Login with valid credentials
[ ] Login with invalid credentials (should fail)
[ ] Create order with all product types
[ ] Payment: cash, card, points
[ ] Refund order
[ ] Check stock deduction
[ ] Print receipt
[ ] Logout
[ ] Multi-concurrent orders (2+ POS at once)
```

**Admin Testing:**
```
[ ] Dashboard loads all stats correctly
[ ] Create new branch
[ ] Update inventory
[ ] View all orders (filter by date, status)
[ ] Create employee account
[ ] Process payroll
[ ] Export reports (orders, inventory)
```

**Customer Testing:**
```
[ ] Browse products
[ ] Build custom combo
[ ] Add to cart
[ ] Checkout (with phone for loyalty)
[ ] View order status (SSE updates)
[ ] Loyalty points earned
```

**Integration Testing:**
```
[ ] Order → Stock deduction → Inventory updated
[ ] Payment success → Email receipt (if integrated)
[ ] Shift check-in → Photo saved → Attendance recorded
[ ] Combo delivery → Status flow: pending → ready → delivered
```

---

## X. LAUNCH DAY CHECKLIST

```
✅ PREPARATION (T-1 day)
   [ ] All data imported (employees, products, branches)
   [ ] All staff trained (POS, attendance, order flow)
   [ ] Backup taken
   [ ] Rollback plan documented

✅ MORNING (T day)
   [ ] Backend/frontend up & running
   [ ] Health checks passed
   [ ] POS login working
   [ ] Admin dashboard accessible
   [ ] Network/printer tested
   [ ] Staff briefing completed

✅ OPENING (First 2 hours)
   [ ] Monitor: order flow, payment, stock
   [ ] Support team on standby
   [ ] Screenshot order #1, share with team 🎉

✅ FIRST DAY
   [ ] Track: total orders, revenue, issues
   [ ] Attend to customer issues immediately
   [ ] Document: any failures or bugs
   [ ] Backup data at EOD

✅ FIRST WEEK
   [ ] Daily monitoring & optimization
   [ ] Staff feedback collection
   [ ] Performance tuning
   [ ] Bug fixes if any
```

---

## XI. QUICK REFERENCE - API URLs

```
PRODUCTION URLs:
Backend API: https://fitblend-api.onrender.com
Frontend: https://yourfitblend.vercel.app

KEY ENDPOINTS:
GET  /api/health                        → Health check
POST /api/auth/employee-login           → Staff login
POST /api/auth/admin-login              → Admin login
GET  /api/products                      → Get menu
GET  /api/orders                        → List orders
POST /api/orders                        → Create order
GET  /api/inventory                     → Stock levels
POST /api/inventory/update              → Adjust stock
GET  /api/branches                      → List branches
POST /api/employees                     → Add employee
POST /api/shifts                        → Create shift
GET  /api/customers/:phone              → Customer info
POST /api/customers/:phone/earn         → Add loyalty points
```

---

## XII. SUPPORT & MAINTENANCE CONTACTS

```
Emergency Contacts:
- Database Issue: Supabase Support
- Server Down: Render Status
- Frontend Issue: Vercel Logs
- Code Bug: Development Team

Regular Maintenance Schedule:
- Weekly: Database cleanup (old logs)
- Monthly: Security updates
- Quarterly: Performance review, backup test
- Yearly: Capacity planning, system upgrade
```

---

**Document Version**: 1.0
**Last Updated**: 2024-07-04
**Status**: Ready for Production Launch
