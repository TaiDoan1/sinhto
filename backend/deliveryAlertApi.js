/**
 * Cảnh báo giao ĐƠN LẺ sắp tới giờ giao — bổ sung cho cảnh báo combo (đã có ở comboDeliveryApi).
 * CSKH đặt "báo trước N phút" (setting deliveryAlertLeadMinutes, dùng chung cả quán); hệ thống
 * trả các đơn lẻ (deliveryType='delivery', có giờ hẹn giao, chưa hoàn tất, chưa nhắc) mà giờ giao
 * nằm trong khoảng [nay - 6h, nay + N phút].
 *
 * SQL: camelCase KHÔNG ngoặc kép — adapter db.js tự thêm ngoặc cho Postgres.
 */
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.run(sql, params, function (e) { e ? reject(e) : resolve(this); }); });
}
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))); });
}
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r || []))); });
}

function itemsSummary(itemsRaw) {
  let items = itemsRaw;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
  if (!Array.isArray(items)) return '';
  return items.map((it) => `${it.quantity || 1} ${it.productName || it.name || 'ly'}`).join(', ');
}

async function ensureSchema(db) {
  await dbRun(db, `ALTER TABLE orders ADD COLUMN deliveryAlertAck INTEGER DEFAULT 0`).catch(() => {});
}

function registerDeliveryAlertRoutes(app, db, { broadcast }) {
  ensureSchema(db).catch((e) => console.error('delivery alert schema:', e.message));

  // Đơn lẻ sắp tới giờ giao (trong N phút). CSKH đã đăng nhập nên không để public.
  app.get('/api/order-delivery-alerts', async (req, res) => {
    try {
      const withinMinutes = Number(req.query.minutes) || 60;
      const branchId = req.query.branchId;
      let sql = `SELECT id, branchId, customerName, customerPhone, deliveryAddress, deliveryTime, status, items, source, salesStaffName
        FROM orders
        WHERE deliveryType = 'delivery' AND deliveryTime IS NOT NULL AND deliveryTime <> ''
          AND status <> 'completed'
          AND (deliveryAlertAck IS NULL OR deliveryAlertAck = 0)`;
      const params = [];
      if (branchId) { sql += ' AND branchId = ?'; params.push(branchId); }
      const rows = await dbAll(db, sql, params);

      const now = Date.now();
      const threshold = now + withinMinutes * 60 * 1000;
      const graceFloor = now - 6 * 60 * 60 * 1000; // đơn quá giờ trong 6h vẫn hiện (nhắc gấp)
      const due = rows
        .map((r) => ({ row: r, scheduledAt: new Date(r.deliveryTime).getTime() }))
        .filter((x) => !Number.isNaN(x.scheduledAt) && x.scheduledAt <= threshold && x.scheduledAt >= graceFloor)
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
        .map((x) => {
          const d = new Date(x.scheduledAt);
          return {
            id: x.row.id,
            type: 'retail',
            customerName: x.row.customerName || 'Khách hàng',
            customerPhone: x.row.customerPhone || '',
            deliveryAddress: x.row.deliveryAddress || '',
            branchId: x.row.branchId || '',
            itemsSummary: itemsSummary(x.row.items),
            careStaffName: x.row.salesStaffName || '',
            scheduledAt: d.toISOString(),
            deliveryDate: d.toLocaleDateString('vi-VN'),
            deliveryTime: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          };
        });
      res.json(due);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Đánh dấu đã nhắc đơn lẻ (không hiện lại).
  app.patch('/api/order-delivery-alerts/:id/ack', async (req, res) => {
    try {
      await dbRun(db, 'UPDATE orders SET deliveryAlertAck = 1 WHERE id = ?', [req.params.id]);
      broadcast?.('ORDER_ALERT_ACKED', { id: req.params.id });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { registerDeliveryAlertRoutes };
