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
  layout TEXT DEFAULT 'grid',
  defaultSize TEXT DEFAULT '360ml',
  defaultProtein INTEGER DEFAULT 40,
  discountPercent INTEGER DEFAULT 0,
  sortOrder INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  createdAt TEXT,
  updatedAt TEXT
)`;

// Dữ liệu mẫu (giống menu Grab của quán) — nạp 1 lần khi bảng còn trống, chủ quán sửa/xóa thoải mái.
// Ảnh dùng ảnh có sẵn trong public/images; chủ quán thay ảnh thật sau.
const SEED_ITEMS = [
  { name: 'FitBlend PRO 500ml | 60g protein', description: 'Protein cao · Nguyên liệu chọn lọc', imageUrl: '/images/strawberry_smoothie.png', section: 'Dành cho bạn', badge: 'bestseller', layout: 'grid', defaultSize: '500ml', defaultProtein: 60, discountPercent: 0 },
  { name: 'FitBlend ELITE 700ml | 90g protein', description: '90g protein/ly · phục hồi cơ nhanh 4-5 tiếng', imageUrl: '/images/cacao_oat_smoothie.png', section: 'Dành cho bạn', badge: '', layout: 'grid', defaultSize: '700ml', defaultProtein: 90, discountPercent: 10 },
  { name: 'Sinh tố ức gà muscle 40g protein', description: 'Siêu healthy · giàu đạm sạch', imageUrl: '/images/strawberry_smoothie.png', section: 'Dành cho bạn', badge: '', layout: 'grid', defaultSize: '500ml', defaultProtein: 40, discountPercent: 0 },
  { name: 'FitBlend Elite 90 – 90g Protein Tăng Cơ', description: 'Không đường · 1 ly = 2-3 bữa protein', imageUrl: '/images/cacao_oat_smoothie.png', section: 'Dành cho bạn', badge: 'loved', layout: 'grid', defaultSize: '700ml', defaultProtein: 90, discountPercent: 10 },

  { name: 'Lê Chuối Protein Shake Healthy', description: 'Sinh tố Protein Ức Gà Lê Chuối Healthy 🍐🍌💪', imageUrl: '/images/mango_smoothie.png', section: 'Món mới thử ngay', badge: 'new', layout: 'list', defaultSize: '360ml', defaultProtein: 20, discountPercent: 0 },
  { name: 'Sinh tố Protein Dâu Tằm chuối', description: 'Giàu đạm, đẹp da, giữ dáng', imageUrl: '/images/strawberry_smoothie.png', section: 'Món mới thử ngay', badge: '', layout: 'list', defaultSize: '360ml', defaultProtein: 40, discountPercent: 0 },
  { name: 'Raspberry Chia Protein (Phúc Bồn Tử chuối Hạt Chia)', description: 'Đẹp da, giữ dáng, giàu đạm', imageUrl: '/images/strawberry_smoothie.png', section: 'Món mới thử ngay', badge: '', layout: 'list', defaultSize: '360ml', defaultProtein: 40, discountPercent: 0 },
  { name: 'Sinh tố Protein Mãng Cầu Dâu', description: 'Thơm béo, dễ uống, giàu đạm', imageUrl: '/images/strawberry_smoothie.png', section: 'Món mới thử ngay', badge: '', layout: 'list', defaultSize: '360ml', defaultProtein: 40, discountPercent: 0 },

  { name: 'Cacao Yến Mạch – Sinh tố protein béo mịn', description: 'Cacao béo mịn, yến mạch nguyên chất, ức gà luộc mềm', imageUrl: '/images/cacao_oat_smoothie.png', section: 'Signature Protein Shake Smoothie', badge: 'loved', layout: 'list', defaultSize: '360ml', defaultProtein: 40, discountPercent: 0 },
  { name: 'Sinh Tố Bơ Chuối – FitBlend Avocado Banana', description: 'Bơ chín béo mịn + chuối ngọt tự nhiên xay cùng sữa hạt', imageUrl: '/images/mango_smoothie.png', section: 'Signature Protein Shake Smoothie', badge: '', layout: 'list', defaultSize: '360ml', defaultProtein: 40, discountPercent: 0 },
];

function parseRow(r) {
  if (!r) return null;
  return {
    ...r,
    layout: r.layout || 'grid',
    defaultProtein: Number(r.defaultProtein) || 0,
    discountPercent: Number(r.discountPercent) || 0,
    sortOrder: Number(r.sortOrder) || 0,
    active: Number(r.active) ? 1 : 0,
  };
}

async function ensureSchema(db) {
  await dbRun(db, SCHEMA).catch(() => {});
  // Bảng đã tồn tại từ trước → thêm cột layout (bỏ qua nếu đã có).
  await dbRun(db, `ALTER TABLE grab_menu_items ADD COLUMN layout TEXT DEFAULT 'grid'`).catch(() => {});
}

// Nạp dữ liệu mẫu 1 lần (đánh dấu bằng setting 'grabMenuSeeded' để không nạp lại nếu chủ quán xóa hết).
async function seedIfEmpty(db) {
  const seeded = await dbGet(db, 'SELECT value FROM settings WHERE key = ?', ['grabMenuSeeded']).catch(() => null);
  if (seeded) return;
  const now = new Date().toISOString();
  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const s = SEED_ITEMS[i];
    const id = `GM-seed-${i + 1}`;
    await dbRun(
      db,
      `INSERT INTO grab_menu_items (id, name, description, imageUrl, section, badge, layout, defaultSize, defaultProtein, discountPercent, sortOrder, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, s.name, s.description, s.imageUrl, s.section, s.badge, s.layout, s.defaultSize, s.defaultProtein, s.discountPercent, i, 1, now, now]
    ).catch(() => {});
  }
  await dbRun(db, `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, ['grabMenuSeeded', '1']).catch(() => {});
}

function registerGrabMenuRoutes(app, db, { broadcast }) {
  ensureSchema(db)
    .then(() => seedIfEmpty(db))
    .catch((e) => console.error('grab menu schema:', e.message));

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
      layout: b.layout === 'list' ? 'list' : 'grid',
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
        `INSERT INTO grab_menu_items (id, name, description, imageUrl, section, badge, layout, defaultSize, defaultProtein, discountPercent, sortOrder, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.description, item.imageUrl, item.section, item.badge, item.layout, item.defaultSize, item.defaultProtein, item.discountPercent, item.sortOrder, item.active, item.createdAt, item.updatedAt]
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
        layout: b.layout !== undefined ? (b.layout === 'list' ? 'list' : 'grid') : (existing.layout || 'grid'),
        defaultSize: b.defaultSize !== undefined ? b.defaultSize : existing.defaultSize,
        defaultProtein: b.defaultProtein !== undefined ? Number(b.defaultProtein) || 40 : existing.defaultProtein,
        discountPercent: b.discountPercent !== undefined ? Math.max(0, Math.min(90, Number(b.discountPercent) || 0)) : existing.discountPercent,
        sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) || 0 : existing.sortOrder,
        active: b.active !== undefined ? (b.active ? 1 : 0) : existing.active,
        updatedAt: new Date().toISOString(),
      };
      await dbRun(
        db,
        `UPDATE grab_menu_items SET name=?, description=?, imageUrl=?, section=?, badge=?, layout=?, defaultSize=?, defaultProtein=?, discountPercent=?, sortOrder=?, active=?, updatedAt=? WHERE id=?`,
        [next.name, next.description, next.imageUrl, next.section, next.badge, next.layout, next.defaultSize, next.defaultProtein, next.discountPercent, next.sortOrder, next.active, next.updatedAt, req.params.id]
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
