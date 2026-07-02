const { removeDiacritics } = require('./vietnamese');

const vi = removeDiacritics;

/** Chi nhánh mặc định — seed lần đầu */
const DEFAULT_BRANCHES = [
  {
    id: 'CN1',
    name: vi('Chi Nhanh 1 - Quan 1'),
    address: vi('123 Nguyen Hue, Ben Nghe, Quan 1, TP.HCM'),
    phone: '0901000001',
    active: true,
    sortOrder: 1,
  },
  {
    id: 'CN2',
    name: vi('Chi Nhanh 2 - Quan 3'),
    address: vi('456 Le Van Sy, Phuong 14, Quan 3, TP.HCM'),
    phone: '0901000002',
    active: true,
    sortOrder: 2,
  },
  {
    id: 'CN3',
    name: vi('Chi Nhanh 3 - Thu Duc'),
    address: vi('789 Vo Van Ngan, Linh Chieu, TP.Thu Duc, TP.HCM'),
    phone: '0901000003',
    active: true,
    sortOrder: 3,
  },
];

function normalizeBranch(body = {}) {
  return {
    id: String(body.id || '').trim(),
    name: String(body.name || '').trim(),
    address: String(body.address || '').trim(),
    phone: String(body.phone || '').trim(),
    active: body.active !== false && body.active !== 0,
    sortOrder: Number(body.sortOrder) || 0,
    createdAt: body.createdAt || new Date().toISOString(),
  };
}

function nextBranchId(existingIds) {
  const nums = (existingIds || [])
    .map((id) => /^CN(\d+)$/i.exec(id))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `CN${next}`;
}

function parseBranchRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    phone: row.phone || '',
    active: row.active === true || row.active === 1 || row.active === '1',
    sortOrder: Number(row.sortOrder) || 0,
    createdAt: row.createdAt || row.created_at || '',
  };
}

module.exports = {
  DEFAULT_BRANCHES,
  normalizeBranch,
  nextBranchId,
  parseBranchRow,
};
