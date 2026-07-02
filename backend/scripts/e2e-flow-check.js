#!/usr/bin/env node
/**
 * End-to-end flow verification against live API (or local).
 * Usage: node backend/scripts/e2e-flow-check.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = (process.argv[2] || process.env.E2E_API_BASE || 'https://sinhto.onrender.com').replace(/\/$/, '');
const API = `${BASE}/api`;

const results = [];
let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  results.push({ status: 'OK', name, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failed++;
  results.push({ status: 'FAIL', name, detail });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, ok: res.ok };
}

async function main() {
  console.log(`\n=== E2E FLOW CHECK — ${BASE} ===\n`);
  const cleanup = { orders: [], shifts: [], customers: [], combos: [], movements: false };

  // ── 1. Products (POS menu) ──
  console.log('1. Admin menu → POS products');
  const products = await req('GET', '/products');
  if (products.ok && Array.isArray(products.data) && products.data.length >= 10) {
    ok('Products API', `${products.data.length} sản phẩm`);
  } else {
    fail('Products API', `HTTP ${products.status}`);
  }
  const smoothie = products.data?.find((p) => p.id === 'SM-01') || products.data?.[0];

  // ── 2. Inventory baseline ──
  console.log('\n2. Kho hàng');
  let inv = await req('GET', '/inventory');
  if (!inv.ok || !Array.isArray(inv.data)) {
    fail('Inventory API', `HTTP ${inv.status}`);
    return summarize();
  }
  ok('Inventory API', `${inv.data.length} nguyên liệu`);

  const movBefore = await req('GET', '/inventory/movements');
  const hadPurchase = Array.isArray(movBefore.data) && movBefore.data.some((m) => m.type === 'purchase');

  // Nhập kho đủ nguyên liệu cho 1 ly SM-01 360ml 40g + dự phòng
  const stockIn = {
    'INV-001': 50, 'INV-003': 50, 'INV-008': 50, 'INV-010': 100,
    'INV-002': 30, 'INV-004': 30, 'INV-005': 30, 'INV-006': 20,
    'INV-007': 10, 'INV-009': 20, 'INV-012': 20, 'INV-013': 10,
    'INV-014': 10, 'INV-015': 50, 'INV-016': 10, 'INV-017': 10,
    'INV-018': 10, 'INV-019': 5, 'INV-020': 5, 'INV-021': 5, 'INV-022': 10,
  };
  const items = inv.data.map((item) => ({
    id: item.id,
    currentStock: stockIn[item.id] ?? item.currentStock + 10,
  }));
  const movements = Object.entries(stockIn).map(([itemId, qty], i) => {
    const item = inv.data.find((x) => x.id === itemId);
    return {
      id: `E2E-PUR-${Date.now()}-${i}`,
      timestamp: new Date().toISOString(),
      type: 'purchase',
      itemId,
      itemName: item?.name || itemId,
      quantity: qty,
      reason: 'E2E test nhap kho',
      performedBy: 'vanan',
      cost: (item?.cost || 0) * qty,
    };
  });
  const purchase = await req('POST', '/inventory/update', { items, movements });
  if (purchase.ok && purchase.data?.success) {
    ok('Nhập kho (purchase)', `${movements.length} dòng movement`);
    cleanup.movements = true;
  } else {
    fail('Nhập kho', JSON.stringify(purchase.data));
  }

  inv = await req('GET', '/inventory');
  const dau = inv.data?.find((x) => x.id === 'INV-001');
  if (dau && dau.currentStock >= 5) ok('Tồn kho sau nhập', `Dâu: ${dau.currentStock} kg`);
  else fail('Tồn kho sau nhập', `Dâu stock: ${dau?.currentStock}`);

  const movAfter = await req('GET', '/inventory/movements');
  if (movAfter.data?.some((m) => m.type === 'purchase')) ok('Movement purchase lưu DB');
  else fail('Movement purchase', 'không thấy');

  // ── 3. POS order + stock deduct ──
  console.log('\n3. POS bán hàng + trừ kho');
  const orderId = `E2E-ORD-${Date.now()}`;
  cleanup.orders.push(orderId);
  const orderBody = {
    id: orderId,
    branchId: 'CN1',
    source: 'counter',
    items: [{
      productId: smoothie?.id || 'SM-01',
      productName: smoothie?.name || 'Dau hat chia',
      name: smoothie?.name || 'Dau hat chia',
      size: '360ml',
      protein: 40,
      toppings: [],
      quantity: 1,
      price: 59000,
    }],
    status: 'preparing',
    total: 59000,
    staff: 'E2E Test POS',
    paidAt: new Date().toISOString(),
    stockDeducted: true,
  };
  const orderRes = await req('POST', '/orders', orderBody);
  if (orderRes.status === 201) ok('Tạo đơn POS', orderId);
  else fail('Tạo đơn POS', JSON.stringify(orderRes.data));

  const orders = await req('GET', '/orders');
  const saved = orders.data?.find((o) => o.id === orderId);
  if (saved) ok('Đơn lưu DB', `status=${saved.status}, total=${saved.total}`);
  else fail('Đơn lưu DB', 'không tìm thấy');

  // Simulate stock deduction (as POS client does)
  const dauBefore = dau.currentStock;
  const saleQty = 0.12; // SM-01 base fruit
  const dauAfterStock = dauBefore - saleQty;
  await req('POST', '/inventory/update', {
    items: [{ id: 'INV-001', currentStock: dauAfterStock }],
    movements: [{
      id: `E2E-SALE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'sale',
      orderId,
      itemId: 'INV-001',
      itemName: 'Dau tay',
      quantity: -saleQty,
      reason: `Ban hang - ${orderId}`,
      performedBy: 'E2E Test',
      cost: 0,
    }],
  });
  inv = await req('GET', '/inventory');
  const dauAfter = inv.data?.find((x) => x.id === 'INV-001');
  if (dauAfter && dauAfter.currentStock < dauBefore) {
    ok('Trừ kho sau bán', `${dauBefore} → ${dauAfter.currentStock} kg`);
  } else {
    fail('Trừ kho sau bán', `${dauBefore} → ${dauAfter?.currentStock}`);
  }

  // ── 4. Shift schedule + check-in ──
  console.log('\n4. Xếp lịch + check-in nhân viên');
  const emps = await req('GET', '/employees');
  const cashier = emps.data?.find((e) => e.username === 'thibinh') || emps.data?.[0];
  if (!cashier) { fail('Employees', 'không có NV'); return summarize(); }
  ok('Employees API', cashier.fullName);

  const today = new Date().toISOString().split('T')[0];
  const shiftId = `E2E-SHIFT-${Date.now()}`;
  cleanup.shifts.push(shiftId);
  const shiftRes = await req('POST', '/shifts', {
    id: shiftId,
    employeeId: cashier.id,
    employeeName: cashier.fullName,
    branch: cashier.branch || 'CN1',
    date: today,
    shiftType: 'morning',
    startTime: '06:00',
    endTime: '14:00',
    status: 'scheduled',
    requestedBy: 'admin',
  });
  if (shiftRes.status === 201) ok('Admin xếp ca', shiftId);
  else fail('Admin xếp ca', JSON.stringify(shiftRes.data));

  const shifts = await req('GET', `/shifts?employeeId=${cashier.id}&date=${today}`);
  if (shifts.data?.some((s) => s.id === shiftId)) ok('Ca lưu DB');
  else fail('Ca lưu DB');

  const checkIn = await req('PATCH', `/shifts/${shiftId}/checkin`, {
    action: 'in',
    photo: '/images/uploads/e2e-test.jpg',
  });
  if (checkIn.ok && checkIn.data?.checkIn) ok('Check-in NV', new Date(checkIn.data.checkIn).toLocaleTimeString('vi-VN'));
  else fail('Check-in NV', JSON.stringify(checkIn.data));

  const posShifts = await req('GET', `/shifts?branch=CN1&date=${today}`);
  if (posShifts.data?.some((s) => s.id === shiftId && s.checkIn)) ok('POS thấy ca đang làm (CN1)');
  else fail('POS thấy ca', 'không có checkIn');

  // Employee request + admin approve
  const pendingId = `E2E-PEND-${Date.now()}`;
  cleanup.shifts.push(pendingId);
  await req('POST', '/shifts', {
    id: pendingId,
    employeeId: cashier.id,
    employeeName: cashier.fullName,
    branch: 'CN1',
    date: today,
    shiftType: 'afternoon',
    startTime: '14:00',
    endTime: '22:00',
    status: 'pending',
    requestedBy: 'employee',
  });
  const approve = await req('PUT', `/shifts/${pendingId}`, {
    id: pendingId,
    employeeId: cashier.id,
    employeeName: cashier.fullName,
    branch: 'CN1',
    date: today,
    shiftType: 'afternoon',
    startTime: '14:00',
    endTime: '22:00',
    status: 'scheduled',
    requestedBy: 'employee',
  });
  if (approve.ok && approve.data?.status === 'scheduled') ok('Admin duyệt ca NV xin');
  else fail('Admin duyệt ca', JSON.stringify(approve.data));

  // ── 5. Loyalty ──
  console.log('\n5. Tích điểm loyalty');
  const custId = `E2E-CUST-${Date.now()}`;
  cleanup.customers.push(custId);
  const phone = `09${String(Date.now()).slice(-8)}`;
  const custRes = await req('POST', '/customers', { id: custId, name: 'E2E Khach Test', phone, points: 0 });
  if (custRes.status === 201) ok('Đăng ký khách loyalty', phone);
  else fail('Đăng ký khách', JSON.stringify(custRes.data));

  const earn = await req('POST', `/customers/${custId}/earn`, { points: 59 });
  if (earn.ok && earn.data?.points >= 59) ok('Tích điểm', `${earn.data.points} điểm`);
  else fail('Tích điểm', JSON.stringify(earn.data));

  const lookup = await req('GET', `/customers/${phone}`);
  if (lookup.ok && lookup.data?.points >= 59) ok('Tra cứu SĐT', `${lookup.data.points} điểm`);
  else fail('Tra cứu SĐT', JSON.stringify(lookup.data));

  const redeem = await req('POST', `/customers/${custId}/redeem`, { points: 10 });
  if (redeem.ok && redeem.data?.points === 49) ok('Đổi điểm', '49 điểm còn lại');
  else fail('Đổi điểm', `points=${redeem.data?.points}`);

  // ── 6. Combo subscription ──
  console.log('\n6. Đăng ký combo');
  const comboId = `E2E-COMBO-${Date.now()}`;
  cleanup.combos.push(comboId);
  const comboRes = await req('POST', '/combo-subscriptions', {
    id: comboId,
    customerName: 'E2E Combo Khach',
    customerPhone: phone,
    planName: 'Giam can 1 tuan',
    comboType: 'weekly',
    comboDuration: 'weekly',
    startDate: new Date().toISOString(),
    nextDelivery: new Date().toISOString(),
    deliveryDays: [1, 3, 5],
    items: [{ productName: 'Dau hat chia', size: '360ml', protein: 40 }],
    totalPrice: 350000,
    status: 'active',
    branchId: 'CN1',
    staff: 'E2E Test',
  });
  if (comboRes.status === 201) ok('Đăng ký combo', comboId);
  else fail('Đăng ký combo', JSON.stringify(comboRes.data));

  const combos = await req('GET', `/combo-subscriptions?customerPhone=${phone}`);
  if (combos.data?.some((c) => c.id === comboId)) ok('Combo lưu DB', combos.data.find((c) => c.id === comboId).planName || '');
  else fail('Combo lưu DB');

  // ── Settings (menu price for POS) ──
  console.log('\n7. Cài đặt menu/giá');
  const prices = await req('GET', '/settings/menuPriceTable');
  if (prices.ok && prices.data?.['360ml']) ok('Bảng giá POS', '360ml có giá');
  else fail('Bảng giá POS', `HTTP ${prices.status}`);

  summarize();

  // Optional cleanup note
  console.log('\n(Giữ dữ liệu test E2E trên DB để bạn kiểm tra — xóa thủ công nếu cần)');
}

function summarize() {
  console.log('\n════════════════════════════════');
  console.log(`KẾT QUẢ: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
