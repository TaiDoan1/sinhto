const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { removeDiacritics } = require('./vietnamese');

function vi(str) {
  return removeDiacritics(str);
}

function openDb(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(db)));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY, name TEXT, unit TEXT, currentStock REAL, minStock REAL, cost INTEGER, category TEXT
);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY, timestamp TEXT, type TEXT, orderId TEXT, itemId TEXT, itemName TEXT,
  quantity REAL, reason TEXT, performedBy TEXT, cost INTEGER
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, branchId TEXT, source TEXT, items TEXT, time TEXT, status TEXT, total INTEGER,
  staff TEXT, paidAt TEXT, readyAt TEXT, completedAt TEXT, orderNumber INTEGER, customerName TEXT,
  customerPhone TEXT, deliveryAddress TEXT, shipperName TEXT, shipperId TEXT, paymentMethod TEXT, stockDeducted INTEGER,
  salesStaffId TEXT DEFAULT '', salesStaffName TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS wholesale_accounts (
  id TEXT PRIMARY KEY, customerName TEXT, customerPhone TEXT, packageName TEXT, totalCups INTEGER,
  remainingCups INTEGER, durationMonths INTEGER, purchasedAt TEXT, expiresAt TEXT, preferredProduct TEXT,
  preferredProductSize TEXT, preferredProductProtein INTEGER, branchId TEXT, branchName TEXT, redemptions TEXT
);
CREATE TABLE IF NOT EXISTS partners_pt (
  id TEXT PRIMARY KEY, name TEXT, phone TEXT, code TEXT UNIQUE, dateCreated TEXT, paidCommission INTEGER
);
CREATE TABLE IF NOT EXISTS referral_transactions (
  id TEXT PRIMARY KEY, ptId TEXT, ptCode TEXT, orderId TEXT, customerName TEXT, comboName TEXT, price REAL, timestamp TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, name TEXT, category TEXT, basePrice INTEGER, image TEXT, description TEXT
);
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY, fullName TEXT, employeeId TEXT, email TEXT, phone TEXT, idNumber TEXT, dateOfBirth TEXT,
  address TEXT, branch TEXT, position TEXT, baseSalary INTEGER, startDate TEXT, username TEXT, password TEXT,
  photo TEXT, customData TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY, employeeId TEXT, employeeName TEXT, date TEXT, shiftType TEXT, startTime TEXT, endTime TEXT,
  status TEXT, checkIn TEXT, checkOut TEXT, branch TEXT DEFAULT '', requestedBy TEXT DEFAULT 'admin',
  checkInPhoto TEXT DEFAULT '', checkOutPhoto TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY, name TEXT, phone TEXT UNIQUE, points INTEGER DEFAULT 0, createdAt TEXT
);
CREATE TABLE IF NOT EXISTS loyalty_vouchers (
  id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, programId TEXT NOT NULL, customerId TEXT NOT NULL,
  customerName TEXT, customerPhone TEXT, status TEXT DEFAULT 'active', pointsDeducted INTEGER DEFAULT 0,
  issuedAt TEXT NOT NULL, usedAt TEXT, expiresAt TEXT
);
CREATE TABLE IF NOT EXISTS combo_subscriptions (
  id TEXT PRIMARY KEY, orderId TEXT, customerName TEXT, customerPhone TEXT, planName TEXT,
  comboType TEXT, comboDuration TEXT, startDate TEXT, nextDelivery TEXT, deliveryDays TEXT,
  items TEXT, totalPrice INTEGER, status TEXT DEFAULT 'pending', branchId TEXT, deliveryAddress TEXT,
  careStaffId TEXT, careStaffName TEXT, closedByStaffId TEXT, closedByStaffName TEXT,
  closedAt TEXT, assignedAt TEXT, pauseStartDate TEXT, pauseEndDate TEXT, notes TEXT, staff TEXT,
  lastDeliveredAt TEXT, deliveryLog TEXT DEFAULT '[]',
  createdAt TEXT, updatedAt TEXT
);
CREATE TABLE IF NOT EXISTS customer_care_assignments (
  id TEXT PRIMARY KEY, customerPhone TEXT UNIQUE, customerName TEXT, careStaffId TEXT,
  careStaffName TEXT, assignedAt TEXT, assignedBy TEXT, notes TEXT,
  customerType TEXT DEFAULT 'combo', fbName TEXT DEFAULT '', pipelineStage TEXT DEFAULT 'nurturing',
  lastContactAt TEXT, tags TEXT DEFAULT '[]', salesRefCode TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS sales_leads (
  id TEXT PRIMARY KEY, fbName TEXT, customerName TEXT, customerPhone TEXT,
  careStaffId TEXT, careStaffName TEXT, pipelineStage TEXT DEFAULT 'fb_new',
  source TEXT DEFAULT 'facebook', notes TEXT DEFAULT '',
  createdAt TEXT, updatedAt TEXT, lastContactAt TEXT
);
CREATE TABLE IF NOT EXISTS sales_activities (
  id TEXT PRIMARY KEY, customerPhone TEXT, leadId TEXT, careStaffId TEXT, careStaffName TEXT,
  activityType TEXT, content TEXT, createdAt TEXT
);
`;

async function seedIfEmpty(db) {
  const settingsCount = (await get(db, 'SELECT COUNT(*) as count FROM settings')).count;
  if (settingsCount === 0) {
    console.log('Seeding default settings (SQLite)...');
    const defaultPriceTable = {
      '250ml': { 20: 39000, 40: 59000 },
      '360ml': { 20: 59000, 40: 79000, 60: 99000 },
      '500ml': { 20: 79000, 40: 99000, 60: 119000 },
      '700ml': { 60: 139000, 90: 159000 },
    };
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'menuPriceTable',
      JSON.stringify(defaultPriceTable),
    ]);
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'menuComboToppings',
      JSON.stringify([
        { id: 'healthy-boost', name: 'Healthy Boost', items: vi('Yen mach + Hat chia'), price: 25000 },
      ]),
    ]);
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['loyaltyEarnRate', '1000']);
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['loyaltyRedeemValue', '1000']);
  }

  const productCount = (await get(db, 'SELECT COUNT(*) as count FROM products')).count;
  if (productCount === 0) {
    console.log('Seeding products (SQLite)...');
    const products = [
      ['SM-01', vi('Dau hat chia'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Strawberry Chia'],
      ['SM-10', vi('Xoai cam'), 'smoothies', 59000, '/images/mango_smoothie.png', 'Mango Orange'],
      ['TP-01', vi('Sua hat 100%'), 'toppings', 15000, '🥛', ''],
      ['CB-01', 'Fat Loss Plan', 'combo', 449000, '📦', vi('Giam mo 7 ngay')],
    ];
    for (const p of products) {
      await run(db, 'INSERT OR IGNORE INTO products VALUES (?,?,?,?,?,?)', p);
    }
  }

  const empCount = (await get(db, 'SELECT COUNT(*) as count FROM employees')).count;
  const csEmployees = [
    ['13', vi('Nguyen Thi Lan'), 'NV-013', 'nguyenthilan@fitblend.vn', '0913456789', 'CN1', 'online_sales', 'thilan', '123'],
    ['14', vi('Tran Van Hieu'), 'NV-014', 'tranvanhieu@fitblend.vn', '0914567890', 'CN1', 'online_sales', 'vanhieu', '123'],
  ];
  if (empCount === 0) {
    console.log('Seeding employees (SQLite)...');
    const employees = [
      ['1', vi('Nguyen Van An'), 'NV-001', 'nguyenvanan@fitblend.vn', '0901234567', 'CN1', 'manager', 'vanan', '123'],
      ['2', vi('Tran Thi Binh'), 'NV-002', 'tranthibinh@fitblend.vn', '0902345678', 'CN1', 'cashier', 'thibinh', '123'],
      ['3', vi('Le Minh Cuong'), 'NV-003', 'leminhcuong@fitblend.vn', '0903456789', 'CN2', 'bartender', 'minhcuong', '123'],
      ['4', vi('Pham Thu Dung'), 'NV-004', 'phamthudung@fitblend.vn', '0904567890', 'CN1', 'bartender', 'thudung', '123'],
      ['5', vi('Hoang Quoc Hung'), 'NV-005', 'hoangquochung@fitblend.vn', '0905678901', 'CN2', 'manager', 'quochung', '123'],
      ['6', vi('Vo Thi Kim'), 'NV-006', 'vothikim@fitblend.vn', '0906789012', 'CN3', 'server', 'thikim', '123'],
      ['7', vi('Dang Van Long'), 'NV-007', 'dangvanlong@fitblend.vn', '0907890123', 'CN2', 'server', 'vanlong', '123'],
      ['8', vi('Bui Thi Mai'), 'NV-008', 'buithimai@fitblend.vn', '0908901234', 'CN3', 'cashier', 'thimai', '123'],
      ['9', vi('Ngo Minh Nam'), 'NV-009', 'ngominhnam@fitblend.vn', '0909012345', 'CN3', 'bartender', 'minhnam', '123'],
      ['10', vi('Ly Thi Oanh'), 'NV-010', 'lythioanh@fitblend.vn', '0900123456', 'CN1', 'server', 'thioanh', '123'],
      ['11', vi('Truong Van Phuc'), 'NV-011', 'truongvanphuc@fitblend.vn', '0911234567', 'CN3', 'manager', 'vanphuc', '123'],
      ['12', vi('Dinh Thi Quynh'), 'NV-012', 'dinhthiquynh@fitblend.vn', '0912345678', 'CN2', 'cleaner', 'thiquynh', '123'],
      ['13', vi('Nguyen Thi Lan'), 'NV-013', 'nguyenthilan@fitblend.vn', '0913456789', 'CN1', 'online_sales', 'thilan', '123'],
      ['14', vi('Tran Van Hieu'), 'NV-014', 'tranvanhieu@fitblend.vn', '0914567890', 'CN1', 'online_sales', 'vanhieu', '123'],
    ];
    for (const e of employees) {
      await run(
        db,
        `INSERT OR IGNORE INTO employees (id, fullName, employeeId, email, phone, branch, position, username, password, customData)
         VALUES (?,?,?,?,?,?,?,?,?,'{}')`,
        e
      );
    }
  } else {
    for (const e of csEmployees) {
      await run(
        db,
        `INSERT OR IGNORE INTO employees (id, fullName, employeeId, email, phone, branch, position, username, password, customData)
         VALUES (?,?,?,?,?,?,?,?,?,'{}')`,
        e
      );
    }
  }

  const custCount = (await get(db, 'SELECT COUNT(*) as count FROM customers')).count;
  if (custCount === 0) {
    const now = new Date().toISOString();
    await run(db, 'INSERT OR IGNORE INTO customers VALUES (?,?,?,?,?)', [
      'CUST-001',
      vi('Nguyen Hoang Nam'),
      '0987654321',
      150,
      now,
    ]);
  }
}

async function init() {
  const dbDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'database.sqlite');

  const db = await openDb(dbPath);
  await run(db, 'PRAGMA foreign_keys = ON');
  await new Promise((resolve, reject) => {
    db.exec(SCHEMA, (err) => (err ? reject(err) : resolve()));
  });

  const migrations = [
    "ALTER TABLE employees ADD COLUMN customData TEXT DEFAULT '{}'",
    "ALTER TABLE shifts ADD COLUMN branch TEXT DEFAULT ''",
    "ALTER TABLE shifts ADD COLUMN requestedBy TEXT DEFAULT 'admin'",
    "ALTER TABLE shifts ADD COLUMN checkInPhoto TEXT DEFAULT ''",
    "ALTER TABLE shifts ADD COLUMN checkOutPhoto TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN salesStaffId TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN salesStaffName TEXT DEFAULT ''",
    "ALTER TABLE customer_care_assignments ADD COLUMN customerType TEXT DEFAULT 'combo'",
    "ALTER TABLE customer_care_assignments ADD COLUMN fbName TEXT DEFAULT ''",
    "ALTER TABLE customer_care_assignments ADD COLUMN pipelineStage TEXT DEFAULT 'nurturing'",
    "ALTER TABLE customer_care_assignments ADD COLUMN lastContactAt TEXT",
    "ALTER TABLE customer_care_assignments ADD COLUMN tags TEXT DEFAULT '[]'",
    "ALTER TABLE customer_care_assignments ADD COLUMN salesRefCode TEXT DEFAULT ''",
    "ALTER TABLE combo_subscriptions ADD COLUMN lastDeliveredAt TEXT",
    "ALTER TABLE combo_subscriptions ADD COLUMN deliveryLog TEXT DEFAULT '[]'",
  ];
  for (const sql of migrations) {
    await run(db, sql).catch(() => {});
  }
  await run(db, "UPDATE employees SET position = 'online_sales' WHERE position = 'customer_care'").catch(() => {});

  await new Promise((resolve, reject) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS sales_leads (
        id TEXT PRIMARY KEY, fbName TEXT, customerName TEXT, customerPhone TEXT,
        careStaffId TEXT, careStaffName TEXT, pipelineStage TEXT DEFAULT 'fb_new',
        source TEXT DEFAULT 'facebook', notes TEXT DEFAULT '',
        createdAt TEXT, updatedAt TEXT, lastContactAt TEXT
      );
      CREATE TABLE IF NOT EXISTS sales_activities (
        id TEXT PRIMARY KEY, customerPhone TEXT, leadId TEXT, careStaffId TEXT, careStaffName TEXT,
        activityType TEXT, content TEXT, createdAt TEXT
      );
    `, (err) => (err ? reject(err) : resolve()));
  }).catch(() => {});

  await seedIfEmpty(db);

  const { getInventoryCatalog } = require('./storeSeeds');
  for (const item of getInventoryCatalog()) {
    await run(
      db,
      'INSERT OR IGNORE INTO inventory (id, name, unit, currentStock, minStock, cost, category) VALUES (?,?,?,?,?,?,?)',
      item
    );
  }

  console.log(`SQLite connected (${dbPath}).`);
  return db;
}

module.exports = { init };
