// Force IPv4 to prevent Supabase IPv6 timeout
require('dns').setDefaultResultOrder('ipv4first');

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { removeDiacritics, deepConvert, convertMaybeJson } = require('./vietnamese');
const { hashPassword, verifyPassword, isHashed } = require('./password');
const { initDatabase, getPool, isPostgres } = require('./db');
const { registerOnlineSalesRoutes, logSalesActivity } = require('./onlineSalesApi');
const { registerComboDeliveryRoutes, afterComboClaimed, generateDeliveryLogsForCombo } = require('./comboDeliveryApi');
const { registerCskhRoutes } = require('./cskhApi');
const {
  initBranchInventory,
  getInventoryForBranch,
  getMovementsForBranch,
  applyBranchInventoryUpdate,
  seedBranchRowsForItem,
  seedBranchInventoryForBranch,
} = require('./branchInventory');
const { normalizeBranch, nextBranchId, parseBranchRow, DEFAULT_BRANCHES } = require('./branches');
const { normalizePhoneVN, phonesMatch } = require('./phoneUtils');
const registerBackupRoutes = require('./backup-api');

const app = express();
const PORT = process.env.PORT || 5005;
let db;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Mọi ảnh — public/images/ (upload con: public/images/uploads/)
const imagesDir = path.join(__dirname, '../public/images');
const uploadsDir = path.join(imagesDir, 'uploads');
for (const dir of [imagesDir, uploadsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
app.use('/images', express.static(imagesDir));
// Tương thích URL cũ /uploads/...
app.use('/uploads', express.static(uploadsDir));

// Backup files — nằm trong volume persistent chung với uploadsDir (Railway chỉ cho 1 volume/service)
const backupsDir = path.join(uploadsDir, '_backups/excel');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}
app.use('/backups/excel', express.static(backupsDir));

// Multer storage configuration
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// SSE Clients for real-time notifications
let clients = [];

function normStr(v) {
  return v == null ? v : removeDiacritics(String(v));
}

function normalizeEmployee(e) {
  const out = { ...e };
  out.fullName = normStr(out.fullName);
  out.address = normStr(out.address);
  if (out.customData && typeof out.customData === 'object') out.customData = deepConvert(out.customData);
  return out;
}

function normalizeProduct(p) {
  return { ...p, name: normStr(p.name), description: normStr(p.description) };
}

function normalizeOrder(order) {
  return {
    ...order,
    items: deepConvert(order.items || []),
    staff: normStr(order.staff),
    customerName: normStr(order.customerName),
    deliveryAddress: normStr(order.deliveryAddress),
    shipperName: normStr(order.shipperName),
  };
}

function normalizeShift(s) {
  return { ...s, employeeName: normStr(s.employeeName) };
}

function normalizeCustomer(c) {
  const phone = normalizePhoneVN(c.phone) || String(c.phone || '').trim().replace(/\s/g, '');
  return { ...c, name: normStr(c.name), phone };
}

function normalizeInventoryItem(item) {
  return { ...item, name: normStr(item.name), unit: normStr(item.unit) };
}


// Upload image route
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file' });
  }
  // Return relative URL to file
  const fileUrl = `/images/uploads/${req.file.filename}`;
  res.json({ imageUrl: fileUrl });
});

// Create new inventory item
app.post('/api/inventory', (req, res) => {
  const item = normalizeInventoryItem(req.body);
  const id = item.id || `INV-${Date.now()}`;
  db.run(
    `INSERT INTO inventory (id, name, unit, currentStock, minStock, cost, category) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, item.name, item.unit, 0, item.minStock, item.cost, item.category],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      seedBranchRowsForItem(db, id, item.minStock).catch(() => {});

      db.get("SELECT * FROM inventory WHERE id = ?", [id], (err, row) => {
        if (!err && row) {
          res.status(201).json(row);
        } else {
          res.status(500).json({ error: "Failed to fetch created item" });
        }
      });
    }
  );
});

// Helper to broadcast events to all connected clients
function broadcast(type, data) {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
}

// SSE Connection Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

// --- ORDERS API ---

// Get all orders (active & completed history)
app.get('/api/orders', (req, res) => {
  const { branchId, salesStaffId, shiftId } = req.query;
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (branchId) {
    sql += ' AND branchId = ?';
    params.push(branchId);
  }
  if (salesStaffId) {
    sql += ' AND salesStaffId = ?';
    params.push(salesStaffId);
  }
  if (shiftId) {
    sql += ' AND shiftId = ?';
    params.push(shiftId);
  }
  sql += ' ORDER BY time DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(r => ({
      ...r,
      items: JSON.parse(r.items),
      stockDeducted: !!r.stockDeducted,
      time: new Date(r.time),
      paidAt: r.paidAt ? new Date(r.paidAt) : undefined,
      readyAt: r.readyAt ? new Date(r.readyAt) : undefined,
      completedAt: r.completedAt ? new Date(r.completedAt) : undefined
    }));
    res.json(orders);
  });
});

// Create new order
app.post('/api/orders', (req, res) => {
  const order = normalizeOrder(req.body);
  const id = order.id || `ORD-${Date.now()}`;
  const orderNumber = order.orderNumber || Math.floor(Math.random() * 1000) + 1;
  const time = order.time || new Date().toISOString();

  const finishInsert = (salesStaffId, salesStaffName, shiftId) => {
    const query = `INSERT INTO orders (
      id, branchId, source, items, time, status, total, staff, paidAt, readyAt, completedAt, orderNumber, customerName, customerPhone,
      deliveryAddress, shipperName, shipperId, paymentMethod, stockDeducted, salesStaffId, salesStaffName, staffId, shiftId, shipFee, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(query, [
      id,
      order.branchId,
      order.source,
      JSON.stringify(order.items),
      time,
      order.status,
      order.total,
      order.staff,
      order.paidAt || null,
      order.readyAt || null,
      order.completedAt || null,
      orderNumber,
      order.customerName,
      order.customerPhone,
      order.deliveryAddress,
      order.shipperName,
      order.shipperId,
      order.paymentMethod,
      order.stockDeducted ? 1 : 0,
      salesStaffId || order.salesStaffId || '',
      salesStaffName || order.salesStaffName || '',
      order.staffId || '',
      shiftId || '',
      Number(order.shipFee) || 0,
      normStr(order.note) || '',
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const createdOrder = {
        ...order,
        id,
        time: new Date(time),
        orderNumber,
        salesStaffId: salesStaffId || order.salesStaffId || '',
        salesStaffName: salesStaffName || order.salesStaffName || '',
        staffId: order.staffId || '',
        shiftId: shiftId || '',
        shipFee: Number(order.shipFee) || 0,
        note: normStr(order.note) || '',
      };

      const phone = order.customerPhone;
      const staffId = salesStaffId || order.salesStaffId;
      const staffName = salesStaffName || order.salesStaffName;
      const isRetailChannel = ['web', 'mobile', 'online_sales'].includes(order.source);
      if (phone && staffId && staffName && isRetailChannel) {
        upsertCareAssignment(phone, order.customerName || '', staffId, staffName, staffId, () => {
          db.run(
            `UPDATE customer_care_assignments SET customerType='retail', pipelineStage='closed_retail', lastContactAt=? WHERE customerPhone=?`,
            [new Date().toISOString(), phone]
          );
          logSalesActivity(db, {
            customerPhone: phone,
            careStaffId: staffId,
            careStaffName: staffName,
            activityType: 'converted',
            content: `Đơn lẻ ${id} — ${(order.total || 0).toLocaleString('vi-VN')}đ`,
          }, () => {});
        }, { customerType: 'retail', pipelineStage: 'closed_retail' });
      }

      broadcast('ORDER_CREATED', createdOrder);
      res.status(201).json(createdOrder);
    });
  };

  // Ưu tiên ca đang mở (in_progress) TẠI ĐÚNG CHI NHÁNH của đơn hàng này — nếu nhân viên hỗ
  // trợ nhiều chi nhánh (hoặc lỡ "Thoát" mà không kết ca, để sót ca in_progress cũ), việc
  // không lọc theo chi nhánh sẽ gán nhầm doanh thu sang ca khác, làm kết ca bị thiếu/dư tiền.
  // Chỉ rơi về "ca in_progress bất kỳ" nếu không tìm được ca nào khớp chi nhánh — vẫn tốt hơn
  // là bỏ trắng shiftId hoàn toàn.
  const resolveShiftThenInsert = (salesStaffId, salesStaffName) => {
    if (!order.staffId) return finishInsert(salesStaffId, salesStaffName, '');
    db.get(
      "SELECT id FROM shifts WHERE employeeId = ? AND branch = ? AND status = 'in_progress' ORDER BY checkIn DESC LIMIT 1",
      [order.staffId, order.branchId || ''],
      (shiftErr, shiftRow) => {
        if (shiftErr) return finishInsert(salesStaffId, salesStaffName, '');
        if (shiftRow) return finishInsert(salesStaffId, salesStaffName, shiftRow.id);
        db.get(
          "SELECT id FROM shifts WHERE employeeId = ? AND status = 'in_progress' ORDER BY checkIn DESC LIMIT 1",
          [order.staffId],
          (fallbackErr, fallbackRow) => {
            finishInsert(salesStaffId, salesStaffName, fallbackRow ? fallbackRow.id : '');
          }
        );
      }
    );
  };

  const refCode = order.salesRefCode || order.salesStaffRef;
  if (!order.salesStaffId && refCode) {
    resolveSalesRef(refCode, (refErr, staff) => {
      if (refErr) return res.status(500).json({ error: refErr.message });
      resolveShiftThenInsert(staff?.id, staff?.fullName);
    });
  } else {
    resolveShiftThenInsert(order.salesStaffId, order.salesStaffName);
  }
});

// Update order status/fields
app.patch('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Find current order
  db.get("SELECT * FROM orders WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Order not found" });

    const currentOrder = {
      ...row,
      items: JSON.parse(row.items),
      stockDeducted: !!row.stockDeducted
    };

    const newStatus = updates.status !== undefined ? updates.status : currentOrder.status;
    const newStockDeducted = updates.stockDeducted !== undefined ? (updates.stockDeducted ? 1 : 0) : row.stockDeducted;
    const readyAt = updates.readyAt || row.readyAt;
    const completedAt = updates.completedAt || row.completedAt;

    const salesStaffId = updates.salesStaffId !== undefined ? updates.salesStaffId : row.salesStaffId;
    const salesStaffName = updates.salesStaffName !== undefined ? updates.salesStaffName : row.salesStaffName;

    db.run(
      `UPDATE orders SET status = ?, stockDeducted = ?, readyAt = ?, completedAt = ?, staff = ?, shipperName = ?, shipperId = ?, salesStaffId = ?, salesStaffName = ? WHERE id = ?`,
      [newStatus, newStockDeducted, readyAt, completedAt, updates.staff || row.staff, updates.shipperName || row.shipperName, updates.shipperId || row.shipperId, salesStaffId || '', salesStaffName || '', id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get("SELECT * FROM orders WHERE id = ?", [id], (err, updatedRow) => {
          if (err || !updatedRow) return res.status(500).json({ error: "Failed to fetch updated order" });
          const finalOrder = {
            ...updatedRow,
            items: JSON.parse(updatedRow.items),
            stockDeducted: !!updatedRow.stockDeducted,
            time: new Date(updatedRow.time),
            paidAt: updatedRow.paidAt ? new Date(updatedRow.paidAt) : undefined,
            readyAt: updatedRow.readyAt ? new Date(updatedRow.readyAt) : undefined,
            completedAt: updatedRow.completedAt ? new Date(updatedRow.completedAt) : undefined
          };
          broadcast('ORDER_UPDATED', finalOrder);
          res.json(finalOrder);
        });
      }
    );
  });
});

// --- INVENTORY API ---

app.get('/api/inventory', async (req, res) => {
  const { branchId } = req.query;
  try {
    const rows = await getInventoryForBranch(db, branchId || null);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/movements', async (req, res) => {
  const { branchId } = req.query;
  try {
    const rows = await getMovementsForBranch(db, branchId || null);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/update', async (req, res) => {
  const { items, movements, branchId } = req.body;
  if (!branchId) {
    return res.status(400).json({ error: 'branchId required — moi chi nhanh co kho rieng' });
  }

  const finish = (err, updatedInv) => {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('INVENTORY_UPDATED', { branchId, inventory: updatedInv });
    res.json({ success: true, branchId, inventory: updatedInv });
  };

  if (!isPostgres()) {
    try {
      const updatedInv = await applyBranchInventoryUpdate(db, branchId, items, movements);
      finish(null, updatedInv);
    } catch (err) {
      finish(err);
    }
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const item of items || []) {
      await client.query(
        `UPDATE branch_inventory SET "currentStock" = $1 WHERE "branchId" = $2 AND "itemId" = $3`,
        [item.currentStock, branchId, item.id]
      );
    }
    for (const m of movements || []) {
      await client.query(
        `INSERT INTO inventory_movements (id, timestamp, type, "orderId", "itemId", "itemName", quantity, reason, "performedBy", cost, "branchId", "receiptId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          m.id || `MOV-${Date.now()}-${Math.random()}`,
          m.timestamp || new Date().toISOString(),
          m.type,
          m.orderId || null,
          m.itemId,
          m.itemName,
          m.quantity,
          m.reason,
          m.performedBy,
          m.cost,
          branchId,
          m.receiptId || null,
        ]
      );
    }
    await client.query('COMMIT');
    const updatedInv = await getInventoryForBranch(db, branchId);
    finish(null, updatedInv);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// --- WHOLESALE ACCOUNTS API ---

// Get wholesale accounts
app.get('/api/wholesale', (req, res) => {
  const { branchId } = req.query;
  let sql = 'SELECT * FROM wholesale_accounts';
  const params = [];
  if (branchId) {
    sql += ' WHERE branchId = ?';
    params.push(branchId);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const accounts = rows.map(r => ({
      ...r,
      preferredProduct: r.preferredProduct ? JSON.parse(r.preferredProduct) : undefined,
      redemptions: JSON.parse(r.redemptions || '[]')
    }));
    res.json(accounts);
  });
});

// Create/Register wholesale account
app.post('/api/wholesale', (req, res) => {
  const account = req.body;
  const query = `INSERT INTO wholesale_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    account.id,
    account.customerName,
    account.customerPhone,
    account.packageName,
    account.totalCups,
    account.remainingCups,
    account.durationMonths,
    account.purchasedAt,
    account.expiresAt,
    account.preferredProduct ? JSON.stringify(account.preferredProduct) : null,
    account.preferredProductSize || null,
    account.preferredProductProtein || null,
    account.branchId || null,
    account.branchName || null,
    JSON.stringify(account.redemptions || [])
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('WHOLESALE_UPDATED', account);
    res.status(201).json(account);
  });
});

// Update/Redeem wholesale account cups
app.patch('/api/wholesale/:id', (req, res) => {
  const { id } = req.params;
  const { remainingCups, redemptions } = req.body;

  db.run(
    `UPDATE wholesale_accounts SET remainingCups = ?, redemptions = ? WHERE id = ?`,
    [remainingCups, JSON.stringify(redemptions), id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM wholesale_accounts WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Failed to fetch updated wholesale account" });
        const updated = {
          ...row,
          preferredProduct: row.preferredProduct ? JSON.parse(row.preferredProduct) : undefined,
          redemptions: JSON.parse(row.redemptions || '[]')
        };
        broadcast('WHOLESALE_UPDATED', updated);
        res.json(updated);
      });
    }
  );
});

// --- AFFILIATES (PT PARTNERS) API ---

// Get all partners
app.get('/api/affiliates/partners', (req, res) => {
  db.all("SELECT * FROM partners_pt", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new partner
app.post('/api/affiliates/partners', (req, res) => {
  const p = req.body;
  db.run(
    `INSERT INTO partners_pt VALUES (?, ?, ?, ?, ?, ?)`,
    [p.id, p.name, p.phone, p.code, p.dateCreated, p.paidCommission],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('PT_PARTNER_CREATED', p);
      res.status(201).json(p);
    }
  );
});

// Update partner paid commission
app.patch('/api/affiliates/partners/:id/pay', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  db.run(
    `UPDATE partners_pt SET paidCommission = paidCommission + ? WHERE id = ?`,
    [amount, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM partners_pt WHERE id = ?", [id], (err, row) => {
        if (!err && row) broadcast('PT_PARTNER_UPDATED', row);
        res.json({ success: true });
      });
    }
  );
});

// Get all referral transactions
app.get('/api/affiliates/referrals', (req, res) => {
  db.all("SELECT * FROM referral_transactions ORDER BY timestamp DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create referral transaction
app.post('/api/affiliates/referrals', (req, res) => {
  const r = req.body;
  db.run(
    `INSERT INTO referral_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.ptId, r.ptCode, r.orderId, r.customerName, r.comboName, r.price, r.timestamp],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('REFERRAL_CREATED', r);
      res.status(201).json(r);
    }
  );
});

// --- PRODUCTS API ---
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const p = normalizeProduct(req.body);
  const id = p.id || `PROD-${Date.now()}`;
  db.run(
    `INSERT INTO products (id, name, category, basePrice, image, description) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, p.name, p.category, p.basePrice, p.image, p.description || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = { ...p, id };
      broadcast('PRODUCT_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const p = normalizeProduct(req.body);
  db.run(
    `UPDATE products SET name = ?, category = ?, basePrice = ?, image = ?, description = ? WHERE id = ?`,
    [p.name, p.category, p.basePrice, p.image, p.description || '', id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const updated = { ...p, id };
      broadcast('PRODUCT_UPDATED', updated);
      res.json(updated);
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('PRODUCT_DELETED', { id });
    res.json({ success: true });
  });
});

// --- EMPLOYEE AUTH ---
app.post('/api/auth/employee-login', (req, res) => {
  const { username, password, branchId } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }
  db.get("SELECT * FROM employees WHERE username = ?", [username.trim()], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || !verifyPassword(password, row.password)) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    let secondaryBranches = [];
    try { secondaryBranches = JSON.parse(row.secondaryBranches || '[]'); } catch { secondaryBranches = []; }
    if (branchId && row.branch !== branchId && !secondaryBranches.includes(branchId)) {
      return res.status(403).json({ error: 'Tài khoản không thuộc chi nhánh này. Máy POS này chỉ đăng nhập được tài khoản của chi nhánh đã gán hoặc chi nhánh hỗ trợ thêm.' });
    }
    const employee = parseEmployeeRow(row);
    res.json(employee);
  });
});

function parseEmployeeRow(row) {
  if (!row) return row;
  const employee = { ...row };
  delete employee.password;
  if (typeof employee.customData === 'string') {
    try { employee.customData = JSON.parse(employee.customData || '{}'); } catch { employee.customData = {}; }
  } else if (!employee.customData || typeof employee.customData !== 'object') {
    employee.customData = {};
  }
  if (typeof employee.secondaryBranches === 'string') {
    try { employee.secondaryBranches = JSON.parse(employee.secondaryBranches || '[]'); } catch { employee.secondaryBranches = []; }
  } else if (!Array.isArray(employee.secondaryBranches)) {
    employee.secondaryBranches = [];
  }
  return employee;
}

// --- BRANCHES API ---
app.get('/api/branches', (req, res) => {
  const activeOnly = req.query.active === '1' || req.query.active === 'true';
  const sql = activeOnly
    ? `SELECT * FROM branches WHERE active IS TRUE ORDER BY sortOrder, id`
    : `SELECT * FROM branches ORDER BY sortOrder, id`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const list = (rows || []).map(parseBranchRow);
    if (list.length === 0) {
      return res.json(DEFAULT_BRANCHES.map((b) => ({ ...b, createdAt: b.createdAt || '' })));
    }
    res.json(list);
  });
});

app.get('/api/branches/:id', (req, res) => {
  db.get('SELECT * FROM branches WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
    res.json(parseBranchRow(row));
  });
});

app.post('/api/branches', async (req, res) => {
  try {
    const body = normalizeBranch(req.body);
    const existing = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM branches', [], (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
    const id = body.id || nextBranchId(existing.map((r) => r.id));
    const branch = {
      ...body,
      id,
      createdAt: new Date().toISOString(),
      sortOrder: body.sortOrder || existing.length + 1,
    };
    if (!branch.name) return res.status(400).json({ error: 'Tên chi nhánh là bắt buộc' });

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO branches (id, name, address, phone, active, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [branch.id, branch.name, branch.address, branch.phone, branch.active ? 1 : 0, branch.sortOrder, branch.createdAt],
        function onRun(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await seedBranchInventoryForBranch(db, branch.id);
    const created = parseBranchRow(branch);
    broadcast('BRANCH_CREATED', created);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branches/:id', (req, res) => {
  const { id } = req.params;
  const body = normalizeBranch({ ...req.body, id });
  if (!body.name) return res.status(400).json({ error: 'Tên chi nhánh là bắt buộc' });

  db.run(
    `UPDATE branches SET name = ?, address = ?, phone = ?, active = ?, sortOrder = ? WHERE id = ?`,
    [body.name, body.address, body.phone, body.active ? 1 : 0, body.sortOrder, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
      const updated = parseBranchRow(body);
      broadcast('BRANCH_UPDATED', updated);
      res.json(updated);
    }
  );
});

app.delete('/api/branches/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT COUNT(*) AS cnt FROM employees WHERE branch = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.cnt > 0) {
      return res.status(400).json({ error: 'Chi nhánh còn nhân viên — chuyển NV sang CN khác trước khi xóa' });
    }
    db.run(`DELETE FROM branches WHERE id = ?`, [id], function(delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
      broadcast('BRANCH_DELETED', { id });
      res.json({ success: true, id });
    });
  });
});

// --- EMPLOYEES API ---
app.get('/api/employees', (req, res) => {
  db.all("SELECT * FROM employees", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(parseEmployeeRow));
  });
});

function prepareEmployeePassword(password) {
  if (!password) return password;
  return isHashed(password) ? password : hashPassword(password);
}

app.post('/api/employees', (req, res) => {
  const e = normalizeEmployee(req.body);
  const id = e.id || `EMP-${Date.now()}`;
  const customData = typeof e.customData === 'object' ? JSON.stringify(e.customData || {}) : (e.customData || '{}');
  const storedPassword = prepareEmployeePassword(e.password);
  const username = (e.username || '').trim();
  const employeeCode = (e.employeeId || '').trim();

  db.get('SELECT id FROM employees WHERE username = ?', [username], (checkErr, existing) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (existing) return res.status(400).json({ error: `Tên đăng nhập "${username}" đã được dùng. Vui lòng chọn tên khác.` });

    const checkCode = (cb) => {
      if (!employeeCode) return cb();
      db.get('SELECT id FROM employees WHERE employeeId = ?', [employeeCode], (codeErr, codeConflict) => {
        if (codeErr) return res.status(500).json({ error: codeErr.message });
        if (codeConflict) return res.status(400).json({ error: `Mã nhân viên "${employeeCode}" đã được dùng. Vui lòng chọn mã khác.` });
        cb();
      });
    };

    const secondaryBranches = JSON.stringify(Array.isArray(e.secondaryBranches) ? e.secondaryBranches : []);

    checkCode(() => {
      db.run(
        `INSERT INTO employees (id, fullName, employeeId, email, phone, idNumber, dateOfBirth, address, branch, position, baseSalary, startDate, username, password, photo, customData, payType, hourlyRate, secondaryBranches) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, username, storedPassword, e.photo || '', customData, e.payType || 'monthly', e.hourlyRate || null, secondaryBranches],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          const created = parseEmployeeRow({ ...e, id, username, customData: e.customData || {}, secondaryBranches: e.secondaryBranches || [] });
          broadcast('EMPLOYEE_CREATED', created);
          res.status(201).json(created);
        }
      );
    });
  });
});

app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const e = normalizeEmployee(req.body);
  const customData = typeof e.customData === 'object' ? JSON.stringify(e.customData || {}) : (e.customData || '{}');
  const storedPassword = e.password ? prepareEmployeePassword(e.password) : undefined;
  const username = (e.username || '').trim();
  const employeeCode = (e.employeeId || '').trim();

  db.get('SELECT password FROM employees WHERE id = ?', [id], (getErr, existing) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    const passwordToSave = storedPassword || existing.password;

    db.get('SELECT id FROM employees WHERE username = ? AND id != ?', [username, id], (checkErr, conflict) => {
      if (checkErr) return res.status(500).json({ error: checkErr.message });
      if (conflict) return res.status(400).json({ error: `Tên đăng nhập "${username}" đã được dùng. Vui lòng chọn tên khác.` });

      const checkCode = (cb) => {
        if (!employeeCode) return cb();
        db.get('SELECT id FROM employees WHERE employeeId = ? AND id != ?', [employeeCode, id], (codeErr, codeConflict) => {
          if (codeErr) return res.status(500).json({ error: codeErr.message });
          if (codeConflict) return res.status(400).json({ error: `Mã nhân viên "${employeeCode}" đã được dùng. Vui lòng chọn mã khác.` });
          cb();
        });
      };

      const secondaryBranches = JSON.stringify(Array.isArray(e.secondaryBranches) ? e.secondaryBranches : []);

      checkCode(() => {
        db.run(
          `UPDATE employees SET fullName = ?, employeeId = ?, email = ?, phone = ?, idNumber = ?, dateOfBirth = ?, address = ?, branch = ?, position = ?, baseSalary = ?, startDate = ?, username = ?, password = ?, photo = ?, customData = ?, payType = ?, hourlyRate = ?, secondaryBranches = ? WHERE id = ?`,
          [e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, username, passwordToSave, e.photo || '', customData, e.payType || 'monthly', e.hourlyRate || null, secondaryBranches, id],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
            const updated = parseEmployeeRow({ ...e, id, username, customData: e.customData || {}, secondaryBranches: e.secondaryBranches || [] });
            broadcast('EMPLOYEE_UPDATED', updated);
            res.json(updated);
          }
        );
      });
    });
  });
});

app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM employees WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('EMPLOYEE_DELETED', { id });
    res.json({ success: true });
  });
});

// --- SHIFTS API ---
app.get('/api/shifts', (req, res) => {
  const { employeeId, status, branch, date } = req.query;
  let sql = "SELECT * FROM shifts";
  const params = [];
  const clauses = [];
  if (employeeId) { clauses.push("employeeId = ?"); params.push(employeeId); }
  if (status) { clauses.push("status = ?"); params.push(status); }
  if (branch) { clauses.push("branch = ?"); params.push(branch); }
  if (date) { clauses.push("date = ?"); params.push(date); }
  if (clauses.length) sql += " WHERE " + clauses.join(" AND ");
  sql += " ORDER BY date DESC";
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

function timeToMinutes(hhmm) {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
}

function timeRangesOverlap(startA, endA, startB, endB) {
  let a1 = timeToMinutes(startA), a2 = timeToMinutes(endA);
  let b1 = timeToMinutes(startB), b2 = timeToMinutes(endB);
  if (a2 <= a1) a2 += 24 * 60;
  if (b2 <= b1) b2 += 24 * 60;
  return a1 < b2 && b1 < a2;
}

// Từ chối nếu nhân viên đã có ca khác (ở bất kỳ chi nhánh nào) trùng khung giờ cùng ngày —
// 1 người không thể có mặt ở 2 nơi cùng lúc.
function findConflictingShift(employeeId, date, startTime, endTime, excludeShiftId, cb) {
  db.all(
    "SELECT * FROM shifts WHERE employeeId = ? AND date = ? AND status NOT IN ('rejected', 'cancelled')",
    [employeeId, date],
    (err, rows) => {
      if (err) return cb(err);
      const conflict = (rows || []).find(
        (r) => r.id !== excludeShiftId && timeRangesOverlap(startTime, endTime, r.startTime, r.endTime)
      );
      cb(null, conflict || null);
    }
  );
}

app.post('/api/shifts', (req, res) => {
  const s = normalizeShift(req.body);
  const id = s.id || `SHIFT-${Date.now()}`;
  findConflictingShift(s.employeeId, s.date, s.startTime, s.endTime, null, (checkErr, conflict) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (conflict) {
      return res.status(409).json({
        error: `${s.employeeName || 'Nhân viên'} đã có ca ${conflict.startTime}-${conflict.endTime} tại ${conflict.branch || 'chi nhánh khác'} cùng ngày này — không thể xếp ca trùng giờ.`,
      });
    }
    db.run(
      `INSERT INTO shifts (id, employeeId, employeeName, date, shiftType, startTime, endTime, status, checkIn, checkOut, branch, requestedBy, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, s.employeeId, s.employeeName, s.date, s.shiftType || '', s.startTime, s.endTime, s.status || 'scheduled', s.checkIn || '', s.checkOut || '', s.branch || '', s.requestedBy || 'admin', s.reason || ''],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const created = { ...s, id };
        broadcast('SHIFT_CREATED', created);
        res.status(201).json(created);
      }
    );
  });
});

app.put('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  const s = normalizeShift(req.body);
  findConflictingShift(s.employeeId, s.date, s.startTime, s.endTime, id, (checkErr, conflict) => {
    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (conflict) {
      return res.status(409).json({
        error: `${s.employeeName || 'Nhân viên'} đã có ca ${conflict.startTime}-${conflict.endTime} tại ${conflict.branch || 'chi nhánh khác'} cùng ngày này — không thể xếp ca trùng giờ.`,
      });
    }
    db.run(
      `UPDATE shifts SET employeeId = ?, employeeName = ?, date = ?, shiftType = ?, startTime = ?, endTime = ?, status = ?, checkIn = ?, checkOut = ?, branch = ?, requestedBy = ?, reason = ? WHERE id = ?`,
      [s.employeeId, s.employeeName, s.date, s.shiftType || '', s.startTime, s.endTime, s.status, s.checkIn || '', s.checkOut || '', s.branch || '', s.requestedBy || 'admin', s.reason || '', id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy ca làm' });
        const updated = { ...s, id };
        broadcast('SHIFT_UPDATED', updated);
        res.json(updated);
      }
    );
  });
});

app.patch('/api/shifts/:id/checkin', (req, res) => {
  const { id } = req.params;
  const { action, photo, startCash, endCashActual } = req.body;
  const now = new Date().toISOString();
  db.get("SELECT * FROM shifts WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Không tìm thấy ca làm' });
    const field = action === 'out' ? 'checkOut' : 'checkIn';
    const photoField = action === 'out' ? 'checkOutPhoto' : 'checkInPhoto';
    const updated = { ...row, [field]: now };
    if (photo) updated[photoField] = photo;
    if (action === 'in') updated.status = 'in_progress';
    if (action === 'out') updated.status = 'completed';
    if (startCash != null) updated.startCash = Number(startCash) || 0;
    if (endCashActual != null) updated.endCashActual = Number(endCashActual) || 0;

    const finishUpdate = () => {
      db.run(
        `UPDATE shifts SET checkIn = ?, checkOut = ?, status = ?, checkInPhoto = ?, checkOutPhoto = ?, closingOrderCount = ?, closingRevenue = ?, startCash = ?, endCashActual = ? WHERE id = ?`,
        [
          updated.checkIn || '',
          updated.checkOut || '',
          updated.status,
          updated.checkInPhoto || '',
          updated.checkOutPhoto || '',
          updated.closingOrderCount ?? null,
          updated.closingRevenue ?? null,
          updated.startCash ?? row.startCash ?? 0,
          updated.endCashActual ?? row.endCashActual ?? 0,
          id,
        ],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          broadcast('SHIFT_UPDATED', updated);
          res.json(updated);
        }
      );
    };

    if (action === 'out') {
      db.get(
        "SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as rev FROM orders WHERE shiftId = ?",
        [id],
        (snapErr, snapRow) => {
          updated.closingOrderCount = snapErr ? 0 : (snapRow?.cnt || 0);
          updated.closingRevenue = snapErr ? 0 : (snapRow?.rev || 0);
          finishUpdate();
        }
      );
    } else {
      finishUpdate();
    }
  });
});

app.post('/api/shifts/:id/cash-movements', (req, res) => {
  const { id } = req.params;
  const { type, amount, note, createdBy } = req.body || {};
  if (type !== 'in' && type !== 'out') {
    return res.status(400).json({ error: 'type phải là in hoặc out' });
  }
  const amt = Number(amount);
  if (!amt || amt <= 0) {
    return res.status(400).json({ error: 'Số tiền không hợp lệ' });
  }
  const movement = {
    id: `CM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    shiftId: id,
    type,
    amount: amt,
    note: normStr(note || ''),
    createdAt: new Date().toISOString(),
    createdBy: normStr(createdBy || ''),
  };
  db.run(
    `INSERT INTO shift_cash_movements (id, shiftId, type, amount, note, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [movement.id, movement.shiftId, movement.type, movement.amount, movement.note, movement.createdAt, movement.createdBy],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('SHIFT_CASH_MOVEMENT_CREATED', movement);
      res.json(movement);
    }
  );
});

app.get('/api/shifts/:id/cash-movements', (req, res) => {
  const { id } = req.params;
  db.all(
    "SELECT * FROM shift_cash_movements WHERE shiftId = ? ORDER BY createdAt ASC",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.delete('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM shifts WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('SHIFT_DELETED', { id });
    res.json({ success: true });
  });
});

// --- STOCK RECEIPTS API (phiếu nhập kho chi nhánh, duyệt từ kho tổng) ---
const CENTRAL_STOCK_KEY = 'centralProductInventory';

function pRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ changes: this && this.changes });
    });
  });
}
function pGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function pAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function readProductSetting(key) {
  const row = await pGet('SELECT value FROM settings WHERE key = ?', [key]);
  let parsed = {};
  if (row && row.value) {
    try { parsed = JSON.parse(row.value); } catch { parsed = {}; }
  }
  return {
    smoothies: (parsed && parsed.smoothies) || {},
    toppings: (parsed && parsed.toppings) || {},
  };
}

async function writeProductSetting(key, value) {
  await pRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
  broadcast('SETTING_UPDATED', { key, value });
}

function getProductQty(inv, line) {
  if (line.type === 'topping') return Number(inv.toppings[line.productId]) || 0;
  return Number((inv.smoothies[line.productId] || {})[line.variantKey]) || 0;
}

function setProductQty(inv, line, qty) {
  const safe = Math.max(0, qty);
  if (line.type === 'topping') {
    inv.toppings[line.productId] = safe;
  } else {
    if (!inv.smoothies[line.productId]) inv.smoothies[line.productId] = {};
    inv.smoothies[line.productId][line.variantKey] = safe;
  }
}

function parseReceiptRow(row) {
  let lines = [];
  try { lines = JSON.parse(row.lines || '[]'); } catch { lines = []; }
  return { ...row, lines };
}

app.get('/api/stock-receipts', async (req, res) => {
  try {
    const { status } = req.query;
    const rows = status
      ? await pAll('SELECT * FROM stock_receipts WHERE status = ? ORDER BY createdAt DESC', [status])
      : await pAll('SELECT * FROM stock_receipts ORDER BY createdAt DESC');
    res.json(rows.map(parseReceiptRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-receipts', async (req, res) => {
  try {
    const { branchId, createdBy, note, lines } = req.body || {};
    const validLines = (Array.isArray(lines) ? lines : []).filter(
      (l) => l && l.productId && Number(l.quantity) !== 0 && (l.type === 'topping' || l.variantKey)
    );
    if (!branchId) return res.status(400).json({ error: 'branchId required' });
    if (validLines.length === 0) return res.status(400).json({ error: 'Phieu can it nhat 1 san pham' });

    const receipt = {
      id: `PNK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      branchId,
      createdBy: normStr(createdBy || 'Admin'),
      note: normStr(note || ''),
      status: 'pending',
      lines: validLines.map((l) => ({
        productId: l.productId,
        productName: normStr(l.productName || l.productId),
        type: l.type === 'topping' ? 'topping' : 'smoothie',
        variantKey: l.type === 'topping' ? null : l.variantKey,
        quantity: Number(l.quantity),
      })),
    };

    await pRun(
      `INSERT INTO stock_receipts (id, createdAt, branchId, createdBy, note, status, lines) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [receipt.id, receipt.createdAt, receipt.branchId, receipt.createdBy, receipt.note, receipt.status, JSON.stringify(receipt.lines)]
    );
    broadcast('STOCK_RECEIPT_CREATED', receipt);
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-receipts/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = normStr((req.body && req.body.approvedBy) || 'Admin');
    const row = await pGet('SELECT * FROM stock_receipts WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Khong tim thay phieu' });
    if (row.status !== 'pending') return res.status(400).json({ error: 'Phieu da duoc xu ly roi' });
    const receipt = parseReceiptRow(row);

    const central = await readProductSetting(CENTRAL_STOCK_KEY);
    const branchKey = `branchProductInventory_${receipt.branchId}`;
    const branchInv = await readProductSetting(branchKey);

    // Kiểm tra kho tổng đủ hàng cho TOÀN BỘ phiếu trước khi trừ bất cứ dòng nào
    const shortages = [];
    for (const line of receipt.lines) {
      const have = getProductQty(central, line);
      if (have < line.quantity) {
        shortages.push({
          productName: line.productName,
          variantKey: line.variantKey,
          need: line.quantity,
          have,
        });
      }
    }
    if (shortages.length > 0) {
      return res.status(400).json({ error: 'Kho tong khong du hang', shortages });
    }

    for (const line of receipt.lines) {
      setProductQty(central, line, getProductQty(central, line) - line.quantity);
      setProductQty(branchInv, line, getProductQty(branchInv, line) + line.quantity);
    }

    const approvedAt = new Date().toISOString();
    await writeProductSetting(CENTRAL_STOCK_KEY, central);
    await writeProductSetting(branchKey, branchInv);
    await pRun('UPDATE stock_receipts SET status = ?, approvedAt = ?, approvedBy = ? WHERE id = ?', [
      'approved', approvedAt, approvedBy, id,
    ]);

    // Ghi movement 'purchase' để chi nhánh được tính là đã nhập kho lần đầu (mở khóa POS)
    for (const line of receipt.lines) {
      await pRun(
        `INSERT INTO inventory_movements (id, timestamp, type, orderId, itemId, itemName, quantity, reason, performedBy, cost, branchId, receiptId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          approvedAt,
          'purchase',
          null,
          line.productId,
          line.variantKey ? `${line.productName} (${line.variantKey})` : line.productName,
          line.quantity,
          `Nhap tu kho tong - phieu ${id}`,
          approvedBy,
          0,
          receipt.branchId,
          id,
        ]
      ).catch(() => {});
    }

    const updated = parseReceiptRow(await pGet('SELECT * FROM stock_receipts WHERE id = ?', [id]));
    broadcast('STOCK_RECEIPT_UPDATED', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock-receipts/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const approvedBy = normStr((req.body && req.body.approvedBy) || 'Admin');
    const row = await pGet('SELECT * FROM stock_receipts WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Khong tim thay phieu' });
    if (row.status !== 'pending') return res.status(400).json({ error: 'Phieu da duoc xu ly roi' });
    await pRun('UPDATE stock_receipts SET status = ?, approvedAt = ?, approvedBy = ? WHERE id = ?', [
      'rejected', new Date().toISOString(), approvedBy, id,
    ]);
    const updated = parseReceiptRow(await pGet('SELECT * FROM stock_receipts WHERE id = ?', [id]));
    broadcast('STOCK_RECEIPT_UPDATED', updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SETTINGS API ---
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Setting not found' });
    try {
      res.json(JSON.parse(row.value));
    } catch (e) {
      res.json(row.value);
    }
  });
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const stringValue = convertMaybeJson(raw);
  db.run(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, stringValue],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('SETTING_UPDATED', { key, value });
      res.json({ success: true, key, value });
    }
  );
});

// --- CUSTOMER LOYALTY API ---
function findInCustomersTable(normalizedPhone, cb) {
  db.all('SELECT * FROM customers', [], (err, customers) => {
    if (err) return cb(err);
    const existing = (customers || []).find((c) => phonesMatch(normalizedPhone, c.phone));
    cb(null, existing || null);
  });
}

function findLegacyCustomerProfile(normalizedPhone, cb) {
  db.all(
    `SELECT customerName, customerPhone FROM combo_subscriptions
     WHERE customerPhone IS NOT NULL AND TRIM(customerPhone) != ''
     ORDER BY createdAt DESC`,
    [],
    (err, comboRows) => {
      if (err) return cb(err);
      const comboHit = (comboRows || []).find((r) => phonesMatch(normalizedPhone, r.customerPhone));
      if (comboHit) return cb(null, { name: comboHit.customerName, phone: comboHit.customerPhone });

      db.all(
        `SELECT customerName, customerPhone FROM orders
         WHERE customerPhone IS NOT NULL AND TRIM(customerPhone) != ''
         ORDER BY time DESC`,
        [],
        (err2, orderRows) => {
          if (err2) return cb(err2);
          const orderHit = (orderRows || []).find((r) => phonesMatch(normalizedPhone, r.customerPhone));
          if (orderHit) {
            return cb(null, {
              name: orderHit.customerName || 'Khach hang',
              phone: orderHit.customerPhone,
            });
          }

          db.all(
            `SELECT customerName, customerPhone FROM customer_care_assignments
             WHERE customerPhone IS NOT NULL AND TRIM(customerPhone) != ''`,
            [],
            (err3, careRows) => {
              if (err3) return cb(err3);
              const careHit = (careRows || []).find((r) => phonesMatch(normalizedPhone, r.customerPhone));
              if (careHit) {
                return cb(null, {
                  name: careHit.customerName || 'Khach hang',
                  phone: careHit.customerPhone,
                });
              }
              cb(null, null);
            }
          );
        }
      );
    }
  );
}

function insertLoyaltyCustomer(name, normalizedPhone, cb) {
  const id = `CUST-${Date.now()}`;
  const createdAt = new Date().toISOString();
  db.run(
    'INSERT INTO customers (id, name, phone, points, createdAt) VALUES (?, ?, ?, 0, ?)',
    [id, name, normalizedPhone, createdAt],
    function(insertErr) {
      if (insertErr) {
        return findInCustomersTable(normalizedPhone, cb);
      }
      const created = { id, name, phone: normalizedPhone, points: 0, createdAt };
      broadcast('CUSTOMER_CREATED', created);
      cb(null, created);
    }
  );
}

function findCustomerByPhone(rawPhone, cb) {
  const normalized = normalizePhoneVN(rawPhone);
  if (!normalized || normalized.length < 9) return cb(null, null);

  findInCustomersTable(normalized, (err, existing) => {
    if (err) return cb(err);
    if (existing) return cb(null, existing);

    findLegacyCustomerProfile(normalized, (err2, profile) => {
      if (err2) return cb(err2);
      if (!profile) return cb(null, null);
      const name = normStr(profile.name) || 'Khach hang';
      insertLoyaltyCustomer(name, normalized, cb);
    });
  });
}

app.get('/api/customers', (req, res) => {
  db.all("SELECT * FROM customers ORDER BY createdAt DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/customers/:phone', (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  findCustomerByPhone(phone, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json(row);
  });
});

app.post('/api/customers', (req, res) => {
  const c = normalizeCustomer(req.body);
  const id = c.id || `CUST-${Date.now()}`;
  const points = c.points || 0;
  const createdAt = new Date().toISOString();

  db.run(
    "INSERT INTO customers (id, name, phone, points, createdAt) VALUES (?, ?, ?, ?, ?)",
    [id, c.name, c.phone, points, createdAt],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = { id, name: c.name, phone: c.phone, points, createdAt };
      broadcast('CUSTOMER_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.patch('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, points } = req.body;
  
  db.get("SELECT * FROM customers WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Customer not found' });

    const newName = name !== undefined ? normStr(name) : row.name;
    const newPhone = phone !== undefined ? phone : row.phone;
    const newPoints = points !== undefined ? points : row.points;

    db.run(
      "UPDATE customers SET name = ?, phone = ?, points = ? WHERE id = ?",
      [newName, newPhone, newPoints, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const updated = { id, name: newName, phone: newPhone, points: newPoints, createdAt: row.createdAt };
        broadcast('CUSTOMER_UPDATED', updated);
        res.json(updated);
      }
    );
  });
});

app.post('/api/customers/:id/earn', (req, res) => {
  const { id } = req.params;
  const { points } = req.body; // points to add

  db.run(
    "UPDATE customers SET points = points + ? WHERE id = ?",
    [points, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM customers WHERE id = ?", [id], (err, row) => {
        if (!err && row) {
          broadcast('CUSTOMER_UPDATED', row);
          res.json(row);
        } else {
          res.json({ success: true });
        }
      });
    }
  );
});

app.post('/api/customers/:id/redeem', (req, res) => {
  const { id } = req.params;
  const { points } = req.body; // points to subtract

  db.run(
    "UPDATE customers SET points = MAX(0, points - ?) WHERE id = ?",
    [points, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM customers WHERE id = ?", [id], (err, row) => {
        if (!err && row) {
          broadcast('CUSTOMER_UPDATED', row);
          res.json(row);
        } else {
          res.json({ success: true });
        }
      });
    }
  );
});

// --- Loyalty voucher helpers ---
const VOUCHER_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateVoucherCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += VOUCHER_CHARS[Math.floor(Math.random() * VOUCHER_CHARS.length)];
  }
  return code;
}

function issueVoucherForCustomer(customer, program, deductPoints, cb) {
  const pointsCost = program.pointsCost || 0;
  const shouldDeduct = deductPoints && pointsCost > 0;
  if (shouldDeduct && customer.points < pointsCost) {
    return cb(new Error(`Không đủ điểm (cần ${pointsCost}, có ${customer.points})`));
  }

  const tryInsert = (attempt = 0) => {
    if (attempt > 8) return cb(new Error('Không tạo được mã duy nhất'));
    const id = `VCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const code = generateVoucherCode();
    const issuedAt = new Date().toISOString();
    const expiresAt = program.validTo || null;
    const pointsDeducted = shouldDeduct ? pointsCost : 0;

    const finishIssue = () => {
      db.run(
        `INSERT INTO loyalty_vouchers (id, code, programId, customerId, customerName, customerPhone, status, pointsDeducted, issuedAt, expiresAt)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        [id, code, program.id, customer.id, customer.name, customer.phone, pointsDeducted, issuedAt, expiresAt],
        function(insertErr) {
          if (insertErr) {
            if (insertErr.message.includes('UNIQUE')) return tryInsert(attempt + 1);
            return cb(new Error(insertErr.message));
          }
          if (shouldDeduct) customer.points -= pointsCost;
          const voucher = {
            id, code, programId: program.id, customerId: customer.id,
            customerName: customer.name, customerPhone: customer.phone,
            status: 'active', pointsDeducted, issuedAt, usedAt: null, expiresAt, program,
          };
          broadcast('VOUCHER_ISSUED', voucher);
          cb(null, voucher);
        }
      );
    };

    if (shouldDeduct) {
      db.run(
        'UPDATE customers SET points = points - ? WHERE id = ? AND points >= ?',
        [pointsCost, customer.id, pointsCost],
        function(updateErr) {
          if (updateErr) return cb(new Error(updateErr.message));
          if (this.changes === 0) return cb(new Error('Không đủ điểm để trừ'));
          db.get('SELECT * FROM customers WHERE id = ?', [customer.id], (_, updated) => {
            if (updated) {
              customer.points = updated.points;
              broadcast('CUSTOMER_UPDATED', updated);
            }
            finishIssue();
          });
        }
      );
    } else {
      finishIssue();
    }
  };

  tryInsert();
}

function getRedeemPrograms(cb) {
  db.get("SELECT value FROM settings WHERE key = 'loyaltyRedeemPrograms'", (err, row) => {
    if (err || !row) return cb(err, []);
    try {
      cb(null, JSON.parse(row.value));
    } catch {
      cb(null, []);
    }
  });
}

function findProgramById(programs, programId) {
  return programs.find(p => p.id === programId) || null;
}

function rowToVoucher(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    programId: row.programId,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    status: row.status,
    pointsDeducted: row.pointsDeducted || 0,
    issuedAt: row.issuedAt,
    usedAt: row.usedAt || null,
    expiresAt: row.expiresAt || null,
  };
}

function isVoucherExpired(voucher) {
  if (!voucher.expiresAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return today > voucher.expiresAt;
}

// --- LOYALTY VOUCHERS API ---
app.get('/api/loyalty-vouchers', (req, res) => {
  const { phone, customerId, programId, status } = req.query;
  let sql = 'SELECT * FROM loyalty_vouchers WHERE 1=1';
  const params = [];
  if (phone) { sql += ' AND customerPhone = ?'; params.push(phone); }
  if (customerId) { sql += ' AND customerId = ?'; params.push(customerId); }
  if (programId) { sql += ' AND programId = ?'; params.push(programId); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY issuedAt DESC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    getRedeemPrograms((_, programs) => {
      const vouchers = rows.map(row => {
        const v = rowToVoucher(row);
        v.program = findProgramById(programs, v.programId);
        return v;
      });
      res.json(vouchers);
    });
  });
});

app.get('/api/loyalty-vouchers/lookup/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  db.get('SELECT * FROM loyalty_vouchers WHERE code = ?', [code], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Mã voucher không tồn tại' });

    const voucher = rowToVoucher(row);
    if (voucher.status !== 'active') {
      return res.status(400).json({ error: voucher.status === 'used' ? 'Mã đã được sử dụng' : 'Mã không còn hiệu lực' });
    }
    if (isVoucherExpired(voucher)) {
      return res.status(400).json({ error: 'Mã voucher đã hết hạn' });
    }

    getRedeemPrograms((_, programs) => {
      const program = findProgramById(programs, voucher.programId);
      if (!program || !program.enabled) {
        return res.status(400).json({ error: 'Chương trình không còn hoạt động' });
      }
      voucher.program = program;
      res.json(voucher);
    });
  });
});

app.post('/api/loyalty-vouchers/issue', (req, res) => {
  const { programId, phone, customerId, deductPoints = true } = req.body;
  if (!programId) return res.status(400).json({ error: 'Thiếu programId' });
  if (!phone && !customerId) return res.status(400).json({ error: 'Cần phone hoặc customerId' });

  const findCustomer = (cb) => {
    if (customerId) {
      db.get('SELECT * FROM customers WHERE id = ?', [customerId], cb);
    } else {
      findCustomerByPhone(phone, cb);
    }
  };

  findCustomer((err, customer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!customer) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

    getRedeemPrograms((_, programs) => {
      const program = findProgramById(programs, programId);
      if (!program) return res.status(404).json({ error: 'Chương trình không tồn tại' });
      if (!program.enabled) return res.status(400).json({ error: 'Chương trình đang tắt' });

      const pointsCost = program.pointsCost || 0;
      const shouldDeduct = deductPoints && pointsCost > 0;
      if (shouldDeduct && customer.points < pointsCost) {
        return res.status(400).json({ error: `Khách không đủ điểm (cần ${pointsCost}, hiện có ${customer.points})` });
      }

      issueVoucherForCustomer(customer, program, deductPoints, (issueErr, voucher) => {
        if (issueErr) return res.status(500).json({ error: issueErr.message });
        res.status(201).json(voucher);
      });
    });
  });
});

app.post('/api/loyalty-vouchers/issue-bulk', (req, res) => {
  const { programId, phones, deductPoints = true } = req.body;
  if (!programId) return res.status(400).json({ error: 'Thiếu programId' });
  if (!Array.isArray(phones) || phones.length === 0) {
    return res.status(400).json({ error: 'Cần danh sách SĐT' });
  }
  if (phones.length > 500) {
    return res.status(400).json({ error: 'Tối đa 500 khách mỗi lần cấp' });
  }

  const uniquePhones = [...new Set(
    phones.map(p => normalizePhoneVN(String(p))).filter(Boolean)
  )];

  getRedeemPrograms((_, programs) => {
    const program = findProgramById(programs, programId);
    if (!program) return res.status(404).json({ error: 'Chương trình không tồn tại' });
    if (!program.enabled) return res.status(400).json({ error: 'Chương trình đang tắt' });

    const success = [];
    const failed = [];
    let index = 0;

    const processNext = () => {
      if (index >= uniquePhones.length) {
        return res.status(201).json({
          total: uniquePhones.length,
          successCount: success.length,
          failedCount: failed.length,
          success,
          failed,
        });
      }

      const phone = uniquePhones[index++];
      findCustomerByPhone(phone, (err, customer) => {
        if (err) {
          failed.push({ phone, error: err.message });
          return processNext();
        }
        if (!customer) {
          failed.push({ phone, error: 'Không tìm thấy khách hàng' });
          return processNext();
        }

        issueVoucherForCustomer(customer, program, deductPoints, (issueErr, voucher) => {
          if (issueErr) {
            failed.push({ phone, error: issueErr.message });
          } else {
            success.push(voucher);
          }
          processNext();
        });
      });
    };

    processNext();
  });
});

app.post('/api/loyalty-vouchers/use', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Thiếu mã voucher' });
  const normalized = code.toUpperCase().trim();

  db.get('SELECT * FROM loyalty_vouchers WHERE code = ?', [normalized], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Mã voucher không tồn tại' });

    const voucher = rowToVoucher(row);
    if (voucher.status !== 'active') {
      return res.status(400).json({ error: voucher.status === 'used' ? 'Mã đã được sử dụng' : 'Mã không còn hiệu lực' });
    }
    if (isVoucherExpired(voucher)) {
      return res.status(400).json({ error: 'Mã voucher đã hết hạn' });
    }

    const usedAt = new Date().toISOString();
    db.run(
      "UPDATE loyalty_vouchers SET status = 'used', usedAt = ? WHERE id = ? AND status = 'active'",
      [usedAt, voucher.id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        if (this.changes === 0) return res.status(400).json({ error: 'Mã đã được sử dụng' });
        const updated = { ...voucher, status: 'used', usedAt };
        broadcast('VOUCHER_UPDATED', updated);
        res.json(updated);
      }
    );
  });
});

app.patch('/api/loyalty-vouchers/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { refundPoints = true } = req.body;

  db.get('SELECT * FROM loyalty_vouchers WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Voucher không tồn tại' });
    if (row.status !== 'active') return res.status(400).json({ error: 'Chỉ hủy được mã đang active' });

    const refund = refundPoints && row.pointsDeducted > 0;

    const finishCancel = () => {
      db.run(
        "UPDATE loyalty_vouchers SET status = 'cancelled' WHERE id = ?",
        [id],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });
          const updated = rowToVoucher({ ...row, status: 'cancelled' });
          broadcast('VOUCHER_UPDATED', updated);
          res.json(updated);
        }
      );
    };

    if (refund) {
      db.run(
        'UPDATE customers SET points = points + ? WHERE id = ?',
        [row.pointsDeducted, row.customerId],
        () => {
          db.get('SELECT * FROM customers WHERE id = ?', [row.customerId], (_, c) => {
            if (c) broadcast('CUSTOMER_UPDATED', c);
            finishCancel();
          });
        }
      );
    } else {
      finishCancel();
    }
  });
});

// --- COMBO SUBSCRIPTIONS & CUSTOMER CARE ---

function parseComboRow(row) {
  if (!row) return null;
  let deliveryLog = row.deliveryLog;
  if (typeof deliveryLog === 'string') {
    try { deliveryLog = JSON.parse(deliveryLog || '[]'); } catch { deliveryLog = []; }
  }
  return {
    ...row,
    items: typeof row.items === 'string' ? JSON.parse(row.items || '[]') : (row.items || []),
    deliveryDays: typeof row.deliveryDays === 'string' ? JSON.parse(row.deliveryDays || '[]') : (row.deliveryDays || []),
    deliveryLog: deliveryLog || [],
    lastDeliveredAt: row.lastDeliveredAt || null,
    totalCups: row.totalCups != null ? Number(row.totalCups) : 7,
    deliveredCups: row.deliveredCups != null ? Number(row.deliveredCups) : (deliveryLog || []).length,
    commissionAmount: row.commissionAmount != null ? Number(row.commissionAmount) : 0,
    commissionStatus: row.commissionStatus || 'pending',
    shipFee: row.shipFee != null ? Number(row.shipFee) : 0,
    endDate: row.endDate || null,
    renewedFromComboId: row.renewedFromComboId || null,
    renewedFromDuration: row.renewedFromDuration || null,
    renewedFromPlanName: row.renewedFromPlanName || null,
    refundAmount: row.refundAmount != null ? Number(row.refundAmount) : null,
    refundedAt: row.refundedAt || null,
    startDate: row.startDate ? new Date(row.startDate) : new Date(),
    nextDelivery: row.nextDelivery ? new Date(row.nextDelivery) : new Date(),
    createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
    closedAt: row.closedAt ? new Date(row.closedAt) : undefined,
    assignedAt: row.assignedAt ? new Date(row.assignedAt) : undefined,
  };
}

function parseAssignmentRow(row) {
  if (!row) return null;
  let tags = row.tags;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  return {
    ...row,
    tags,
    assignedAt: row.assignedAt ? new Date(row.assignedAt) : undefined,
    lastContactAt: row.lastContactAt || undefined,
    customerType: row.customerType || 'combo',
    pipelineStage: row.pipelineStage || 'nurturing',
  };
}

function resolveSalesRef(refId, cb) {
  if (!refId) return cb(null, null);
  db.get(
    "SELECT id, fullName, username FROM employees WHERE id = ? AND position IN ('online_sales', 'customer_care')",
    [String(refId).trim()],
    (err, row) => cb(err, row || null)
  );
}

function upsertCareAssignment(customerPhone, customerName, careStaffId, careStaffName, assignedBy, cb, extras = {}) {
  const id = `CCA-${customerPhone.replace(/\D/g, '')}`;
  const now = new Date().toISOString();
  const customerType = extras.customerType || 'combo';
  const pipelineStage = extras.pipelineStage || (customerType === 'combo' ? 'closed_combo' : 'nurturing');
  const salesRefCode = extras.salesRefCode || '';

  db.get('SELECT * FROM customer_care_assignments WHERE customerPhone = ?', [customerPhone], (err, existing) => {
    if (err) return cb(err);
    if (existing) {
      db.run(
        `UPDATE customer_care_assignments SET customerName = ?, careStaffId = ?, careStaffName = ?, assignedAt = ?, assignedBy = ?,
         customerType = COALESCE(?, customerType), pipelineStage = COALESCE(?, pipelineStage),
         salesRefCode = CASE WHEN ? != '' THEN ? ELSE salesRefCode END, lastContactAt = ?
         WHERE customerPhone = ?`,
        [customerName, careStaffId, careStaffName, now, assignedBy, customerType, pipelineStage, salesRefCode, salesRefCode, now, customerPhone],
        (e) => {
          if (e) return cb(e);
          db.get('SELECT * FROM customer_care_assignments WHERE customerPhone = ?', [customerPhone], (e2, row) => cb(e2, row));
        }
      );
    } else {
      db.run(
        `INSERT INTO customer_care_assignments (id, customerPhone, customerName, careStaffId, careStaffName, assignedAt, assignedBy, notes,
         customerType, pipelineStage, salesRefCode, lastContactAt, tags, fbName)
         VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, '[]', '')`,
        [id, customerPhone, customerName, careStaffId, careStaffName, now, assignedBy, customerType, pipelineStage, salesRefCode, now],
        (e) => {
          if (e) return cb(e);
          db.get('SELECT * FROM customer_care_assignments WHERE customerPhone = ?', [customerPhone], (e2, row) => cb(e2, row));
        }
      );
    }
  });
}

app.get('/api/combo-subscriptions', (req, res) => {
  const { careStaffId, status, customerPhone, branchId } = req.query;
  let sql = 'SELECT * FROM combo_subscriptions WHERE 1=1';
  const params = [];
  if (careStaffId) { sql += ' AND careStaffId = ?'; params.push(careStaffId); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (customerPhone) { sql += ' AND customerPhone = ?'; params.push(customerPhone); }
  if (branchId) { sql += ' AND branchId = ?'; params.push(branchId); }
  sql += ' ORDER BY createdAt DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(parseComboRow));
  });
});

app.post('/api/combo-subscriptions', (req, res) => {
  const body = req.body;
  const id = body.id || `COMBO-${Date.now()}`;
  const now = new Date().toISOString();
  const startDate = body.startDate || now;
  const nextDelivery = body.nextDelivery || startDate;
  const deliveryDays = JSON.stringify(body.deliveryDays || [1, 2, 3, 4, 5]);
  const items = JSON.stringify(body.items || body.rawComboData || []);
  const status = body.status || 'pending';
  const durationDays = body.comboDuration === 'monthly' ? 30 : body.comboDuration === 'quarterly' ? 90 : 7;
  const endDate = body.endDate || new Date(new Date(startDate).getTime() + durationDays * 86400000).toISOString();

  const insertCombo = (careStaffId, careStaffName) => {
  const query = `INSERT INTO combo_subscriptions (
    id, orderId, customerName, customerPhone, planName, comboType, comboDuration,
    startDate, nextDelivery, deliveryDays, items, totalPrice, status, branchId,
    deliveryAddress, careStaffId, careStaffName, closedByStaffId, closedByStaffName,
    closedAt, assignedAt, pauseStartDate, pauseEndDate, notes, staff,
    lastDeliveredAt, deliveryLog, totalCups, deliveryTime, shipFee, endDate,
    renewedFromComboId, renewedFromDuration, renewedFromPlanName, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    id, body.orderId || null, normStr(body.customerName), body.customerPhone || '',
    body.planName || '', body.comboType || 'weekly', body.comboDuration || 'weekly',
    startDate, nextDelivery, deliveryDays, items, body.totalPrice || 0, status,
    body.branchId || 'CN1', normStr(body.deliveryAddress) || '',
    careStaffId || body.careStaffId || null, careStaffName || body.careStaffName || null,
    body.closedByStaffId || null, body.closedByStaffName || null,
    body.closedAt || null, body.assignedAt || null,
    body.pauseStartDate || null, body.pauseEndDate || null, body.notes || '',
    normStr(body.staff) || '', null, '[]', body.totalCups || 7, body.deliveryTime || '08:00',
    Number(body.shipFee) || 0, endDate,
    body.renewedFromComboId || null, body.renewedFromDuration || null, body.renewedFromPlanName || null,
    now, now
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], async (e, row) => {
      if (e || !row) return res.status(500).json({ error: 'Failed to fetch created combo' });
      // Combo ban thang tai quay (POS) — da thu tien nen tao ngay o trang thai active,
      // sinh lich giao luon thay vi cho buoc "chot" nhu ben CSKH.
      if (row.status === 'active') {
        try {
          await generateDeliveryLogsForCombo(db, row);
          row = await new Promise((resolve) => {
            db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (e2, row2) => resolve(row2));
          });
        } catch (genErr) {
          console.error('generateDeliveryLogsForCombo (create active):', genErr.message);
        }
      }
      const created = parseComboRow(row);
      if (row.customerPhone && careStaffId && careStaffName) {
        upsertCareAssignment(
          row.customerPhone,
          row.customerName,
          careStaffId,
          careStaffName,
          careStaffId,
          () => {},
          { customerType: 'combo', pipelineStage: status === 'pending' ? 'web_sent' : 'closed_combo', salesRefCode: body.salesRefCode || '' }
        );
      }
      broadcast('COMBO_SUBSCRIPTION_CREATED', created);
      res.status(201).json(created);
    });
  });
  };

  const refCode = body.salesRefCode;
  if (!body.careStaffId && refCode) {
    resolveSalesRef(refCode, (refErr, staff) => {
      if (refErr) return res.status(500).json({ error: refErr.message });
      insertCombo(staff?.id, staff?.fullName);
    });
  } else {
    insertCombo(body.careStaffId, body.careStaffName);
  }
});

app.patch('/api/combo-subscriptions/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Combo not found' });

    const now = new Date().toISOString();
    const merged = {
      ...row,
      ...updates,
      items: updates.items !== undefined ? JSON.stringify(updates.items) : row.items,
      deliveryDays: updates.deliveryDays !== undefined ? JSON.stringify(updates.deliveryDays) : row.deliveryDays,
      deliveryLog: updates.deliveryLog !== undefined ? JSON.stringify(updates.deliveryLog) : row.deliveryLog,
      updatedAt: now,
    };

    db.run(
      `UPDATE combo_subscriptions SET
        customerName = ?, customerPhone = ?, planName = ?, comboType = ?, comboDuration = ?,
        startDate = ?, nextDelivery = ?, deliveryDays = ?, items = ?, totalPrice = ?, status = ?,
        branchId = ?, deliveryAddress = ?, careStaffId = ?, careStaffName = ?,
        closedByStaffId = ?, closedByStaffName = ?, closedAt = ?, assignedAt = ?,
        pauseStartDate = ?, pauseEndDate = ?, notes = ?, staff = ?, lastDeliveredAt = ?, deliveryLog = ?, totalCups = ?, deliveryTime = ?, shipFee = ?, endDate = ?,
        renewedFromComboId = ?, renewedFromDuration = ?, renewedFromPlanName = ?,
        refundAmount = ?, refundedAt = ?, updatedAt = ?
      WHERE id = ?`,
      [
        normStr(merged.customerName ?? row.customerName),
        merged.customerPhone ?? row.customerPhone,
        merged.planName ?? row.planName,
        merged.comboType ?? row.comboType,
        merged.comboDuration ?? row.comboDuration,
        merged.startDate ?? row.startDate,
        merged.nextDelivery ?? row.nextDelivery,
        merged.deliveryDays,
        merged.items,
        merged.totalPrice ?? row.totalPrice,
        merged.status ?? row.status,
        merged.branchId ?? row.branchId,
        normStr(merged.deliveryAddress ?? row.deliveryAddress),
        merged.careStaffId ?? row.careStaffId,
        merged.careStaffName ?? row.careStaffName,
        merged.closedByStaffId ?? row.closedByStaffId,
        merged.closedByStaffName ?? row.closedByStaffName,
        merged.closedAt ?? row.closedAt,
        merged.assignedAt ?? row.assignedAt,
        merged.pauseStartDate ?? row.pauseStartDate,
        merged.pauseEndDate ?? row.pauseEndDate,
        merged.notes ?? row.notes,
        normStr(merged.staff ?? row.staff),
        merged.lastDeliveredAt ?? row.lastDeliveredAt,
        merged.deliveryLog ?? row.deliveryLog ?? '[]',
        merged.totalCups ?? row.totalCups ?? 7,
        merged.deliveryTime ?? row.deliveryTime ?? '08:00',
        merged.shipFee ?? row.shipFee ?? 0,
        merged.endDate ?? row.endDate ?? null,
        merged.renewedFromComboId ?? row.renewedFromComboId ?? null,
        merged.renewedFromDuration ?? row.renewedFromDuration ?? null,
        merged.renewedFromPlanName ?? row.renewedFromPlanName ?? null,
        merged.refundAmount ?? row.refundAmount ?? null,
        merged.refundedAt ?? row.refundedAt ?? null,
        now,
        id,
      ],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], async (e, updated) => {
          if (e || !updated) return res.status(500).json({ error: 'Failed to fetch updated combo' });
          if (updated.status === 'active' && row.status !== 'active') {
            try {
              await generateDeliveryLogsForCombo(db, updated);
              updated = await new Promise((resolve) => {
                db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (err2, row2) => resolve(row2));
              });
            } catch (genErr) {
              console.error('generateDeliveryLogsForCombo:', genErr.message);
            }
          }
          const parsed = parseComboRow(updated);
          broadcast('COMBO_SUBSCRIPTION_UPDATED', parsed);
          res.json(parsed);
        });
      }
    );
  });
});

// Admin: doi chi nhanh phu trach ca combo — keo theo tat ca lich giao con "pending"
// sang chi nhanh moi de dong bo (chi nhanh cu khong con thay trong hang doi/Combo cua ho nua)
app.patch('/api/combo-subscriptions/:id/branch', (req, res) => {
  const { id } = req.params;
  const { branchId } = req.body || {};
  if (!branchId) return res.status(400).json({ error: 'branchId required' });
  const now = new Date().toISOString();
  db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Combo not found' });
    db.run(
      'UPDATE combo_subscriptions SET branchId = ?, updatedAt = ? WHERE id = ?',
      [branchId, now, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        db.run(
          `UPDATE delivery_logs SET branch_id = ?, updated_at = ? WHERE combo_order_id = ? AND status = 'pending'`,
          [branchId, now, id],
          (logErr) => {
            if (logErr) return res.status(500).json({ error: logErr.message });
            db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (e, updated) => {
              if (e || !updated) return res.status(500).json({ error: 'Failed to fetch updated combo' });
              const parsed = parseComboRow(updated);
              broadcast('COMBO_SUBSCRIPTION_UPDATED', parsed);
              res.json(parsed);
            });
          }
        );
      }
    );
  });
});

app.post('/api/combo-subscriptions/:id/claim', (req, res) => {
  const { id } = req.params;
  const { employeeId, employeeName } = req.body;
  if (!employeeId || !employeeName) {
    return res.status(400).json({ error: 'employeeId and employeeName required' });
  }
  const now = new Date().toISOString();
  db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Combo not found' });
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'Combo da duoc chot hoac khong con cho xu ly' });
    }
    db.run(
      `UPDATE combo_subscriptions SET status = 'active', careStaffId = ?, careStaffName = ?,
       closedByStaffId = ?, closedByStaffName = ?, closedAt = ?, assignedAt = ?, updatedAt = ? WHERE id = ?`,
      [employeeId, employeeName, employeeId, employeeName, now, now, now, id],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        upsertCareAssignment(
          row.customerPhone,
          row.customerName,
          employeeId,
          employeeName,
          employeeId,
          (assignErr, assignment) => {
          if (assignErr) return res.status(500).json({ error: assignErr.message });
          db.run(
            `UPDATE customer_care_assignments SET customerType='combo', pipelineStage='closed_combo', lastContactAt=? WHERE customerPhone=?`,
            [now, row.customerPhone]
          );
          logSalesActivity(db, {
            customerPhone: row.customerPhone,
            careStaffId: employeeId,
            careStaffName: employeeName,
            activityType: 'claim',
            content: `Chốt combo ${row.planName || id} — ${(row.totalPrice || 0).toLocaleString('vi-VN')}đ`,
          }, () => {});
          db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], async (e, updated) => {
            if (updated) {
              try {
                await afterComboClaimed(db, updated);
              } catch (claimErr) {
                console.error('afterComboClaimed:', claimErr.message);
              }
            }
            const fresh = await new Promise((resolve) => {
              db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (err2, row2) => resolve(row2));
            });
            const parsed = parseComboRow(fresh || updated);
            broadcast('COMBO_SUBSCRIPTION_UPDATED', parsed);
            if (assignment) broadcast('CARE_ASSIGNMENT_UPDATED', parseAssignmentRow(assignment));
            res.json(parsed);
          });
        },
          { customerType: 'combo', pipelineStage: 'closed_combo' }
        );
      }
    );
  });
});

app.get('/api/customer-care/assignments', (req, res) => {
  const { careStaffId } = req.query;
  let sql = 'SELECT * FROM customer_care_assignments';
  const params = [];
  if (careStaffId) { sql += ' WHERE careStaffId = ?'; params.push(careStaffId); }
  sql += ' ORDER BY assignedAt DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(parseAssignmentRow));
  });
});

app.post('/api/customer-care/assignments', (req, res) => {
  const { customerPhone, customerName, careStaffId, careStaffName, assignedBy, notes } = req.body;
  if (!customerPhone || !careStaffId || !careStaffName) {
    return res.status(400).json({ error: 'customerPhone, careStaffId, careStaffName required' });
  }
  upsertCareAssignment(customerPhone, customerName || '', careStaffId, careStaffName, assignedBy || 'admin', (err, assignment) => {
    if (err) return res.status(500).json({ error: err.message });
    if (notes) {
      db.run('UPDATE customer_care_assignments SET notes = ? WHERE customerPhone = ?', [notes, customerPhone]);
    }
    db.all(
      `SELECT id FROM combo_subscriptions WHERE customerPhone = ? AND status IN ('pending', 'active', 'paused')`,
      [customerPhone],
      (_, comboRows) => {
        const now = new Date().toISOString();
        comboRows.forEach((c) => {
          db.run(
            `UPDATE combo_subscriptions SET careStaffId = ?, careStaffName = ?, assignedAt = ?, updatedAt = ? WHERE id = ?`,
            [careStaffId, careStaffName, now, now, c.id]
          );
        });
        const parsed = parseAssignmentRow({ ...assignment, notes: notes || '' });
        broadcast('CARE_ASSIGNMENT_UPDATED', parsed);
        res.status(201).json(parsed);
      }
    );
  });
});

app.patch('/api/customer-care/assignments/:phone', (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const { careStaffId, careStaffName, assignedBy, notes } = req.body;
  if (!careStaffId || !careStaffName) {
    return res.status(400).json({ error: 'careStaffId and careStaffName required' });
  }
  db.get('SELECT * FROM customer_care_assignments WHERE customerPhone = ?', [phone], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const customerName = row?.customerName || req.body.customerName || '';
    upsertCareAssignment(phone, customerName, careStaffId, careStaffName, assignedBy || 'admin', (assignErr, assignment) => {
      if (assignErr) return res.status(500).json({ error: assignErr.message });
      const now = new Date().toISOString();
      db.run(
        `UPDATE combo_subscriptions SET careStaffId = ?, careStaffName = ?, assignedAt = ?, updatedAt = ? WHERE customerPhone = ? AND status IN ('pending', 'active', 'paused')`,
        [careStaffId, careStaffName, now, now, phone],
        () => {
          if (notes !== undefined) {
            db.run('UPDATE customer_care_assignments SET notes = ? WHERE customerPhone = ?', [notes, phone]);
          }
          broadcast('CARE_ASSIGNMENT_UPDATED', parseAssignmentRow(assignment));
          res.json(parseAssignmentRow(assignment));
        }
      );
    });
  });
});

// Health check for Render / monitoring
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

async function start() {
  try {
    db = await initDatabase();
    registerOnlineSalesRoutes(app, db, broadcast, {
      parseAssignmentRow,
      upsertCareAssignment,
    });
    registerComboDeliveryRoutes(app, db, { parseComboRow, broadcast });
    registerCskhRoutes(app, db, { broadcast });
    registerBackupRoutes(app, db);
    initBranchInventory(db).catch((err) => console.error('branch inventory init:', err.message));

    // Phục vụ frontend đã build (npm run build ở thư mục gốc tạo ra dist/)
    // — gộp web + API vào 1 service Railway duy nhất, không cần Vercel nữa.
    const distDir = path.join(__dirname, '../dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distDir, 'index.html'));
      });
      console.log('Da phuc vu frontend tinh tu', distDir);
    } else {
      console.warn('Khong tim thay dist/ — chay `npm run build` o thu muc goc truoc khi start de phuc vu frontend.');
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
