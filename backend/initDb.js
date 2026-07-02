const { removeDiacritics } = require('./vietnamese');
const { getInventoryCatalog, getSampleEmployees } = require('./storeSeeds');
const { PRODUCT } = require('./imagePaths');
const { DEFAULT_MENU_PRICE_TABLE } = require('./menuPricing');
const { DEFAULT_COMBO_TOPPINGS, getToppingProductRows } = require('./menuToppings');
const { getSmoothieProductRows } = require('./menuFlavors');
const { DEFAULT_BRANCHES } = require('./branches');

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT,
  unit TEXT,
  "currentStock" DOUBLE PRECISION,
  "minStock" DOUBLE PRECISION,
  cost INTEGER,
  category TEXT
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  type TEXT,
  "orderId" TEXT,
  "itemId" TEXT,
  "itemName" TEXT,
  quantity DOUBLE PRECISION,
  reason TEXT,
  "performedBy" TEXT,
  cost INTEGER
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "branchId" TEXT,
  source TEXT,
  items TEXT,
  time TEXT,
  status TEXT,
  total INTEGER,
  staff TEXT,
  "paidAt" TEXT,
  "readyAt" TEXT,
  "completedAt" TEXT,
  "orderNumber" INTEGER,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "deliveryAddress" TEXT,
  "shipperName" TEXT,
  "shipperId" TEXT,
  "paymentMethod" TEXT,
  "stockDeducted" INTEGER,
  "salesStaffId" TEXT,
  "salesStaffName" TEXT
);

CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id TEXT PRIMARY KEY,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "packageName" TEXT,
  "totalCups" INTEGER,
  "remainingCups" INTEGER,
  "durationMonths" INTEGER,
  "purchasedAt" TEXT,
  "expiresAt" TEXT,
  "preferredProduct" TEXT,
  "preferredProductSize" TEXT,
  "preferredProductProtein" INTEGER,
  "branchId" TEXT,
  "branchName" TEXT,
  redemptions TEXT
);

CREATE TABLE IF NOT EXISTS partners_pt (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  code TEXT UNIQUE,
  "dateCreated" TEXT,
  "paidCommission" INTEGER
);

CREATE TABLE IF NOT EXISTS referral_transactions (
  id TEXT PRIMARY KEY,
  "ptId" TEXT,
  "ptCode" TEXT,
  "orderId" TEXT,
  "customerName" TEXT,
  "comboName" TEXT,
  price DOUBLE PRECISION,
  timestamp TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  "basePrice" INTEGER,
  image TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  "fullName" TEXT,
  "employeeId" TEXT,
  email TEXT,
  phone TEXT,
  "idNumber" TEXT,
  "dateOfBirth" TEXT,
  address TEXT,
  branch TEXT,
  position TEXT,
  "baseSalary" INTEGER,
  "startDate" TEXT,
  username TEXT,
  password TEXT,
  photo TEXT,
  "customData" TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  "sortOrder" INTEGER DEFAULT 0,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  "employeeId" TEXT,
  "employeeName" TEXT,
  date TEXT,
  "shiftType" TEXT,
  "startTime" TEXT,
  "endTime" TEXT,
  status TEXT,
  "checkIn" TEXT,
  "checkOut" TEXT,
  branch TEXT DEFAULT '',
  "requestedBy" TEXT DEFAULT 'admin',
  "checkInPhoto" TEXT DEFAULT '',
  "checkOutPhoto" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  points INTEGER DEFAULT 0,
  "createdAt" TEXT
);

CREATE TABLE IF NOT EXISTS loyalty_vouchers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  "programId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "customerName" TEXT,
  "customerPhone" TEXT,
  status TEXT DEFAULT 'active',
  "pointsDeducted" INTEGER DEFAULT 0,
  "issuedAt" TEXT NOT NULL,
  "usedAt" TEXT,
  "expiresAt" TEXT
);

CREATE TABLE IF NOT EXISTS combo_subscriptions (
  id TEXT PRIMARY KEY,
  "orderId" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "planName" TEXT,
  "comboType" TEXT,
  "comboDuration" TEXT,
  "startDate" TEXT,
  "nextDelivery" TEXT,
  "deliveryDays" TEXT,
  items TEXT,
  "totalPrice" INTEGER,
  status TEXT DEFAULT 'pending',
  "branchId" TEXT,
  "deliveryAddress" TEXT,
  "careStaffId" TEXT,
  "careStaffName" TEXT,
  "closedByStaffId" TEXT,
  "closedByStaffName" TEXT,
  "closedAt" TEXT,
  "assignedAt" TEXT,
  "pauseStartDate" TEXT,
  "pauseEndDate" TEXT,
  notes TEXT,
  staff TEXT,
  "lastDeliveredAt" TEXT,
  "deliveryLog" TEXT DEFAULT '[]',
  "totalCups" INTEGER DEFAULT 7,
  "createdAt" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS customer_care_assignments (
  id TEXT PRIMARY KEY,
  "customerPhone" TEXT UNIQUE,
  "customerName" TEXT,
  "careStaffId" TEXT,
  "careStaffName" TEXT,
  "assignedAt" TEXT,
  "assignedBy" TEXT,
  notes TEXT,
  "customerType" TEXT DEFAULT 'combo',
  "fbName" TEXT DEFAULT '',
  "pipelineStage" TEXT DEFAULT 'nurturing',
  "lastContactAt" TEXT,
  tags TEXT DEFAULT '[]',
  "salesRefCode" TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sales_leads (
  id TEXT PRIMARY KEY,
  "fbName" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "careStaffId" TEXT,
  "careStaffName" TEXT,
  "pipelineStage" TEXT DEFAULT 'fb_new',
  source TEXT DEFAULT 'facebook',
  notes TEXT DEFAULT '',
  "createdAt" TEXT,
  "updatedAt" TEXT,
  "lastContactAt" TEXT
);

CREATE TABLE IF NOT EXISTS sales_activities (
  id TEXT PRIMARY KEY,
  "customerPhone" TEXT,
  "leadId" TEXT,
  "careStaffId" TEXT,
  "careStaffName" TEXT,
  "activityType" TEXT,
  content TEXT,
  "createdAt" TEXT
);
`;

function vi(str) {
  return removeDiacritics(str);
}

async function countRows(pool, table) {
  const r = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
  return r.rows[0].count;
}

async function upsertSetting(pool, key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, typeof value === 'string' ? value : JSON.stringify(value)]
  );
}

async function syncBranches(pool) {
  for (const b of DEFAULT_BRANCHES) {
    await pool.query(
      `INSERT INTO branches (id, name, address, phone, active, "sortOrder", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [b.id, b.name, b.address, b.phone, b.active, b.sortOrder, new Date().toISOString()]
    );
  }
}

async function initSchemaAndSeeds(pool) {
  await pool.query(SCHEMA_SQL);
  await pool.query(`ALTER TABLE combo_subscriptions ADD COLUMN IF NOT EXISTS "lastDeliveredAt" TEXT`).catch(() => {});
  await pool.query(`ALTER TABLE combo_subscriptions ADD COLUMN IF NOT EXISTS "deliveryLog" TEXT DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE combo_subscriptions ADD COLUMN IF NOT EXISTS "totalCups" INTEGER DEFAULT 7`).catch(() => {});
  await pool.query(`ALTER TABLE combo_subscriptions ADD COLUMN IF NOT EXISTS "deliveredCups" INTEGER DEFAULT 0`).catch(() => {});
  await pool.query(`ALTER TABLE combo_subscriptions ADD COLUMN IF NOT EXISTS "commissionAmount" INTEGER DEFAULT 0`).catch(() => {});
  await pool.query(`ALTER TABLE combo_subscriptions ADD COLUMN IF NOT EXISTS "commissionStatus" TEXT DEFAULT 'pending'`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_logs (
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
    )
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS branch_inventory (
      "branchId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "currentStock" REAL DEFAULT 0,
      "minStock" REAL,
      PRIMARY KEY ("branchId", "itemId")
    )
  `).catch(() => {});

  await pool.query(`ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS "branchId" TEXT DEFAULT 'CN1'`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      active BOOLEAN DEFAULT TRUE,
      "sortOrder" INTEGER DEFAULT 0,
      "createdAt" TEXT
    )
  `).catch(() => {});

  await syncBranches(pool);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS combo_transfers (
      id TEXT PRIMARY KEY,
      combo_order_id TEXT NOT NULL,
      from_sales_id TEXT,
      from_sales_name TEXT,
      to_sales_id TEXT NOT NULL,
      to_sales_name TEXT NOT NULL,
      transferred_by TEXT,
      transferred_at TEXT,
      note TEXT
    )
  `).catch(() => {});

  if ((await countRows(pool, 'settings')) === 0) {
    console.log('Seeding default settings...');
    const defaultPriceTable = DEFAULT_MENU_PRICE_TABLE;
    const defaultCombos = DEFAULT_COMBO_TOPPINGS;
    await upsertSetting(pool, 'menuPriceTable', defaultPriceTable);
    await upsertSetting(pool, 'menuComboToppings', defaultCombos);
    await upsertSetting(pool, 'loyaltyEarnRate', '1000');
    await upsertSetting(pool, 'loyaltyRedeemValue', '1000');
  }

  const loyaltyDefaults = {
    loyaltyTiers: [
      { id: 'new', name: vi('Thanh vien moi'), subtitle: vi('Khach hang moi tham gia'), emoji: '🥉', gradient: 'from-blue-400 to-blue-600', minPoints: 0, maxPoints: 1000 },
      { id: 'bronze', name: vi('Hang Dong'), subtitle: vi('Khach hang than thiet'), emoji: '🏅', gradient: 'from-amber-600 to-amber-800', minPoints: 1001, maxPoints: 5000 },
      { id: 'silver', name: vi('Hang Bac'), subtitle: 'Khach hang VIP', emoji: '🥈', gradient: 'from-gray-400 to-gray-600', minPoints: 5001, maxPoints: 10000 },
      { id: 'gold', name: vi('Hang Vang'), subtitle: 'Khach hang VVIP', emoji: '👑', gradient: 'from-yellow-400 to-yellow-600', minPoints: 10001, maxPoints: 20000 },
      { id: 'diamond', name: vi('Hang Kim Cuong'), subtitle: vi('Khach hang dac biet'), emoji: '💎', gradient: 'from-rose-500 to-pink-600', minPoints: 20001, maxPoints: null, autoAbovePrevious: true },
    ],
    loyaltyRedeemPrograms: [
      { id: 'prog-ship', enabled: true, type: 'shipping', title: vi('Mien phi ship don tiep theo'), description: vi('Doi diem lay ma mien phi ship cho don hang tiep theo'), pointsCost: 300, value: 30000, minOrderAmount: 50000, validFrom: null, validTo: null, maxDiscountAmount: null },
      { id: 'prog-free-drink', enabled: true, type: 'item_percent', title: vi('Tang 1 ly FitBlend bat ky'), description: vi('Doi 2.000 diem de nhan 1 ly FitBlend mien phi'), pointsCost: 2000, value: 100, minOrderAmount: 0, validFrom: null, validTo: null, maxDiscountAmount: 80000 },
      { id: 'prog-voucher-30k', enabled: true, type: 'item_vnd', title: vi('Voucher giam 30.000d'), description: vi('Doi 500 diem lay voucher 30.000d cho don tiep theo'), pointsCost: 500, value: 30000, minOrderAmount: 50000, validFrom: null, validTo: null, maxDiscountAmount: null },
      { id: 'prog-voucher-100k', enabled: true, type: 'item_vnd', title: vi('Voucher giam 100.000d'), description: vi('Doi 1.000 diem lay voucher 100.000d'), pointsCost: 1000, value: 100000, minOrderAmount: 150000, validFrom: null, validTo: null, maxDiscountAmount: null },
    ],
  };

  for (const [key, value] of Object.entries(loyaltyDefaults)) {
    const existing = await pool.query('SELECT key FROM settings WHERE key = $1', [key]);
    if (existing.rowCount === 0) {
      await upsertSetting(pool, key, value);
    }
  }

  if ((await countRows(pool, 'products')) === 0) {
    console.log('Seeding default products...');
    const products = [
      ['SM-01', vi('Dau hat chia'), 'smoothies', 0, PRODUCT.strawberry, 'Strawberry Chia'],
      ['SM-02', vi('Dau chuoi'), 'smoothies', 0, PRODUCT.strawberry, 'Strawberry Banana'],
      ['SM-03', vi('Mang cau dau'), 'smoothies', 0, PRODUCT.strawberry, 'Soursop Strawberry'],
      ['SM-04', vi('Dau cam'), 'smoothies', 0, PRODUCT.strawberry, 'Strawberry Orange'],
      ['SM-05', vi('Dau tam chuoi'), 'smoothies', 0, PRODUCT.strawberry, 'Mulberry Banana'],
      ['SM-06', vi('Phuc bon tu chuoi'), 'smoothies', 0, PRODUCT.strawberry, 'Raspberry Banana'],
      ['SM-07', vi('Chuoi hat chia'), 'smoothies', 0, PRODUCT.cacaoOat, 'Banana Chia'],
      ['SM-08', vi('Chanh day chuoi'), 'smoothies', 0, PRODUCT.mango, 'Passionfruit Banana'],
      ['SM-09', vi('Xoai thom'), 'smoothies', 0, PRODUCT.mango, 'Mango Pineapple'],
      ['SM-10', vi('Xoai cam'), 'smoothies', 0, PRODUCT.mango, 'Mango Orange'],
      ['SM-11', vi('Cacao yen mach'), 'smoothies', 0, PRODUCT.cacaoOat, 'Cacao Oat'],
      ['SM-12', vi('Ca phe chuoi'), 'smoothies', 0, PRODUCT.cacaoOat, 'Coffee Banana'],
      ['SM-13', vi('Bo'), 'smoothies', 0, PRODUCT.hero, 'Avocado'],
      ['SM-14', vi('Bo chuoi'), 'smoothies', 0, PRODUCT.hero, 'Avocado Banana'],
      ['SM-15', 'Matcha', 'smoothies', 0, PRODUCT.hero, 'Matcha'],
      ['SM-16', vi('Dau tam yen mach'), 'smoothies', 0, PRODUCT.strawberry, 'Mulberry Oat'],
      ['SM-17', vi('Phuc bon tu yen mach'), 'smoothies', 0, PRODUCT.strawberry, 'Raspberry Oat'],
      ['SM-18', vi('Thanh long chuoi'), 'smoothies', 0, PRODUCT.mango, 'Dragonfruit Banana'],
      ['SM-19', vi('Thanh long yen mach'), 'smoothies', 0, PRODUCT.mango, 'Dragonfruit Oat'],
      ['SM-20', vi('Xoai dau'), 'smoothies', 0, PRODUCT.mango, 'Mango Strawberry'],
      ['SM-21', vi('Xoai chuoi'), 'smoothies', 0, PRODUCT.mango, 'Mango Banana'],
      ['SM-22', vi('Cacao chuoi'), 'smoothies', 0, PRODUCT.cacaoOat, 'Cacao Banana'],
      ['SM-23', vi('Matcha chuoi'), 'smoothies', 0, PRODUCT.hero, 'Matcha Banana'],
      ['SM-24', vi('Matcha yen mach'), 'smoothies', 0, PRODUCT.hero, 'Matcha Oat'],
      ...getToppingProductRows(),
      ['CB-01', 'Fat Loss Plan', 'combo', 449000, '📦', vi('Giam mo 7 ngay')],
      ['CB-02', 'Muscle Build Plan', 'combo', 669000, '📦', vi('Tang co 7 ngay')],
      ['CB-03', 'Elite Mass Plan', 'combo', 899000, '📦', vi('Tang can 7 ngay')],
    ];
    for (const p of products) {
      await pool.query(
        'INSERT INTO products (id, name, category, "basePrice", image, description) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING',
        p
      );
    }
  }

  const sampleEmployees = getSampleEmployees();

  const employeeInsertSql = `INSERT INTO employees (id, "fullName", "employeeId", email, phone, "idNumber", "dateOfBirth", address, branch, position, "baseSalary", "startDate", username, password, photo, "customData")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}') ON CONFLICT (id) DO NOTHING`;

  if ((await countRows(pool, 'employees')) === 0) {
    console.log('Seeding sample employees...');
    for (const e of sampleEmployees) {
      await pool.query(employeeInsertSql, e);
    }
  } else {
    const existing = await pool.query('SELECT id FROM employees');
    const existingIds = new Set(existing.rows.map((r) => r.id));
    const missing = sampleEmployees.filter((e) => !existingIds.has(e[0]));
    if (missing.length > 0) {
      console.log(`Syncing ${missing.length} missing employees...`);
      for (const e of missing) {
        await pool.query(employeeInsertSql, e);
      }
    }
  }

  if ((await countRows(pool, 'inventory')) === 0) {
    console.log('Seeding inventory catalog (stock 0)...');
    for (const item of getInventoryCatalog()) {
      await pool.query(
        'INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
        item
      );
    }
  }

  // Không seed khách mẫu — khách chỉ tạo khi có đơn thật

  const profileFields = [
    { id: 'fullName', label: vi('Ho va ten'), type: 'text', source: 'builtin', fieldKey: 'fullName', visible: true, editable: false, order: 1 },
    { id: 'employeeId', label: vi('Ma nhan vien'), type: 'text', source: 'builtin', fieldKey: 'employeeId', visible: true, editable: false, order: 2 },
    { id: 'phone', label: vi('So dien thoai'), type: 'phone', source: 'builtin', fieldKey: 'phone', visible: true, editable: true, order: 3 },
    { id: 'email', label: 'Email', type: 'email', source: 'builtin', fieldKey: 'email', visible: true, editable: true, order: 4 },
    { id: 'branch', label: vi('Chi nhanh'), type: 'text', source: 'builtin', fieldKey: 'branch', visible: true, editable: false, order: 5 },
    { id: 'position', label: vi('Chuc vu'), type: 'text', source: 'builtin', fieldKey: 'position', visible: true, editable: false, order: 6 },
    { id: 'startDate', label: vi('Ngay vao lam'), type: 'date', source: 'builtin', fieldKey: 'startDate', visible: true, editable: false, order: 7 },
    { id: 'address', label: vi('Dia chi'), type: 'textarea', source: 'builtin', fieldKey: 'address', visible: true, editable: true, order: 8 },
  ];
  const existingProfile = await pool.query("SELECT key FROM settings WHERE key = 'employee_profile_fields'");
  if (existingProfile.rowCount === 0) {
    await upsertSetting(pool, 'employee_profile_fields', profileFields);
  }

  for (const item of getInventoryCatalog()) {
    await pool.query(
      'INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
      item
    );
  }

  await syncCanonicalMenuV2(pool);
  await syncCanonicalMenuV3(pool);
  await syncCanonicalMenuV4(pool);
  await syncCanonicalMenuV5(pool);
}

async function syncCanonicalMenuV5(pool) {
  const MIGRATION_KEY = 'menu_canonical_v5';
  const existing = await pool.query('SELECT key FROM settings WHERE key = $1', [MIGRATION_KEY]);
  if (existing.rowCount > 0) return;

  console.log('Refreshing canonical price table + combo toppings (v5)...');
  await upsertSetting(pool, 'menuPriceTable', DEFAULT_MENU_PRICE_TABLE);
  await upsertSetting(pool, 'menuComboToppings', DEFAULT_COMBO_TOPPINGS);
  await upsertSetting(pool, MIGRATION_KEY, { syncedAt: new Date().toISOString() });
}

async function syncCanonicalMenuV4(pool) {
  const MIGRATION_KEY = 'menu_canonical_v4';
  const existing = await pool.query('SELECT key FROM settings WHERE key = $1', [MIGRATION_KEY]);
  if (existing.rowCount > 0) return;

  console.log('Syncing 24 smoothie flavors (upsert + rename SM-05/06)...');

  for (const row of getSmoothieProductRows()) {
    const [id, name, category, basePrice, image, description] = row;
    await pool.query(
      `INSERT INTO products (id, name, category, "basePrice", image, description)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         "basePrice" = EXCLUDED."basePrice",
         image = EXCLUDED.image,
         description = EXCLUDED.description`,
      [id, name, category, basePrice, image, description]
    );
  }

  await upsertSetting(pool, MIGRATION_KEY, { syncedAt: new Date().toISOString(), flavors: 24 });
}

async function syncCanonicalMenuV3(pool) {
  const MIGRATION_KEY = 'menu_canonical_v3';
  const existing = await pool.query('SELECT key FROM settings WHERE key = $1', [MIGRATION_KEY]);
  if (existing.rowCount > 0) return;

  console.log('Syncing smoothie flavors — vị miễn phí, giá theo size/protein...');
  await pool.query(`UPDATE products SET "basePrice" = 0 WHERE category = 'smoothies'`);
  await upsertSetting(pool, MIGRATION_KEY, { syncedAt: new Date().toISOString() });
}

async function syncCanonicalMenuV2(pool) {
  const MIGRATION_KEY = 'menu_canonical_v2';
  const existing = await pool.query('SELECT key FROM settings WHERE key = $1', [MIGRATION_KEY]);
  if (existing.rowCount > 0) return;

  console.log('Syncing canonical menu (price table + toppings v2)...');

  await upsertSetting(pool, 'menuPriceTable', DEFAULT_MENU_PRICE_TABLE);
  await upsertSetting(pool, 'menuComboToppings', DEFAULT_COMBO_TOPPINGS);

  for (const row of getToppingProductRows()) {
    const [id, name, category, basePrice, image, description] = row;
    await pool.query(
      `INSERT INTO products (id, name, category, "basePrice", image, description)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         "basePrice" = EXCLUDED."basePrice",
         image = EXCLUDED.image,
         description = EXCLUDED.description`,
      [id, name, category, basePrice, image, description]
    );
  }

  await upsertSetting(pool, MIGRATION_KEY, { syncedAt: new Date().toISOString() });
}

module.exports = { initSchemaAndSeeds, SCHEMA_SQL };
