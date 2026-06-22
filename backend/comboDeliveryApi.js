/**
 * Combo delivery logs — normalized schedule + deliver/postpone/branch flows.
 */

const DAY_MAP = [1, 2, 3, 4, 5, 6, 0];

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function normalizeItems(items) {
  const arr = parseJson(items, []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const productName =
        item.product?.name || item.productName || item.name || '';
      if (!productName) return null;
      return {
        assignedDay: item.assignedDay ?? DAY_MAP[idx % 7],
        productName,
        productId: item.product?.id || item.productId || '',
        size: item.size || '360ml',
        protein: item.protein ?? 40,
        toppings: item.toppings || [],
      };
    })
    .filter(Boolean);
}

function deriveDeliveryDays(items, fallback) {
  const fb = parseJson(fallback, []);
  if (Array.isArray(fb) && fb.length) return fb;
  const days = [...new Set(items.map((i) => i.assignedDay))].sort((a, b) => a - b);
  return days.length ? days : [1, 2, 3, 4, 5];
}

function itemForDate(items, dateStr) {
  const d = new Date(dateStr);
  const dow = d.getDay();
  return items.find((i) => i.assignedDay === dow) || items[0] || null;
}

function generateDeliveryDates(startDateStr, deliveryDays, totalCups) {
  const dates = [];
  const start = new Date(startDateStr || Date.now());
  start.setHours(0, 0, 0, 0);
  const cursor = new Date(start);
  let guard = 0;
  while (dates.length < totalCups && guard < 500) {
    if (deliveryDays.includes(cursor.getDay())) {
      dates.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function parseDeliveryLogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    comboOrderId: row.combo_order_id,
    branchId: row.branch_id,
    deliveryDate: row.delivery_date,
    scheduledDayIndex: row.scheduled_day_index,
    productId: row.product_id,
    productName: row.product_name,
    size: row.size,
    protein: row.protein,
    toppings: parseJson(row.toppings, []),
    flavorNote: row.flavor_note,
    status: row.status,
    performedBy: row.performed_by,
    performedAt: row.performed_at,
    postponedFromId: row.postponed_from_id,
    inventoryDeducted: !!row.inventory_deducted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    planName: row.planName,
    deliveryAddress: row.deliveryAddress,
    careStaffId: row.careStaffId,
    totalCups: row.totalCups,
    deliveredCups: row.deliveredCups,
    comboStatus: row.comboStatus,
  };
}

function SCHEMA_STATEMENTS() {
  return [
    `CREATE TABLE IF NOT EXISTS delivery_logs (
      id TEXT PRIMARY KEY,
      combo_order_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      scheduled_day_index INTEGER,
      product_id TEXT,
      product_name TEXT,
      size TEXT,
      protein INTEGER,
      toppings TEXT DEFAULT '[]',
      flavor_note TEXT,
      status TEXT DEFAULT 'pending',
      performed_by TEXT,
      performed_at TEXT,
      postponed_from_id TEXT,
      inventory_deducted INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS combo_transfers (
      id TEXT PRIMARY KEY,
      combo_order_id TEXT NOT NULL,
      from_sales_id TEXT,
      from_sales_name TEXT,
      to_sales_id TEXT NOT NULL,
      to_sales_name TEXT NOT NULL,
      transferred_by TEXT,
      transferred_at TEXT,
      note TEXT
    )`,
    'ALTER TABLE combo_subscriptions ADD COLUMN deliveredCups INTEGER DEFAULT 0',
    'ALTER TABLE combo_subscriptions ADD COLUMN commissionAmount INTEGER DEFAULT 0',
    'ALTER TABLE combo_subscriptions ADD COLUMN commissionStatus TEXT DEFAULT \'pending\'',
  ];
}

async function ensureComboDeliverySchema(db) {
  for (const sql of SCHEMA_STATEMENTS()) {
    await dbRun(db, sql).catch(() => {});
  }
}

async function syncComboFromLogs(db, comboOrderId) {
  const combo = await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [comboOrderId]);
  if (!combo) return;

  const logs = await dbAll(
    db,
    `SELECT * FROM delivery_logs WHERE combo_order_id = ? ORDER BY delivery_date ASC, created_at ASC`,
    [comboOrderId]
  );

  const deliveredLogs = logs.filter((l) => l.status === 'delivered');
  const deliveredCups = deliveredLogs.length;
  const totalCups = combo.totalCups != null ? Number(combo.totalCups) : 7;

  const deliveryLogJson = deliveredLogs.map((l) => ({
    date: l.delivery_date,
    productName: l.product_name,
    size: l.size,
    protein: l.protein,
    toppings: parseJson(l.toppings, []),
    address: combo.deliveryAddress,
    performedBy: l.performed_by || '',
    branchId: l.branch_id,
    note: l.flavor_note || '',
    deliveryLogId: l.id,
  }));

  const lastDelivered = deliveredLogs.length
    ? deliveredLogs[deliveredLogs.length - 1].performed_at || new Date().toISOString()
    : combo.lastDeliveredAt;

  const pending = logs.filter((l) => l.status === 'pending');
  const nextDelivery = pending[0]?.delivery_date || combo.nextDelivery;

  let status = combo.status;
  if (deliveredCups >= totalCups && combo.status === 'active') status = 'completed';

  const now = new Date().toISOString();
  await dbRun(
    db,
    `UPDATE combo_subscriptions SET deliveredCups = ?, deliveryLog = ?, lastDeliveredAt = ?,
     nextDelivery = ?, status = ?, updatedAt = ? WHERE id = ?`,
    [
      deliveredCups,
      JSON.stringify(deliveryLogJson),
      lastDelivered,
      nextDelivery,
      status,
      now,
      comboOrderId,
    ]
  );
}

async function insertDeliveryLog(db, payload) {
  const id = payload.id || `DL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  await dbRun(
    db,
    `INSERT INTO delivery_logs (
      id, combo_order_id, branch_id, delivery_date, scheduled_day_index,
      product_id, product_name, size, protein, toppings, flavor_note, status,
      performed_by, performed_at, postponed_from_id, inventory_deducted, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      payload.comboOrderId,
      payload.branchId,
      payload.deliveryDate,
      payload.scheduledDayIndex ?? null,
      payload.productId || '',
      payload.productName || '',
      payload.size || '360ml',
      payload.protein ?? 40,
      JSON.stringify(payload.toppings || []),
      payload.flavorNote || '',
      payload.status || 'pending',
      payload.performedBy || '',
      payload.performedAt || '',
      payload.postponedFromId || '',
      payload.inventoryDeducted ? 1 : 0,
      now,
      now,
    ]
  );
  return id;
}

async function generateDeliveryLogsForCombo(db, comboRow) {
  const existing = await dbGet(
    db,
    'SELECT COUNT(*) AS c FROM delivery_logs WHERE combo_order_id = ?',
    [comboRow.id]
  );
  if (existing && Number(existing.c) > 0) return;

  const items = normalizeItems(comboRow.items);
  const deliveryDays = deriveDeliveryDays(items, comboRow.deliveryDays);
  const totalCups = comboRow.totalCups != null ? Number(comboRow.totalCups) : items.length || 7;
  const legacyLog = parseJson(comboRow.deliveryLog, []);
  const deliveredDates = new Set(legacyLog.map((e) => e.date));

  const allDates = generateDeliveryDates(comboRow.startDate, deliveryDays, totalCups);

  for (const date of allDates) {
    const item = itemForDate(items, date);
    const isDelivered = deliveredDates.has(date);
    await insertDeliveryLog(db, {
      comboOrderId: comboRow.id,
      branchId: comboRow.branchId || 'CN1',
      deliveryDate: date,
      scheduledDayIndex: new Date(date).getDay(),
      productId: item?.productId,
      productName: item?.productName || comboRow.planName || 'FitBlend',
      size: item?.size,
      protein: item?.protein,
      toppings: item?.toppings,
      status: isDelivered ? 'delivered' : 'pending',
      performedBy: isDelivered ? (legacyLog.find((e) => e.date === date)?.performedBy || 'migrate') : '',
      performedAt: isDelivered ? new Date().toISOString() : '',
      inventoryDeducted: isDelivered ? 1 : 0,
    });
  }

  await syncComboFromLogs(db, comboRow.id);
}

async function migrateAllComboDeliveryLogs(db) {
  const combos = await dbAll(db, 'SELECT * FROM combo_subscriptions');
  for (const combo of combos) {
    const cnt = await dbGet(
      db,
      'SELECT COUNT(*) AS c FROM delivery_logs WHERE combo_order_id = ?',
      [combo.id]
    );
    if (Number(cnt?.c || 0) === 0) {
      await generateDeliveryLogsForCombo(db, combo);
    }
  }
}

async function afterComboClaimed(db, comboRow) {
  await generateDeliveryLogsForCombo(db, comboRow);
  const commissionAmount = Math.round((comboRow.totalPrice || 0) * 0.05);
  await dbRun(
    db,
    `UPDATE combo_subscriptions SET commissionAmount = ?, commissionStatus = 'approved', updatedAt = ? WHERE id = ?`,
    [commissionAmount, new Date().toISOString(), comboRow.id]
  );
}

function registerComboDeliveryRoutes(app, db, { parseComboRow, broadcast }) {
  ensureComboDeliverySchema(db)
    .then(() => migrateAllComboDeliveryLogs(db))
    .catch((err) => console.error('Combo delivery migration:', err.message));

  app.get('/api/delivery-logs', async (req, res) => {
    try {
      const { branchId, date, comboOrderId, status, careStaffId } = req.query;
      let sql = `
        SELECT dl.*, cs.customerName, cs.customerPhone, cs.planName, cs.deliveryAddress,
               cs.careStaffId, cs.totalCups, cs.deliveredCups, cs.status AS comboStatus
        FROM delivery_logs dl
        JOIN combo_subscriptions cs ON cs.id = dl.combo_order_id
        WHERE 1=1`;
      const params = [];
      if (branchId) { sql += ' AND dl.branch_id = ?'; params.push(branchId); }
      if (date) { sql += ' AND dl.delivery_date = ?'; params.push(date); }
      if (comboOrderId) { sql += ' AND dl.combo_order_id = ?'; params.push(comboOrderId); }
      if (status) { sql += ' AND dl.status = ?'; params.push(status); }
      if (careStaffId) { sql += ' AND cs.careStaffId = ?'; params.push(careStaffId); }
      sql += ' ORDER BY dl.delivery_date ASC, dl.created_at ASC';
      const rows = await dbAll(db, sql, params);
      res.json(rows.map(parseDeliveryLogRow));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/delivery-logs/:id/deliver', async (req, res) => {
    try {
      const { id } = req.params;
      const { performedBy, branchId, flavorNote, inventoryDeducted } = req.body || {};
      const log = await dbGet(db, 'SELECT * FROM delivery_logs WHERE id = ?', [id]);
      if (!log) return res.status(404).json({ error: 'Delivery log not found' });
      if (log.status === 'delivered') return res.status(400).json({ error: 'Da giao roi' });
      if (!['pending', 'shipping'].includes(log.status)) {
        return res.status(400).json({ error: 'Khong the giao tu trang thai nay' });
      }

      const now = new Date().toISOString();
      await dbRun(
        db,
        `UPDATE delivery_logs SET status = 'delivered', performed_by = ?, performed_at = ?,
         branch_id = COALESCE(?, branch_id), flavor_note = COALESCE(?, flavor_note),
         inventory_deducted = ?, updated_at = ? WHERE id = ?`,
        [
          performedBy || 'system',
          now,
          branchId || log.branch_id,
          flavorNote || '',
          inventoryDeducted ? 1 : 0,
          now,
          id,
        ]
      );

      await syncComboFromLogs(db, log.combo_order_id);
      const combo = await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [log.combo_order_id]);
      const parsed = parseComboRow(combo);
      broadcast('COMBO_SUBSCRIPTION_UPDATED', parsed);
      const updatedLog = await dbGet(db, 'SELECT * FROM delivery_logs WHERE id = ?', [id]);
      res.json({ log: parseDeliveryLogRow(updatedLog), combo: parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/delivery-logs/:id/postpone', async (req, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body || {};
      const log = await dbGet(db, 'SELECT * FROM delivery_logs WHERE id = ?', [id]);
      if (!log) return res.status(404).json({ error: 'Delivery log not found' });
      if (log.status !== 'pending') {
        return res.status(400).json({ error: 'Chi hoan duoc lich pending' });
      }

      const now = new Date().toISOString();
      await dbRun(
        db,
        `UPDATE delivery_logs SET status = 'postponed', flavor_note = ?, updated_at = ? WHERE id = ?`,
        [note ? `Hoan: ${note}` : 'Hoan giao', now, id]
      );

      const combo = await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [log.combo_order_id]);
      const items = normalizeItems(combo.items);
      const newDate = addDays(log.delivery_date, 1);
      const item = itemForDate(items, newDate);

      const newId = await insertDeliveryLog(db, {
        comboOrderId: log.combo_order_id,
        branchId: log.branch_id,
        deliveryDate: newDate,
        scheduledDayIndex: new Date(newDate).getDay(),
        productId: item?.productId,
        productName: item?.productName || combo.planName,
        size: item?.size,
        protein: item?.protein,
        toppings: item?.toppings,
        status: 'pending',
        postponedFromId: id,
        flavorNote: note || '',
      });

      await syncComboFromLogs(db, log.combo_order_id);
      const parsed = parseComboRow(await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [log.combo_order_id]));
      broadcast('COMBO_SUBSCRIPTION_UPDATED', parsed);
      const newLog = await dbGet(db, 'SELECT * FROM delivery_logs WHERE id = ?', [newId]);
      res.json({ postponed: parseDeliveryLogRow(log), newLog: parseDeliveryLogRow(newLog), combo: parsed });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/delivery-logs/:id/branch', async (req, res) => {
    try {
      const { id } = req.params;
      const { branchId } = req.body || {};
      if (!branchId) return res.status(400).json({ error: 'branchId required' });

      const log = await dbGet(db, 'SELECT * FROM delivery_logs WHERE id = ?', [id]);
      if (!log) return res.status(404).json({ error: 'Delivery log not found' });
      if (log.status !== 'pending') {
        return res.status(400).json({ error: 'Chi doi chi nhanh khi pending' });
      }

      const now = new Date().toISOString();
      await dbRun(
        db,
        'UPDATE delivery_logs SET branch_id = ?, updated_at = ? WHERE id = ?',
        [branchId, now, id]
      );
      const updated = await dbGet(db, 'SELECT * FROM delivery_logs WHERE id = ?', [id]);
      res.json(parseDeliveryLogRow(updated));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/combo-subscriptions/transfer-sales', async (req, res) => {
    try {
      const { comboIds, toSalesId, toSalesName, transferredBy, note } = req.body || {};
      if (!Array.isArray(comboIds) || !comboIds.length || !toSalesId || !toSalesName) {
        return res.status(400).json({ error: 'comboIds, toSalesId, toSalesName required' });
      }

      const now = new Date().toISOString();
      const results = [];

      for (const comboId of comboIds) {
        const combo = await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [comboId]);
        if (!combo || !['active', 'paused'].includes(combo.status)) continue;

        const transferId = `CT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await dbRun(
          db,
          `INSERT INTO combo_transfers (id, combo_order_id, from_sales_id, from_sales_name, to_sales_id, to_sales_name, transferred_by, transferred_at, note)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            transferId,
            comboId,
            combo.careStaffId || '',
            combo.careStaffName || '',
            toSalesId,
            toSalesName,
            transferredBy || 'admin',
            now,
            note || '',
          ]
        );

        await dbRun(
          db,
          `UPDATE combo_subscriptions SET careStaffId = ?, careStaffName = ?, assignedAt = ?, updatedAt = ? WHERE id = ?`,
          [toSalesId, toSalesName, now, now, comboId]
        );

        const updated = parseComboRow(await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [comboId]));
        broadcast('COMBO_SUBSCRIPTION_UPDATED', updated);
        results.push(updated);
      }

      res.json({ transferred: results.length, combos: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/combo-subscriptions/:id/commission', async (req, res) => {
    try {
      const { id } = req.params;
      const { commissionStatus, commissionAmount } = req.body || {};
      if (!commissionStatus) return res.status(400).json({ error: 'commissionStatus required' });

      const combo = await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [id]);
      if (!combo) return res.status(404).json({ error: 'Combo not found' });

      const now = new Date().toISOString();
      await dbRun(
        db,
        `UPDATE combo_subscriptions SET commissionStatus = ?,
         commissionAmount = COALESCE(?, commissionAmount), updatedAt = ? WHERE id = ?`,
        [commissionStatus, commissionAmount ?? null, now, id]
      );

      const parsed = parseComboRow(await dbGet(db, 'SELECT * FROM combo_subscriptions WHERE id = ?', [id]));
      broadcast('COMBO_SUBSCRIPTION_UPDATED', parsed);
      res.json(parsed);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = {
  registerComboDeliveryRoutes,
  afterComboClaimed,
  ensureComboDeliverySchema,
  generateDeliveryLogsForCombo,
  syncComboFromLogs,
};
