/**
 * Menu cho app đặt món kiểu GrabFood (/dat-mon). Chủ quán tự quản lý danh sách món giống
 * Grab Merchant: ảnh, tên, mô tả, mục, nhãn, GIÁ GỐC + các NHÓM TÙY CHỌN (option groups)
 * giống hệt Grab — mỗi nhóm có luật (Chọn 1 / Tối đa N / Ít nhất 1) và các lựa chọn có giá
 * cộng thêm. Giá cuối = giá gốc + tổng lựa chọn (áp giảm giá % nếu có).
 *
 * SQL: dùng camelCase KHÔNG ngoặc kép; adapter db.js tự thêm ngoặc cho Postgres.
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

const SCHEMA = `CREATE TABLE IF NOT EXISTS grab_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT DEFAULT '',
  imageUrl TEXT DEFAULT '',
  section TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  layout TEXT DEFAULT 'grid',
  basePrice INTEGER DEFAULT 0,
  discountPercent INTEGER DEFAULT 0,
  optionGroups TEXT DEFAULT '[]',
  sortOrder INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  createdAt TEXT,
  updatedAt TEXT
)`;

// ── Nhóm tùy chọn mẫu (đọc từ ảnh Grab của quán) ──────────────────────────────
// type 'single' = chọn 1 (bắt buộc); 'multi' = tích nhiều (max giới hạn, required = ít nhất 1).
const SAMPLE_GROUPS = [
  { id: 'g-egg', title: 'trứng luộc', type: 'multi', required: false, max: 3, options: [
    { name: '1 trứng', price: 8000 }, { name: '2 trứng', price: 15000 }, { name: '4 trứng', price: 28000 },
  ] },
  { id: 'g-upsize', title: 'Nâng cấp 700ml', type: 'multi', required: false, max: 1, options: [
    { name: 'nâng cấp 700ml', price: 20000 },
  ] },
  { id: 'g-healthy', title: 'option healthy', type: 'multi', required: false, max: 3, options: [
    { name: 'chọn sữa Protein A2 healthy', price: 20000 }, { name: 'chỉ dùng sữa hạt 100%', price: 15000 }, { name: 'ngọt tự nhiên từ lá cỏ ngọt', price: 10000 },
  ] },
  { id: 'g-topping', title: 'Topping', type: 'multi', required: false, max: 10, options: [
    { name: 'thốt nốt', price: 15000 }, { name: '+ hạt đác', price: 10000 }, { name: 'dừa sấy giòn', price: 10000 }, { name: 'bơ hạnh nhân', price: 25000 },
  ] },
  { id: 'g-protein', title: 'cân bằng protein', type: 'single', required: true, max: 1, options: [
    { name: 'không thêm whey', price: 0 }, { name: '+ protein đậu hà lan', price: 20000 }, { name: '+ Whey on gold standard', price: 39000 }, { name: '+ Vital Proteins collagen peptides', price: 49000 },
  ] },
  { id: 'g-flavor', title: 'chọn hương vị', type: 'single', required: true, max: 1, options: [
    { name: 'mãng cầu dâu', price: 10000 }, { name: 'xoài thơm', price: 10000 }, { name: 'Dâu cam', price: 10000 }, { name: 'cà phê chuối tươi', price: 10000 }, { name: 'bơ protein', price: 10000 },
  ] },
  { id: 'g-sweet', title: 'độ ngọt', type: 'multi', required: true, max: 2, options: [
    { name: 'ngọt từ lá cỏ ngọt healthy', price: 10000 }, { name: 'ngọt từ mật ong nguyên chất', price: 15000 }, { name: '30% 🍎 Ngọt nhẹ tự nhiên từ chà là', price: 5000 }, { name: 'ngọt từ mật mía thanh mát', price: 0 }, { name: '0 đường 🧊 vị nguyên bản, thanh mát', price: 0 },
  ] },
  { id: 'g-ice', title: 'mức đá', type: 'single', required: true, max: 1, options: [
    { name: '0 đá', price: 0 }, { name: '30% đá', price: 0 }, { name: '50% đá', price: 0 }, { name: '70% đá', price: 0 }, { name: '100% đá', price: 0 },
  ] },
];

const SEED_ITEMS = [
  { name: 'FitBlend PRO 500ml | 60g protein', description: 'Protein cao · Nguyên liệu chọn lọc · No lâu – phục hồi nhanh', imageUrl: '/images/strawberry_smoothie.png', section: 'Dành cho bạn', badge: 'bestseller', layout: 'grid', basePrice: 115000, discountPercent: 0 },
  { name: 'FitBlend ELITE 700ml | 90g protein', description: '90g protein/ly · phục hồi cơ nhanh 4-5 tiếng', imageUrl: '/images/cacao_oat_smoothie.png', section: 'Dành cho bạn', badge: '', layout: 'grid', basePrice: 159000, discountPercent: 10 },
  { name: 'Sinh tố ức gà muscle 40g protein', description: 'Siêu healthy · giàu đạm sạch', imageUrl: '/images/strawberry_smoothie.png', section: 'Dành cho bạn', badge: '', layout: 'grid', basePrice: 99000, discountPercent: 0 },
  { name: 'FitBlend Elite 90 – 90g Protein Tăng Cơ', description: 'Không đường · 1 ly = 2-3 bữa protein', imageUrl: '/images/cacao_oat_smoothie.png', section: 'Dành cho bạn', badge: 'loved', layout: 'grid', basePrice: 169000, discountPercent: 10 },

  { name: 'Lê Chuối Protein Shake Healthy', description: 'Sinh tố Protein Ức Gà Lê Chuối Healthy 🍐🍌💪', imageUrl: '/images/mango_smoothie.png', section: 'Món mới thử ngay', badge: 'new', layout: 'list', basePrice: 59000, discountPercent: 0 },
  { name: 'Sinh tố Protein Dâu Tằm chuối', description: 'Giàu đạm, đẹp da, giữ dáng', imageUrl: '/images/strawberry_smoothie.png', section: 'Món mới thử ngay', badge: '', layout: 'list', basePrice: 69000, discountPercent: 0 },
  { name: 'Raspberry Chia Protein (Phúc Bồn Tử chuối Hạt Chia)', description: 'Đẹp da, giữ dáng, giàu đạm', imageUrl: '/images/strawberry_smoothie.png', section: 'Món mới thử ngay', badge: '', layout: 'list', basePrice: 69000, discountPercent: 0 },
  { name: 'Sinh tố Protein Mãng Cầu Dâu', description: 'Thơm béo, dễ uống, giàu đạm', imageUrl: '/images/strawberry_smoothie.png', section: 'Món mới thử ngay', badge: '', layout: 'list', basePrice: 69000, discountPercent: 0 },

  { name: 'Cacao Yến Mạch – Sinh tố protein béo mịn', description: 'Cacao béo mịn, yến mạch nguyên chất, ức gà luộc mềm', imageUrl: '/images/cacao_oat_smoothie.png', section: 'Signature Protein Shake Smoothie', badge: 'loved', layout: 'list', basePrice: 59000, discountPercent: 0 },
  { name: 'Sinh Tố Bơ Chuối – FitBlend Avocado Banana', description: 'Bơ chín béo mịn + chuối ngọt tự nhiên xay cùng sữa hạt', imageUrl: '/images/mango_smoothie.png', section: 'Signature Protein Shake Smoothie', badge: '', layout: 'list', basePrice: 59000, discountPercent: 0 },
];

function parseGroups(raw) {
  try { const g = JSON.parse(raw || '[]'); return Array.isArray(g) ? g : []; } catch { return []; }
}
function parseRow(r) {
  if (!r) return null;
  return {
    ...r,
    layout: r.layout || 'grid',
    basePrice: Number(r.basePrice) || 0,
    discountPercent: Number(r.discountPercent) || 0,
    optionGroups: parseGroups(r.optionGroups),
    sortOrder: Number(r.sortOrder) || 0,
    active: Number(r.active) ? 1 : 0,
  };
}

async function ensureSchema(db) {
  await dbRun(db, SCHEMA).catch(() => {});
  // Bảng cũ → thêm cột mới (bỏ qua nếu đã có).
  await dbRun(db, `ALTER TABLE grab_menu_items ADD COLUMN layout TEXT DEFAULT 'grid'`).catch(() => {});
  await dbRun(db, `ALTER TABLE grab_menu_items ADD COLUMN basePrice INTEGER DEFAULT 0`).catch(() => {});
  await dbRun(db, `ALTER TABLE grab_menu_items ADD COLUMN optionGroups TEXT DEFAULT '[]'`).catch(() => {});
}

// Nạp dữ liệu mẫu (có nhóm tùy chọn). Marker phiên bản để nâng cấp mẫu cũ → mẫu mới có option
// groups. Chỉ đụng các món mẫu (id GM-seed-*), giữ nguyên món chủ quán tự thêm.
async function seedSamples(db) {
  const seeded = await dbGet(db, 'SELECT value FROM settings WHERE key = ?', ['grabMenuSeededV2']).catch(() => null);
  if (seeded) return;
  await dbRun(db, `DELETE FROM grab_menu_items WHERE id LIKE 'GM-seed-%'`).catch(() => {});
  const now = new Date().toISOString();
  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const s = SEED_ITEMS[i];
    await dbRun(
      db,
      `INSERT INTO grab_menu_items (id, name, description, imageUrl, section, badge, layout, basePrice, discountPercent, optionGroups, sortOrder, active, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`GM-seed-${i + 1}`, s.name, s.description, s.imageUrl, s.section, s.badge, s.layout, s.basePrice, s.discountPercent, JSON.stringify(SAMPLE_GROUPS), i, 1, now, now]
    ).catch(() => {});
  }
  await dbRun(db, `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, ['grabMenuSeededV2', '1']).catch(() => {});
}

function cleanGroups(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((g, gi) => ({
    id: g.id || `g-${gi}-${Math.random().toString(36).slice(2, 6)}`,
    title: String(g.title || '').trim(),
    type: g.type === 'single' ? 'single' : 'multi',
    required: !!g.required,
    max: Math.max(0, Number(g.max) || 0),
    options: Array.isArray(g.options) ? g.options.map((o) => ({ name: String(o.name || '').trim(), price: Math.max(0, Number(o.price) || 0) })).filter((o) => o.name) : [],
  })).filter((g) => g.title && g.options.length);
}

function registerGrabMenuRoutes(app, db, { broadcast }) {
  ensureSchema(db)
    .then(() => seedSamples(db))
    .catch((e) => console.error('grab menu schema:', e.message));

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
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/grab-menu', async (req, res) => {
    const b = req.body || {};
    if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'Thiếu tên món' });
    const id = `GM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const item = {
      id, name: String(b.name).trim(), description: b.description || '', imageUrl: b.imageUrl || '',
      section: b.section || '', badge: b.badge || '', layout: b.layout === 'list' ? 'list' : 'grid',
      basePrice: Math.max(0, Number(b.basePrice) || 0),
      discountPercent: Math.max(0, Math.min(90, Number(b.discountPercent) || 0)),
      optionGroups: cleanGroups(b.optionGroups),
      sortOrder: Number(b.sortOrder) || 0, active: b.active === false || b.active === 0 ? 0 : 1,
      createdAt: now, updatedAt: now,
    };
    try {
      await dbRun(
        db,
        `INSERT INTO grab_menu_items (id, name, description, imageUrl, section, badge, layout, basePrice, discountPercent, optionGroups, sortOrder, active, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.description, item.imageUrl, item.section, item.badge, item.layout, item.basePrice, item.discountPercent, JSON.stringify(item.optionGroups), item.sortOrder, item.active, item.createdAt, item.updatedAt]
      );
      broadcast?.('GRAB_MENU_UPDATED', item);
      res.json(item);
    } catch (e) { res.status(500).json({ error: e.message }); }
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
        basePrice: b.basePrice !== undefined ? Math.max(0, Number(b.basePrice) || 0) : (Number(existing.basePrice) || 0),
        discountPercent: b.discountPercent !== undefined ? Math.max(0, Math.min(90, Number(b.discountPercent) || 0)) : existing.discountPercent,
        optionGroups: b.optionGroups !== undefined ? cleanGroups(b.optionGroups) : parseGroups(existing.optionGroups),
        sortOrder: b.sortOrder !== undefined ? Number(b.sortOrder) || 0 : existing.sortOrder,
        active: b.active !== undefined ? (b.active ? 1 : 0) : existing.active,
        updatedAt: new Date().toISOString(),
      };
      await dbRun(
        db,
        `UPDATE grab_menu_items SET name=?, description=?, imageUrl=?, section=?, badge=?, layout=?, basePrice=?, discountPercent=?, optionGroups=?, sortOrder=?, active=?, updatedAt=? WHERE id=?`,
        [next.name, next.description, next.imageUrl, next.section, next.badge, next.layout, next.basePrice, next.discountPercent, JSON.stringify(next.optionGroups), next.sortOrder, next.active, next.updatedAt, req.params.id]
      );
      const updated = parseRow({ ...existing, ...next, optionGroups: JSON.stringify(next.optionGroups) });
      broadcast?.('GRAB_MENU_UPDATED', updated);
      res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/grab-menu/:id', async (req, res) => {
    try {
      await dbRun(db, 'DELETE FROM grab_menu_items WHERE id = ?', [req.params.id]);
      broadcast?.('GRAB_MENU_DELETED', { id: req.params.id });
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { registerGrabMenuRoutes };
