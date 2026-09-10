// Khôi phục DẤU tiếng Việt cho TÊN sản phẩm (vị sinh tố + topping).
// Trước đây migrateNoDiacritics.js đã bỏ dấu toàn bộ (để tương thích máy cũ). Giờ chủ quán muốn
// hiển thị có dấu cho đẹp. Migration này chạy SAU migrateNoDiacritics, khớp theo TÊN ĐÃ BỎ DẤU
// (chuẩn hoá thường + gộp khoảng trắng) rồi đặt lại tên có dấu. Chỉ đụng cột products.name.
//
// An toàn: tra macro/in tem đều chuẩn hoá bỏ dấu 2 phía (lookupMacro) nên đổi tên KHÔNG lệch macro.
// Đơn cũ giữ nguyên tên đã lưu (lịch sử). Có khoá theo settings key để không chạy lặp.
const { removeDiacritics } = require('./vietnamese');

const MIGRATION_KEY = 'db_diacritics_restored_v1';

// Danh sách tên CÓ DẤU (theo menu chính thức FitBlend). Key khớp = removeDiacritics(tên).toLowerCase()
// gộp khoảng trắng — trùng đúng dạng tên đã bị bỏ dấu trong DB.
const ACCENTED_NAMES = [
  // ── Vị sinh tố ──
  'Thanh long', 'Thanh long chuối', 'Thanh long yến mạch',
  'Cacao chuối', 'Cacao yến mạch', 'Cacao xoài',
  'Lê chuối', 'Xoài thơm', 'Xoài chuối', 'Xoài cam', 'Xoài dâu',
  'Chanh dây xoài', 'Chanh dây chuối',
  'Bơ', 'Bơ chuối',
  'Dâu chuối', 'Dâu hạt chia', 'Dâu cam', 'Dâu tằm chuối', 'Dâu tằm xoài', 'Dâu tằm yến mạch',
  'Đu đủ', 'Việt quất đu đủ', 'Việt quất xoài', 'Việt quất chuối',
  'Chuối cam', 'Chuối hạt chia', 'Chuối bơ đậu phộng',
  'Cải Kale', 'Măng cầu xoài', 'Măng cầu dâu', 'Cà phê chuối', 'Nho chuối',
  'Phúc bồn tử chuối', 'Phúc bồn tử yến mạch',
  'Matcha chuối', 'Matcha yến mạch', 'Khác',
  // ── Topping ──
  'Mật mía', 'Mật ong', 'Chuối', 'Bơ mè đen', 'Cần tây', 'Dưa leo', 'Dừa sấy giòn', 'Sữa A2',
  'Bơ đậu phộng', 'Bơ hạnh nhân', 'Bơ hạt điều', 'Bơ hạt macca', 'Bơ mè', 'Bơ hạt bí xanh',
  'Bơ hạt hướng dương', 'Bơ hạt dẻ cười', 'Sữa hạt 100%', 'Lá cỏ ngọt', 'Bạc hà', 'Chà là',
  'Hạt chia', 'Yến mạch', 'Bột đậu hà lan',
];

function normKey(s) {
  return removeDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Map: tên-bỏ-dấu-chuẩn-hoá → tên có dấu. Bỏ qua tên vốn không có dấu (accented === stripped).
const ACCENT_MAP = new Map();
for (const accented of ACCENTED_NAMES) {
  const key = normKey(accented);
  if (key && key !== accented && !ACCENT_MAP.has(key)) ACCENT_MAP.set(key, accented);
}

function run(db, cb) {
  db.get('SELECT value FROM settings WHERE key = ?', [MIGRATION_KEY], (err, row) => {
    if (err) return cb(err);
    if (row) return cb(null, false); // đã chạy rồi

    db.all('SELECT id, name FROM products', (err2, rows) => {
      if (err2) return cb(err2);
      const targets = (rows || [])
        .map((r) => ({ id: r.id, name: r.name, accented: ACCENT_MAP.get(normKey(r.name)) }))
        .filter((r) => r.accented && r.accented !== r.name);

      let idx = 0;
      const next = (e) => {
        if (e) return cb(e);
        if (idx >= targets.length) {
          return db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [MIGRATION_KEY, '1'], (e2) => {
            if (e2) return cb(e2);
            console.log(`Khôi phục dấu tên sản phẩm: đã cập nhật ${targets.length} món.`);
            cb(null, true);
          });
        }
        const t = targets[idx++];
        db.run('UPDATE products SET name = ? WHERE id = ?', [t.accented, t.id], next);
      };
      next();
    });
  });
}

module.exports = { run, MIGRATION_KEY };
