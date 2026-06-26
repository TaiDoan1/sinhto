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
const {
  initBranchInventory,
  getInventoryForBranch,
  getMovementsForBranch,
  applyBranchInventoryUpdate,
  seedBranchRowsForItem,
} = require('./branchInventory');
const { normalizePhoneVN, phonesMatch } = require('./phoneUtils');

const app = express();
const PORT = process.env.PORT || 5005;
let db;

app.use(cors());
app.use(express.json());

// Initialize uploads folder for storing images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
// Serve uploads folder as a static route
app.use('/uploads', express.static(uploadsDir));

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
  const fileUrl = `/uploads/${req.file.filename}`;
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
  const { branchId } = req.query;
  let sql = 'SELECT * FROM orders';
  const params = [];
  if (branchId) {
    sql += ' WHERE branchId = ?';
    params.push(branchId);
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

  const finishInsert = (salesStaffId, salesStaffName) => {
    const query = `INSERT INTO orders (
      id, branchId, source, items, time, status, total, staff, paidAt, readyAt, completedAt, orderNumber, customerName, customerPhone,
      deliveryAddress, shipperName, shipperId, paymentMethod, stockDeducted, salesStaffId, salesStaffName
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
    ], function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const createdOrder = {
        ...order,
        id,
        time: new Date(time),
        orderNumber,
        salesStaffId: salesStaffId || order.salesStaffId || '',
        salesStaffName: salesStaffName || order.salesStaffName || '',
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

  const refCode = order.salesRefCode || order.salesStaffRef;
  if (!order.salesStaffId && refCode) {
    resolveSalesRef(refCode, (refErr, staff) => {
      if (refErr) return res.status(500).json({ error: refErr.message });
      finishInsert(staff?.id, staff?.fullName);
    });
  } else {
    finishInsert(order.salesStaffId, order.salesStaffName);
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
        `INSERT INTO inventory_movements (id, timestamp, type, "orderId", "itemId", "itemName", quantity, reason, "performedBy", cost, "branchId")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
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
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
  }
  db.get("SELECT * FROM employees WHERE username = ?", [username.trim()], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || !verifyPassword(password, row.password)) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    const employee = parseEmployeeRow(row);
    res.json(employee);
  });
});

function parseEmployeeRow(row) {
  if (!row) return row;
  const employee = { ...row };
  delete employee.password;
  try { employee.customData = JSON.parse(employee.customData || '{}'); } catch { employee.customData = {}; }
  return employee;
}

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
  db.run(
    `INSERT INTO employees (id, fullName, employeeId, email, phone, idNumber, dateOfBirth, address, branch, position, baseSalary, startDate, username, password, photo, customData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, e.username, storedPassword, e.photo || '', customData],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = parseEmployeeRow({ ...e, id, customData: e.customData || {} });
      broadcast('EMPLOYEE_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const e = normalizeEmployee(req.body);
  const customData = typeof e.customData === 'object' ? JSON.stringify(e.customData || {}) : (e.customData || '{}');
  const storedPassword = e.password ? prepareEmployeePassword(e.password) : undefined;
  db.get('SELECT password FROM employees WHERE id = ?', [id], (getErr, existing) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    const passwordToSave = storedPassword || existing.password;
  db.run(
    `UPDATE employees SET fullName = ?, employeeId = ?, email = ?, phone = ?, idNumber = ?, dateOfBirth = ?, address = ?, branch = ?, position = ?, baseSalary = ?, startDate = ?, username = ?, password = ?, photo = ?, customData = ? WHERE id = ?`,
    [e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, e.username, passwordToSave, e.photo || '', customData, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
      const updated = parseEmployeeRow({ ...e, id, customData: e.customData || {} });
      broadcast('EMPLOYEE_UPDATED', updated);
      res.json(updated);
    }
  );
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

app.post('/api/shifts', (req, res) => {
  const s = normalizeShift(req.body);
  const id = s.id || `SHIFT-${Date.now()}`;
  db.run(
    `INSERT INTO shifts (id, employeeId, employeeName, date, shiftType, startTime, endTime, status, checkIn, checkOut, branch, requestedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, s.employeeId, s.employeeName, s.date, s.shiftType || '', s.startTime, s.endTime, s.status || 'scheduled', s.checkIn || '', s.checkOut || '', s.branch || '', s.requestedBy || 'admin'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = { ...s, id };
      broadcast('SHIFT_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.put('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  const s = normalizeShift(req.body);
  db.run(
    `UPDATE shifts SET employeeId = ?, employeeName = ?, date = ?, shiftType = ?, startTime = ?, endTime = ?, status = ?, checkIn = ?, checkOut = ?, branch = ?, requestedBy = ? WHERE id = ?`,
    [s.employeeId, s.employeeName, s.date, s.shiftType || '', s.startTime, s.endTime, s.status, s.checkIn || '', s.checkOut || '', s.branch || '', s.requestedBy || 'admin', id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy ca làm' });
      const updated = { ...s, id };
      broadcast('SHIFT_UPDATED', updated);
      res.json(updated);
    }
  );
});

app.patch('/api/shifts/:id/checkin', (req, res) => {
  const { id } = req.params;
  const { action, photo } = req.body;
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
    db.run(
      `UPDATE shifts SET checkIn = ?, checkOut = ?, status = ?, checkInPhoto = ?, checkOutPhoto = ? WHERE id = ?`,
      [updated.checkIn || '', updated.checkOut || '', updated.status, updated.checkInPhoto || '', updated.checkOutPhoto || '', id],
      function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        broadcast('SHIFT_UPDATED', updated);
        res.json(updated);
      }
    );
  });
});

app.delete('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM shifts WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('SHIFT_DELETED', { id });
    res.json({ success: true });
  });
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
    "INSERT INTO settings (key, value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
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

function resolveSalesRef(username, cb) {
  if (!username) return cb(null, null);
  db.get(
    "SELECT id, fullName, username FROM employees WHERE username = ? AND position IN ('online_sales', 'customer_care')",
    [String(username).trim()],
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

  const insertCombo = (careStaffId, careStaffName) => {
  const query = `INSERT INTO combo_subscriptions (
    id, orderId, customerName, customerPhone, planName, comboType, comboDuration,
    startDate, nextDelivery, deliveryDays, items, totalPrice, status, branchId,
    deliveryAddress, careStaffId, careStaffName, closedByStaffId, closedByStaffName,
    closedAt, assignedAt, pauseStartDate, pauseEndDate, notes, staff,
    lastDeliveredAt, deliveryLog, totalCups, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    id, body.orderId || null, normStr(body.customerName), body.customerPhone || '',
    body.planName || '', body.comboType || 'weekly', body.comboDuration || 'weekly',
    startDate, nextDelivery, deliveryDays, items, body.totalPrice || 0, status,
    body.branchId || 'CN1', normStr(body.deliveryAddress) || '',
    careStaffId || body.careStaffId || null, careStaffName || body.careStaffName || null,
    body.closedByStaffId || null, body.closedByStaffName || null,
    body.closedAt || null, body.assignedAt || null,
    body.pauseStartDate || null, body.pauseEndDate || null, body.notes || '',
    normStr(body.staff) || '', null, '[]', body.totalCups || 7, now, now
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM combo_subscriptions WHERE id = ?', [id], (e, row) => {
      if (e || !row) return res.status(500).json({ error: 'Failed to fetch created combo' });
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
        pauseStartDate = ?, pauseEndDate = ?, notes = ?, staff = ?, lastDeliveredAt = ?, deliveryLog = ?, totalCups = ?, updatedAt = ?
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
    initBranchInventory(db).catch((err) => console.error('branch inventory init:', err.message));
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
