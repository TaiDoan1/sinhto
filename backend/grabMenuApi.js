/**
 * Menu cho app đặt món kiểu GrabFood (/dat-mon). Chủ quán tự quản lý danh sách món giống
 * Grab Merchant: ảnh, tên, mô tả, mục (section), nhãn (bán chạy/được yêu thích/mới), giảm giá,
 * và mức size/protein mặc định (quyết định giá hiển thị). Khách bấm món vẫn chọn size/protein/
 * topping — mức mặc định chỉ là điểm khởi đầu.
 *
 * SQL: dùng camelCase KHÔNG ngoặc kép; adapter db.js tự thêm ngoặc cho Postgres.
 */
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); });
  });
}
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))); });
}
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => { db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r || []))); });
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS grab_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT DEFAULT '',
  imageUrl TEXT DEFAULT '',
  section TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  defaultSize TEXT DEFAULT '360ml',
  defaultProtein INTEGER DEFAULT 40,
  discountPercent INTEGER DEFAULT 0,
  sortOrder INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  createdAt TEXT,
  updatedAt TEXT
)`;

function parseRow(r) {
  if (!r) return null;
  return {
    ...r,
    defaultProtein: Number(r.defaultProtein) || 0,
    discountPercent: Number(r.discountPercent) || 0,
    sortOrder: Number(r.sortOrder) || 0,
    active: Number(r.active) ? 1 : 0,
  };
}

async function ensureSchema(db) {
  await dbRun(db, SCHEMA).catch(() => {});
}

function registerGrabMenuRoutes(app, db, { broadcast }) {
  ensureSchema(db).catch((e) => console.error('grab menu schema:', e.message));

  // Công khai cho app khách: mặc định chỉ món đang hiện (active). ?all=1 trả tất cả (dùng cho admin).
  app.get('/api/grab-menu', async (req, res) => {
    try {
      const all = String(req.query.all || '') === '1';
      const rows = await dbAll(
        db,
        all
          ? 'SELECT * FROM grab_menu_items ORDER BY sortOrder ASC, createdAt ASC'
          : 'SELECT * FROM grab_menu_items WHERE active = 1 ORDER BY sortOrder ASC, createdAt ASC'
      );
      res.json(rows.map(parseRow));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/grab-menu', async (req, res) => {
    const b = req.body || {};
    if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'Thiếu tên món' });
    const id = `GM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const item = {
      id,
      name: String(b.name).trim(),
      description: b.description || '',
      imageUrl: b.imageUrl || '',
      section: b.section || '',
      badge: b.badge || '',
      defaultSize: b.defaultSize || '360ml',
      defaultProtein: Number(b.defaultProtein) || 40,
      discountPercent: Math.max(0, Math.min(90, Number(b.discountPercent) || 0)),
      sortOrder: Number(b.sortOrder) || 0,
      active: b.active === false || b.active === 0 ? 0 : 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await dbRun(
        db,
        `INSERT INTO grab_menu_items (id, name, description, imageUrl, section, badge, defaultSize, defaultProtein, discountPercent, sortOrder, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.description, item.imageUrl, item.section, item.badge, item.defaultSize, item.defaultProtein, item.discountPercent, item.sortOrder, item.active, item.createdAt, item.updatedAt]
      );
      broadcast?.('GRAB_MENU_UPDATED', parseRow(item));
      res.json(parseRow(item));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/grab-menu/:id', async (req, res) => {
    try {
      const existing = await dbGet(db, 'SELECT * FROM grab_menu_items WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: 'Không tìm thấy món' });
      const b = req.body || {};
      const next = {
        name: b.name !== undefined ? String(b.name).trim() : existing.name,
        description: b.description !== undefined ? b.description : existing.description,
        imageUrl: b.imageUrl !== undefined ? b.imageUrl : existing.imageUrl,
        section: b.section !== undefined ? b.section : existing.section,
        badge: b.badge !== undefined ? b.badge : existing.badge,
        defaultSize: b.defaultSize !== undefined ? b.defaultSize : existing.defaultSize,
        defaultProtein: b.defaultProtein !== undefined ? Number(b.defaultProtein) || 40 : existing.defaultProtein,
        discountPercent: b.discountPercent !== undefined ? Math.max(0, Math.min(90, Number(b.discountPercent) || 0)) : existing.discountPercent,
        sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) || 0 : existing.sortOrder,
        active: b.active !== undefined ? (b.active ? 1 : 0) : existing.active,
        updatedAt: new Date().toISOString(),
      };
      await dbRun(
        db,
        `UPDATE grab_menu_items SET name=?, description=?, imageUrl=?, section=?, badge=?, defaultSize=?, defaultProtein=?, discountPercent=?, sortOrder=?, active=?, updatedAt=? WHERE id=?`,
        [next.name, next.description, next.imageUrl, next.section, next.badge, next.defaultSize, next.defaultProtein, next.discountPercent, next.sortOrder, next.active, next.updatedAt, req.params.id]
      );
      const updated = parseRow({ ...existing, ...next });
      broadcast?.('GRAB_MENU_UPDATED', updated);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/grab-menu/:id', async (req, res) => {
    try {
      await dbRun(db, 'DELETE FROM grab_menu_items WHERE id = ?', [req.params.id]);
      broadcast?.('GRAB_MENU_DELETED', { id: req.params.id });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

module.exports = { registerGrabMenuRoutes };
