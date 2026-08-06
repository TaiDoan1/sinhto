const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { removeDiacritics } = require('./vietnamese');
const { PRODUCT } = require('./imagePaths');
const { DEFAULT_MENU_PRICE_TABLE } = require('./menuPricing');
const { DEFAULT_COMBO_TOPPINGS } = require('./menuToppings');

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
  checkInPhoto TEXT DEFAULT '', checkOutPhoto TEXT DEFAULT '',
  closingOrderCount INTEGER, closingRevenue INTEGER, reason TEXT DEFAULT '',
  startCash REAL DEFAULT 0, endCashActual REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS shift_cash_movements (
  id TEXT PRIMARY KEY, shiftId TEXT, type TEXT, amount REAL, note TEXT DEFAULT '', createdAt TEXT, createdBy TEXT DEFAULT ''
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
  lastDeliveredAt TEXT, deliveryLog TEXT DEFAULT '[]', totalCups INTEGER DEFAULT 7,
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
CREATE TABLE IF NOT EXISTS fb_conversations (
  id TEXT PRIMARY KEY, psid TEXT UNIQUE, customerName TEXT, profilePic TEXT,
  linkedCustomerPhone TEXT, lastMessageText TEXT, lastMessageAt TEXT, lastDirection TEXT,
  unreadCount INTEGER DEFAULT 0, assignedStaffId TEXT, assignedStaffName TEXT,
  createdAt TEXT, updatedAt TEXT
);
CREATE TABLE IF NOT EXISTS fb_messages (
  id TEXT PRIMARY KEY, conversationId TEXT, direction TEXT, text TEXT,
  staffId TEXT, staffName TEXT, createdAt TEXT
);
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
);
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
);
`;

async function seedIfEmpty(db) {
  const settingsCount = (await get(db, 'SELECT COUNT(*) as count FROM settings')).count;
  if (settingsCount === 0) {
    console.log('Seeding default settings (SQLite)...');
    const defaultPriceTable = DEFAULT_MENU_PRICE_TABLE;
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'menuPriceTable',
      JSON.stringify(defaultPriceTable),
    ]);
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'menuComboToppings',
      JSON.stringify(DEFAULT_COMBO_TOPPINGS),
    ]);
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['loyaltyEarnRate', '1000']);
    await run(db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['loyaltyRedeemValue', '1000']);
  }

  const productCount = (await get(db, 'SELECT COUNT(*) as count FROM products')).count;
  if (productCount === 0) {
    console.log('Seeding products (SQLite)...');
    const products = [
      ['SM-01', vi('Dau hat chia'), 'smoothies', 0, PRODUCT.strawberry, 'Strawberry Chia'],
      ['SM-10', vi('Xoai cam'), 'smoothies', 0, PRODUCT.mango, 'Mango Orange'],
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
    "ALTER TABLE employees ADD COLUMN payType TEXT DEFAULT 'monthly'",
    "ALTER TABLE employees ADD COLUMN hourlyRate INTEGER",
    "ALTER TABLE employees ADD COLUMN secondaryBranches TEXT DEFAULT '[]'",
    "ALTER TABLE shifts ADD COLUMN branch TEXT DEFAULT ''",
    "ALTER TABLE shifts ADD COLUMN requestedBy TEXT DEFAULT 'admin'",
    "ALTER TABLE shifts ADD COLUMN checkInPhoto TEXT DEFAULT ''",
    "ALTER TABLE shifts ADD COLUMN checkOutPhoto TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN salesStaffId TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN salesStaffName TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN staffId TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN shiftId TEXT DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN shipFee INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN note TEXT DEFAULT ''",
    "ALTER TABLE shifts ADD COLUMN closingOrderCount INTEGER",
    "ALTER TABLE shifts ADD COLUMN closingRevenue INTEGER",
    "ALTER TABLE shifts ADD COLUMN reason TEXT DEFAULT ''",
    "ALTER TABLE shifts ADD COLUMN startCash REAL DEFAULT 0",
    "ALTER TABLE shifts ADD COLUMN endCashActual REAL DEFAULT 0",
    "ALTER TABLE customer_care_assignments ADD COLUMN customerType TEXT DEFAULT 'combo'",
    "ALTER TABLE customer_care_assignments ADD COLUMN fbName TEXT DEFAULT ''",
    "ALTER TABLE customer_care_assignments ADD COLUMN pipelineStage TEXT DEFAULT 'nurturing'",
    "ALTER TABLE customer_care_assignments ADD COLUMN lastContactAt TEXT",
    "ALTER TABLE customer_care_assignments ADD COLUMN tags TEXT DEFAULT '[]'",
    "ALTER TABLE customer_care_assignments ADD COLUMN salesRefCode TEXT DEFAULT ''",
    "ALTER TABLE combo_subscriptions ADD COLUMN lastDeliveredAt TEXT",
    "ALTER TABLE combo_subscriptions ADD COLUMN deliveryLog TEXT DEFAULT '[]'",
    "ALTER TABLE combo_subscriptions ADD COLUMN totalCups INTEGER DEFAULT 7",
    "ALTER TABLE combo_subscriptions ADD COLUMN deliveredCups INTEGER DEFAULT 0",
    "ALTER TABLE combo_subscriptions ADD COLUMN commissionAmount INTEGER DEFAULT 0",
    "ALTER TABLE combo_subscriptions ADD COLUMN commissionStatus TEXT DEFAULT 'pending'",
    "ALTER TABLE combo_subscriptions ADD COLUMN shipFee INTEGER DEFAULT 0",
    "ALTER TABLE combo_subscriptions ADD COLUMN endDate TEXT",
    "ALTER TABLE combo_subscriptions ADD COLUMN renewedFromComboId TEXT",
    "ALTER TABLE combo_subscriptions ADD COLUMN renewedFromDuration TEXT",
    "ALTER TABLE combo_subscriptions ADD COLUMN renewedFromPlanName TEXT",
    "ALTER TABLE combo_subscriptions ADD COLUMN refundAmount INTEGER",
    "ALTER TABLE combo_subscriptions ADD COLUMN refundedAt TEXT",
    "ALTER TABLE fb_messages ADD COLUMN attachments TEXT DEFAULT '[]'",
    "ALTER TABLE fb_conversations ADD COLUMN tags TEXT DEFAULT '[]'",
    "ALTER TABLE gift_redemptions ADD COLUMN code TEXT",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_redemptions_campaign_code ON gift_redemptions(campaignId, code)",
    `CREATE TABLE IF NOT EXISTS gift_campaigns (
      id TEXT PRIMARY KEY, name TEXT, branchId TEXT, giftSize TEXT DEFAULT '360ml',
      giftProtein INTEGER DEFAULT 20, totalLimit INTEGER DEFAULT 0, redeemedCount INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1, createdAt TEXT, updatedAt TEXT
    )`,
    // Mở rộng: nhiều chi nhánh + kiểu thưởng (tặng ly / giảm % / giảm tiền) + chế độ áp dụng
    "ALTER TABLE gift_campaigns ADD COLUMN rewardType TEXT DEFAULT 'gift'",
    "ALTER TABLE gift_campaigns ADD COLUMN discountPercent INTEGER DEFAULT 0",
    "ALTER TABLE gift_campaigns ADD COLUMN discountAmount INTEGER DEFAULT 0",
    "ALTER TABLE gift_campaigns ADD COLUMN branchIds TEXT DEFAULT '[]'",
    "ALTER TABLE gift_campaigns ADD COLUMN applyMode TEXT DEFAULT 'phone'",
    `CREATE TABLE IF NOT EXISTS gift_redemptions (
      id TEXT PRIMARY KEY, campaignId TEXT, branchId TEXT, customerPhone TEXT,
      productName TEXT, orderId TEXT, staffId TEXT, staffName TEXT, createdAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS saved_replies (
      id TEXT PRIMARY KEY, title TEXT, message TEXT, imageUrl TEXT DEFAULT '',
      usageCount INTEGER DEFAULT 0, createdBy TEXT, createdAt TEXT, updatedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS branch_inventory (
      branchId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      currentStock REAL DEFAULT 0,
      minStock REAL,
      PRIMARY KEY (branchId, itemId)
    )`,
    `CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT
    )`,
    "ALTER TABLE inventory_movements ADD COLUMN branchId TEXT DEFAULT 'CN1'",
    "ALTER TABLE inventory_movements ADD COLUMN receiptId TEXT",
    `CREATE TABLE IF NOT EXISTS stock_receipts (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      branchId TEXT,
      createdBy TEXT,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      lines TEXT DEFAULT '[]',
      approvedAt TEXT,
      approvedBy TEXT
    )`,
    // Kho lưu trữ đơn cũ (cùng cột với orders) + nhật ký sao lưu
    "CREATE TABLE IF NOT EXISTS orders_archive AS SELECT * FROM orders WHERE 0",
    `CREATE TABLE IF NOT EXISTS backup_log (
      id TEXT PRIMARY KEY, fromDate TEXT, toDate TEXT, orderCount INTEGER,
      createdAt TEXT, createdBy TEXT DEFAULT ''
    )`,
    "CREATE INDEX IF NOT EXISTS idx_ordersarch_time ON orders_archive(time)",
    // Index tăng tốc truy vấn (tránh quét toàn bảng khi dữ liệu lớn dần)
    "CREATE INDEX IF NOT EXISTS idx_orders_branch_time ON orders(branchId, time)",
    "CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shiftId)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status_time ON orders(status, time)",
    "CREATE INDEX IF NOT EXISTS idx_orders_salesstaff ON orders(salesStaffId)",
    "CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customerPhone)",
    "CREATE INDEX IF NOT EXISTS idx_shifts_emp_status ON shifts(employeeId, status)",
    "CREATE INDEX IF NOT EXISTS idx_shifts_branch_date ON shifts(branch, date)",
    "CREATE INDEX IF NOT EXISTS idx_combosub_phone ON combo_subscriptions(customerPhone)",
    "CREATE INDEX IF NOT EXISTS idx_combosub_branch ON combo_subscriptions(branchId)",
    "CREATE INDEX IF NOT EXISTS idx_salesact_phone ON sales_activities(customerPhone)",
    "CREATE INDEX IF NOT EXISTS idx_invmov_branch ON inventory_movements(branchId)",
    "CREATE INDEX IF NOT EXISTS idx_invmov_time ON inventory_movements(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_combosub_care ON combo_subscriptions(careStaffId)",
    "CREATE INDEX IF NOT EXISTS idx_leads_care ON sales_leads(careStaffId)",
    "CREATE INDEX IF NOT EXISTS idx_care_staff ON customer_care_assignments(careStaffId)",
    "CREATE INDEX IF NOT EXISTS idx_salesact_care ON sales_activities(careStaffId)",
    "CREATE INDEX IF NOT EXISTS idx_fbmsg_conv ON fb_messages(conversationId, createdAt)",
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

  const { DEFAULT_BRANCHES } = require('./branches');
  for (const b of DEFAULT_BRANCHES) {
    await run(
      db,
      `INSERT OR IGNORE INTO branches (id, name, address, phone, active, sortOrder, createdAt) VALUES (?,?,?,?,?,?,?)`,
      [b.id, b.name, b.address, b.phone, b.active ? 1 : 0, b.sortOrder, new Date().toISOString()]
    ).catch(() => {});
  }

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
