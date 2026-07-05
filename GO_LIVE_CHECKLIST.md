# ✅ GO-LIVE CHECKLIST - FitBlend

## 📅 Pre-Launch (T-3 days)

### Database & Data
- [ ] PostgreSQL/SQLite database created & connected
- [ ] Schema initialized (all tables created)
- [ ] Master data imported:
  - [ ] At least 1 branch created
  - [ ] All products imported
  - [ ] Key employees created & assigned to branch
  - [ ] Admin account verified (vanan/123)
  
### Backend Setup
- [ ] Backend dependencies installed: `npm install`
- [ ] `.env` file configured with `DATABASE_URL`
- [ ] Backend starts without errors: `npm run backend`
- [ ] API health check passes: `curl http://localhost:5005/api/health`

### Frontend Setup
- [ ] Frontend dependencies installed: `npm install`
- [ ] Frontend builds successfully: `npm run build`
- [ ] No console errors in build output
- [ ] `dist/` folder created with ~50+ files

### Data Validation
- [ ] ✅ Can login as admin (vanan/123)
- [ ] ✅ Can view all branches
- [ ] ✅ Can view all employees
- [ ] ✅ Can view inventory products
- [ ] ✅ Stock values look correct

---

## 🎯 24 Hours Before Launch (T-1 day)

### Admin Dashboard Test
- [ ] Login to admin panel
- [ ] View Branch Overview (all branches show)
- [ ] View Employee List (all staff show)
- [ ] View Inventory (all products show)
- [ ] View Orders (should be empty or test orders)
- [ ] View Analytics (load without errors)

### POS System Test
- [ ] Can login to POS as cashier (thibinh/123)
- [ ] POS displays all products
- [ ] Can create test order
  - [ ] Select product
  - [ ] Add to cart
  - [ ] Proceed to checkout
  - [ ] Confirm payment
- [ ] After order: stock is deducted (verify in inventory)
- [ ] Order appears in order list
- [ ] Can refund order

### Inventory Management Test
- [ ] Receive stock for 3+ products
  - [ ] Open Inventory
  - [ ] Select product
  - [ ] Click "Receive Stock"
  - [ ] Enter quantity
  - [ ] Verify stock updated
- [ ] Check inventory movement log

### Shift & Attendance Test
- [ ] Create shift for employee
- [ ] Employee check-in (via Staff App)
- [ ] Employee check-out
- [ ] Verify shift data saved

### Staff App Test (if using)
- [ ] Staff can login (thibinh/123)
- [ ] Can view pending orders
- [ ] Can check-in/check-out
- [ ] Can view shift schedule

### Data Backup
- [ ] Database backed up
  - [ ] SQLite: copy `backend/database.db` → backup folder
  - [ ] PostgreSQL: export snapshot from Supabase
- [ ] Backup location documented

### Team Communication
- [ ] All staff trained on their roles:
  - [ ] Admin staff knows Admin dashboard
  - [ ] POS staff knows POS system
  - [ ] General staff knows Staff App
- [ ] Runbook/manual provided to each role
- [ ] Emergency contact list created

---

## 🚀 Launch Day (T day)

### Morning (Before Opening)

#### 8:00 AM - System Start
- [ ] Backend server started: `npm run backend`
- [ ] Frontend served on Vercel/local
- [ ] Health check passes
- [ ] No errors in logs

#### 8:15 AM - Admin Verification
- [ ] Admin can login
- [ ] All dashboards load
- [ ] Real-time SSE working (orders update live)
- [ ] Database connection OK

#### 8:30 AM - POS Setup
- [ ] All POS terminals powered on
- [ ] Network/WiFi connected
- [ ] Printer connected & tested
  - [ ] Print test receipt
- [ ] POS staff login works (2+ accounts)
- [ ] Products display correctly

#### 8:45 AM - Final Checks
- [ ] Inventory stock levels verified
- [ ] Cash register initialized
- [ ] Staff present & briefed
- [ ] Support team on standby (phone/chat)

#### 9:00 AM - OPEN
- [ ] First customer served ✨
- [ ] Monitor: order flow, payment, stock
- [ ] Take screenshot of first order

### Throughout Day

#### Every 1 Hour
- [ ] Check: server logs (no errors)
- [ ] Check: SSE working (real-time updates)
- [ ] Check: orders counting

#### Every 4 Hours
- [ ] Verify: inventory stock reasonable
- [ ] Verify: payment method working
- [ ] Check: customer complaints
- [ ] Screenshot stats for documentation

### End of Day (6:00 PM)

#### 6:00 PM - End of Day Report
- [ ] Total orders: _____ (count)
- [ ] Total revenue: _____ VNĐ
- [ ] Total customers: _____
- [ ] Stock consumed: _____ (reasonable?)
- [ ] Errors/issues: _____ (list them)

#### 6:30 PM - Data Verification
- [ ] Order count in UI = database count
- [ ] Stock in system ≈ physical stock
- [ ] All payments reconciled
- [ ] No data corruption

#### 7:00 PM - Backup & Close
- [ ] Database backup taken
- [ ] Logs archived
- [ ] All staff checked out
- [ ] POS terminals powered off
- [ ] Ready for next day ✅

---

## 📊 First Week Monitoring

### Daily (Each morning)
- [ ] 8:00 AM: Check server logs
- [ ] 8:15 AM: Verify database connection
- [ ] 8:30 AM: Quick POS test (create dummy order)
- [ ] 9:00 AM: Begin operations

### Daily (Each evening)
- [ ] 6:00 PM: Review daily metrics
  - [ ] Orders: __
  - [ ] Revenue: __
  - [ ] Errors: __
- [ ] 6:30 PM: Data integrity check
- [ ] 7:00 PM: Backup database
- [ ] Document issues in log

### Weekly (Friday evening)
- [ ] Review week's metrics
- [ ] Check system stability
- [ ] Verify backups working
- [ ] Plan optimizations

---

## 🆘 Emergency Response

### If Server Down
1. [ ] Check logs: `tail -f backend/server.log`
2. [ ] Restart backend: `npm run backend`
3. [ ] Restart frontend
4. [ ] Check database connection
5. [ ] If still down → contact support

### If Database Issue
1. [ ] Check database connection string
2. [ ] Verify credentials correct
3. [ ] Check database status (Supabase/local)
4. [ ] If data corrupted → restore from backup

### If Payment Fails
1. [ ] Retry order
2. [ ] Check payment gateway (if using)
3. [ ] Mark order as pending
4. [ ] Process manually after

### If Stock Mismatch
1. [ ] Count physical stock
2. [ ] Compare with system inventory
3. [ ] Adjust in Admin → Inventory
4. [ ] Log adjustment with reason

---

## 📝 Sign-Off Checklist

**System is LIVE and STABLE when:**

- [ ] ✅ First 24 hours: 0 critical errors
- [ ] ✅ Orders created, paid, delivered successfully
- [ ] ✅ Inventory accurately tracked
- [ ] ✅ All staff trained & confident
- [ ] ✅ Backup & recovery tested
- [ ] ✅ Customer complaints handled
- [ ] ✅ Admin can view all data

**Sign-off:**
- **Go-Live Date**: _______________
- **Admin Signature**: _______________ 
- **IT Contact**: _______________
- **Backup Contact**: _______________

---

## 📞 Support Contacts

**During Operations:**
- Admin Phone: _______________
- IT Support: _______________
- Backup Phone: _______________

**Vendors:**
- Database (Supabase): supabase.com/support
- Server (Render): render.com/support
- Frontend (Vercel): vercel.com/support

---

## 📋 Quick Commands

```bash
# Start backend
npm run backend

# Start frontend (Vite)
npm run dev

# Check health
curl http://localhost:5005/api/health

# View logs (backend)
tail -f backend/server.log

# Test API
bash TEST_API.sh

# Backup database (SQLite)
cp backend/database.db backup-$(date +%Y%m%d).db
```

---

## 🎉 Success Indicators

After 24 hours:
- ✅ Total orders: >= 10
- ✅ System uptime: >= 99%
- ✅ Errors: < 5
- ✅ Customer satisfaction: No complaints
- ✅ Data integrity: 100%

**🚀 Congratulations! You're in production!**

---

**Document Version**: 1.0
**Last Updated**: 2026-07-04
**Next Review**: After first week of operations
