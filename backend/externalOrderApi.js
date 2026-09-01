/**
 * Cổng nhận đơn NGOÀI (webhook) — chủ yếu cho đơn GrabFood đẩy về qua dịch vụ trung gian
 * (Analy/Pancake/Nhanh…) hoặc Grab Partner API. Đơn nhận được tạo thẳng vào bảng orders với
 * source='grab' → hiện ngay ở hàng đợi POS (như đơn online), phát SSE ORDER_CREATED.
 *
 * Bảo mật: endpoint webhook KHÔNG cần đăng nhập (bên ngoài gọi), nhưng phải kèm SECRET đúng
 * (query ?secret= hoặc header X-Webhook-Secret). Secret sinh tự động, chỉ admin (đã đăng nhập)
 * xem/đổi được qua /api/grab-webhook/config.
 *
 * SQL: camelCase KHÔNG ngoặc kép — adapter db.js tự thêm ngoặc cho Postgres.
 */
const crypto = require('crypto');

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.run(sql, params, function (e) { e ? reject(e) : resolve(this); }); });
}
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))); });
}

function publicBaseUrl(req) {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `${req.protocol}://${req.get('host')}`;
}

async function ensureConfig(db) {
  await dbRun(db, `CREATE TABLE IF NOT EXISTS webhook_config (key TEXT PRIMARY KEY, value TEXT)`).catch(() => {});
  const row = await dbGet(db, 'SELECT value FROM webhook_config WHERE key = ?', ['grabSecret']).catch(() => null);
  if (!row || !row.value) {
    const secret = crypto.randomBytes(18).toString('hex');
    await dbRun(db, `INSERT OR REPLACE INTO webhook_config (key, value) VALUES (?, ?)`, ['grabSecret', secret]).catch(() => {});
  }
}
async function getSecret(db) {
  const row = await dbGet(db, 'SELECT value FROM webhook_config WHERE key = ?', ['grabSecret']).catch(() => null);
  return row ? row.value : '';
}

// Map payload linh hoạt (mỗi middleware đặt tên field khác nhau) → item chuẩn của hệ thống.
function mapItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => {
    const name = String(it.name || it.productName || it.title || 'Món').trim();
    const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
    const price = Number(it.price ?? it.unitPrice ?? 0) || 0;
    const opts = Array.isArray(it.options) ? it.options : (Array.isArray(it.toppings) ? it.toppings : (Array.isArray(it.modifiers) ? it.modifiers.map((m) => (typeof m === 'string' ? m : m.name)) : []));
    return { productName: name, name, quantity: qty, price, toppings: opts.map((o) => String(o)).filter(Boolean), note: String(it.note || '').trim() };
  });
}

const SAMPLE_PAYLOAD = {
  orderCode: 'GF-123456',
  customerName: 'Nguyễn Văn A',
  customerPhone: '0901234567',
  deliveryAddress: '12 Lê Lợi, Q1',
  branchId: 'CN1',
  deliveryType: 'delivery',
  paymentMethod: 'cash',
  note: 'Giao nhanh giúp em',
  total: 230000,
  shipFee: 0,
  items: [
    { name: 'FitBlend PRO 500ml | 60g protein', quantity: 2, price: 115000, options: ['1 trứng', '0 đá'], note: '' },
  ],
};

const ORDER_COLUMNS = `id, branchId, source, items, time, status, total, staff, paidAt, readyAt, completedAt, orderNumber, customerName, customerPhone,
  deliveryAddress, shipperName, shipperId, paymentMethod, stockDeducted, salesStaffId, salesStaffName, staffId, shiftId, shipFee, note, deliveryTime,
  deliveryType, shipMethod, shipProvider, shipTrackingCode, allergyNote`;
const ORDER_PLACEHOLDERS = ORDER_COLUMNS.split(',').map(() => '?').join(', ');

function registerExternalOrderRoutes(app, db, { broadcast }) {
  ensureConfig(db).catch((e) => console.error('webhook config init:', e.message));

  // Webhook nhận đơn Grab (PUBLIC — validate bằng secret bên trong).
  app.post('/api/webhooks/grab-order', async (req, res) => {
    try {
      const secret = await getSecret(db);
      const got = req.query.secret || req.headers['x-webhook-secret'] || '';
      if (!secret || String(got) !== secret) return res.status(401).json({ error: 'Sai hoặc thiếu secret' });

      const b = req.body || {};
      const items = mapItems(b.items);
      if (items.length === 0) return res.status(400).json({ error: 'Đơn không có món (items rỗng)' });
      const total = Number(b.total) || items.reduce((s, i) => s + i.price * i.quantity, 0);
      const codeSafe = b.orderCode ? String(b.orderCode).replace(/[^\w-]/g, '') : '';
      const id = codeSafe ? `GRAB-${codeSafe}` : `GRAB-${Date.now()}`;
      const now = new Date().toISOString();
      const orderNumber = Math.floor(Math.random() * 1000) + 1;

      // Đơn trùng mã (webhook gửi lại) → bỏ qua, không tạo trùng.
      const dup = await dbGet(db, 'SELECT id FROM orders WHERE id = ?', [id]).catch(() => null);
      if (dup) return res.status(200).json({ ok: true, duplicated: true, orderId: id });

      const order = {
        id, branchId: b.branchId || 'CN1', source: 'grab', items,
        time: now, status: 'pending', total,
        staff: 'Grab', paidAt: b.paid ? now : null, readyAt: null, completedAt: null, orderNumber,
        customerName: String(b.customerName || 'Khách Grab').trim(), customerPhone: String(b.customerPhone || '').trim(),
        deliveryAddress: String(b.deliveryAddress || '').trim(), shipperName: '', shipperId: '',
        paymentMethod: b.paymentMethod === 'transfer' ? 'transfer' : 'cash', stockDeducted: 0,
        salesStaffId: '', salesStaffName: '', staffId: '', shiftId: '',
        shipFee: Number(b.shipFee) || 0, note: String(b.note || '').trim(), deliveryTime: '',
        deliveryType: b.deliveryType === 'pickup' ? 'pickup' : 'delivery', shipMethod: '', shipProvider: '', shipTrackingCode: '', allergyNote: '',
      };

      await dbRun(db, `INSERT INTO orders (${ORDER_COLUMNS}) VALUES (${ORDER_PLACEHOLDERS})`, [
        order.id, order.branchId, order.source, JSON.stringify(order.items), order.time, order.status, order.total, order.staff,
        order.paidAt, order.readyAt, order.completedAt, order.orderNumber, order.customerName, order.customerPhone,
        order.deliveryAddress, order.shipperName, order.shipperId, order.paymentMethod, order.stockDeducted, order.salesStaffId, order.salesStaffName,
        order.staffId, order.shiftId, order.shipFee, order.note, order.deliveryTime, order.deliveryType, order.shipMethod, order.shipProvider,
        order.shipTrackingCode, order.allergyNote,
      ]);

      broadcast('ORDER_CREATED', { ...order, time: new Date(order.time) });
      res.status(201).json({ ok: true, orderId: id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Cấu hình webhook (URL + secret + mẫu payload) — CẦN ĐĂNG NHẬP (không nằm trong PUBLIC_API).
  app.get('/api/grab-webhook/config', async (req, res) => {
    try {
      const secret = await getSecret(db);
      res.json({
        url: `${publicBaseUrl(req)}/api/webhooks/grab-order`,
        secret,
        header: 'X-Webhook-Secret',
        samplePayload: SAMPLE_PAYLOAD,
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Đổi secret mới (khi lộ) — CẦN ĐĂNG NHẬP.
  app.post('/api/grab-webhook/regenerate', async (req, res) => {
    try {
      const secret = crypto.randomBytes(18).toString('hex');
      await dbRun(db, `INSERT OR REPLACE INTO webhook_config (key, value) VALUES (?, ?)`, ['grabSecret', secret]);
      res.json({ secret });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { registerExternalOrderRoutes };
