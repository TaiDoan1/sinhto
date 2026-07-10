const { v4: uuidv4 } = require('uuid');

function registerCskhRoutes(app, db, { broadcast }) {
  // ============ CSKH CHECK-IN/OUT ============

  // Get CSKH check-in/out records
  app.get('/api/cskh/checkins', (req, res) => {
    const { cskhId, date, branchId } = req.query;
    let sql = 'SELECT * FROM cskh_checkins WHERE 1=1';
    const params = [];

    if (cskhId) {
      sql += ' AND cskhId = ?';
      params.push(cskhId);
    }
    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    if (branchId) {
      sql += ' AND branchId = ?';
      params.push(branchId);
    }

    sql += ' ORDER BY checkinTime DESC';

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // CSKH check-in
  app.post('/api/cskh/checkin', (req, res) => {
    const { cskhId, cskhName, branchId, notes } = req.body;
    if (!cskhId || !cskhName) {
      return res.status(400).json({ error: 'cskhId and cskhName required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const date = new Date().toISOString().split('T')[0];

    const sql = `INSERT INTO cskh_checkins (id, cskhId, cskhName, checkinTime, status, date, branchId, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`;

    const params = [id, cskhId, cskhName, now, 'active', date, branchId || null, notes || null, now];

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const checkin = rows?.[0] || { id, cskhId, cskhName, checkinTime: now, status: 'active', date, branchId };
      broadcast('CSKH_CHECKIN', checkin);
      res.status(201).json(checkin);
    });
  });

  // CSKH check-out
  app.patch('/api/cskh/checkout/:checkinId', (req, res) => {
    const { checkinId } = req.params;
    const { notes } = req.body;
    const now = new Date().toISOString();

    const sql = `UPDATE cskh_checkins SET checkoutTime = ?, status = ?, notes = ? WHERE id = ? RETURNING *`;

    const params = [now, 'completed', notes || null, checkinId];

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const checkout = rows?.[0];
      if (!checkout) return res.status(404).json({ error: 'Check-in not found' });
      broadcast('CSKH_CHECKOUT', checkout);
      res.json(checkout);
    });
  });

  // ============ ONLINE ORDER CREATION (POS-STYLE) ============

  // Create online order from CSKH
  app.post('/api/orders/online', (req, res) => {
    const {
      customerPhone,
      customerName,
      items,
      deliveryTime,
      deliveryAddress,
      branchId,
      cskhId,
      cskhName,
      notes,
      totalPrice,
    } = req.body;

    if (!customerPhone || !items || !deliveryTime) {
      return res.status(400).json({ error: 'customerPhone, items, deliveryTime required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const sql = `INSERT INTO combo_subscriptions (
          id, customerPhone, customerName, items, nextDelivery,
          deliveryDays, status, branchId, deliveryAddress,
          careStaffId, careStaffName, notes, totalPrice, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`;

    const params = [
      id,
      customerPhone,
      customerName || '',
      JSON.stringify(items),
      deliveryTime,
      JSON.stringify([]),
      'active',
      branchId || 'CN1',
      deliveryAddress || '',
      cskhId || '',
      cskhName || '',
      notes || '',
      totalPrice || 0,
      now,
      now,
    ];

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const order = rows?.[0];
      broadcast('ONLINE_ORDER_CREATED', order);
      res.status(201).json(order);
    });
  });

  // Get online orders for CSKH
  app.get('/api/orders/online', (req, res) => {
    const { cskhId, status, customerPhone } = req.query;
    let sql = `SELECT * FROM combo_subscriptions WHERE 1=1`;
    const params = [];

    if (cskhId) {
      sql += ' AND careStaffId = ?';
      params.push(cskhId);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (customerPhone) {
      sql += ' AND customerPhone LIKE ?';
      params.push(`%${customerPhone}%`);
    }

    sql += ' ORDER BY createdAt DESC LIMIT 100';

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        (rows || []).map((r) => ({
          ...r,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
        }))
      );
    });
  });

  // ============ DELIVERY ALERTS ============

  // Create delivery alert (1h before delivery)
  app.post('/api/delivery-alerts', (req, res) => {
    const { comboOrderId, customerName, customerPhone, deliveryTime, alertMethod } = req.body;

    if (!comboOrderId || !deliveryTime) {
      return res.status(400).json({ error: 'comboOrderId and deliveryTime required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const deliveryDate = new Date(deliveryTime);
    const alertTime = new Date(deliveryDate.getTime() - 60 * 60 * 1000); // 1 hour before
    const scheduledAlertTime = alertTime.toISOString();

    const sql = `INSERT INTO delivery_alerts (
          id, comboOrderId, customerName, customerPhone, deliveryTime,
          scheduledAlertTime, status, alertMethod, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`;

    const params = [
      id,
      comboOrderId,
      customerName || '',
      customerPhone || '',
      deliveryTime,
      scheduledAlertTime,
      'pending',
      alertMethod || 'email,zalo',
      now,
    ];

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const alert = rows?.[0];
      broadcast('DELIVERY_ALERT_CREATED', alert);
      res.status(201).json(alert);
    });
  });

  // Get pending delivery alerts
  app.get('/api/delivery-alerts/pending', (req, res) => {
    const sql = `SELECT * FROM delivery_alerts WHERE status = 'pending' ORDER BY scheduledAlertTime ASC`;

    db.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // Mark alert as sent
  app.patch('/api/delivery-alerts/:alertId', (req, res) => {
    const { alertId } = req.params;
    const { sentTo } = req.body;
    const now = new Date().toISOString();

    const sql = `UPDATE delivery_alerts SET status = ?, sentAt = ?, sentTo = ? WHERE id = ? RETURNING *`;

    const params = ['sent', now, sentTo || '', alertId];

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const alert = rows?.[0];
      if (!alert) return res.status(404).json({ error: 'Alert not found' });
      broadcast('DELIVERY_ALERT_SENT', alert);
      res.json(alert);
    });
  });

  // ============ UPDATE CUSTOMER PLATFORM ============

  // Update customer platform (Facebook, Zalo, etc)
  app.patch('/api/customer-care/assignments/:phone/platform', (req, res) => {
    const phone = decodeURIComponent(req.params.phone);
    const { platform } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'platform required' });
    }

    const sql = `UPDATE customer_care_assignments SET platform = ? WHERE customerPhone = ? RETURNING *`;

    const params = [platform, phone];

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const assignment = rows?.[0];
      if (!assignment) return res.status(404).json({ error: 'Customer not found' });
      broadcast('CUSTOMER_PLATFORM_UPDATED', assignment);
      res.json(assignment);
    });
  });
}

module.exports = { registerCskhRoutes };
