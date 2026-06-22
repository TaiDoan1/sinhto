const { removeDiacritics } = require('./vietnamese');

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

async function initSchemaAndSeeds(pool) {
  await pool.query(SCHEMA_SQL);

  if ((await countRows(pool, 'settings')) === 0) {
    console.log('Seeding default settings...');
    const defaultPriceTable = {
      '250ml': { 20: 39000, 40: 59000 },
      '360ml': { 20: 59000, 40: 79000, 60: 99000 },
      '500ml': { 20: 79000, 40: 99000, 60: 119000 },
      '700ml': { 60: 139000, 90: 159000 },
    };
    const defaultCombos = [
      { id: 'healthy-boost', name: 'Healthy Boost', items: vi('Yen mach + Hat chia + Co ngot'), price: 25000, originalPrice: 30000, save: 5000 },
      { id: 'protein-plus', name: 'Protein Plus', items: 'Whey Gold + Sua A2', price: 49000, originalPrice: 59000, save: 10000 },
      { id: 'beauty-blend', name: 'Beauty Blend', items: vi('Collagen + Sua hat + Mat ong'), price: 65000, originalPrice: 79000, save: 14000 },
      { id: 'nutty-crunch', name: 'Nutty Crunch', items: vi('Bo dau phong + Dua say + Cha la'), price: 29000, originalPrice: 35000, save: 6000 },
    ];
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
      ['SM-01', vi('Dau hat chia'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Strawberry Chia'],
      ['SM-02', vi('Dau chuoi'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Strawberry Banana'],
      ['SM-03', vi('Mang cau dau'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Soursop Strawberry'],
      ['SM-04', vi('Dau cam'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Strawberry Orange'],
      ['SM-05', vi('Dau tam hat chia'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Mulberry Chia'],
      ['SM-06', vi('Phuc bon tu hat chia'), 'smoothies', 59000, '/images/strawberry_smoothie.png', 'Raspberry Chia'],
      ['SM-07', vi('Chuoi hat chia'), 'smoothies', 59000, '/images/cacao_oat_smoothie.png', 'Banana Chia'],
      ['SM-08', vi('Chanh day chuoi'), 'smoothies', 59000, '/images/mango_smoothie.png', 'Passionfruit Banana'],
      ['SM-09', vi('Xoai thom'), 'smoothies', 59000, '/images/mango_smoothie.png', 'Mango Pineapple'],
      ['SM-10', vi('Xoai cam'), 'smoothies', 59000, '/images/mango_smoothie.png', 'Mango Orange'],
      ['SM-11', vi('Cacao yen mach'), 'smoothies', 59000, '/images/cacao_oat_smoothie.png', 'Cacao Oat'],
      ['SM-12', vi('Ca phe chuoi'), 'smoothies', 59000, '/images/cacao_oat_smoothie.png', 'Coffee Banana'],
      ['SM-13', vi('Bo'), 'smoothies', 79000, '/images/fitblend_hero_smoothie.png', 'Avocado'],
      ['SM-14', vi('Bo chuoi'), 'smoothies', 79000, '/images/fitblend_hero_smoothie.png', 'Avocado Banana'],
      ['SM-15', 'Matcha', 'smoothies', 79000, '/images/fitblend_hero_smoothie.png', 'Matcha'],
      ['TP-01', vi('Sua hat 100%'), 'toppings', 15000, '🥛', ''],
      ['TP-02', vi('Sua A2'), 'toppings', 20000, '🥛', ''],
      ['TP-03', vi('Bot dau ha lan'), 'toppings', 20000, '🫛', ''],
      ['TP-04', 'Whey Gold Standard', 'toppings', 39000, '💪', ''],
      ['TP-05', 'Collagen', 'toppings', 49000, '✨', ''],
      ['TP-06', vi('Yen mach'), 'toppings', 10000, '🌾', ''],
      ['TP-07', vi('Hat chia'), 'toppings', 10000, '🌾', ''],
      ['TP-08', vi('Dua say gion'), 'toppings', 10000, '🥥', ''],
      ['TP-09', vi('Co ngot'), 'toppings', 10000, '🌿', ''],
      ['TP-10', vi('Mat ong'), 'toppings', 15000, '🍯', ''],
      ['TP-11', vi('Mat mia'), 'toppings', 3000, '🍯', ''],
      ['TP-12', vi('Cha la'), 'toppings', 5000, '🌴', ''],
      ['TP-13', vi('Bo hanh nhan'), 'toppings', 10000, '🥜', ''],
      ['TP-14', vi('Bo dau phong'), 'toppings', 20000, '🥜', ''],
      ['TP-15', vi('Bo hat dieu'), 'toppings', 15000, '🥜', ''],
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

  const sampleEmployees = [
    ['1', vi('Nguyen Van An'), 'NV-001', 'nguyenvanan@fitblend.vn', '0901234567', '001234567890', '1995-03-15', vi('123 Le Loi, Phuong Ben Nghe, Quan 1, TP.HCM'), 'CN1', 'manager', 12000000, '2023-01-10', 'vanan', '123', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'],
    ['2', vi('Tran Thi Binh'), 'NV-002', 'tranthibinh@fitblend.vn', '0902345678', '002345678901', '1998-07-22', vi('456 Nguyen Hue, Phuong Ben Nghe, Quan 1, TP.HCM'), 'CN1', 'cashier', 8000000, '2023-02-15', 'thibinh', '123', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop'],
    ['3', vi('Le Minh Cuong'), 'NV-003', 'leminhcuong@fitblend.vn', '0903456789', '003456789012', '1997-11-08', vi('789 Pasteur, Phuong Vo Thi Sau, Quan 3, TP.HCM'), 'CN2', 'bartender', 9000000, '2023-03-01', 'minhcuong', '123', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop'],
    ['4', vi('Pham Thu Dung'), 'NV-004', 'phamthudung@fitblend.vn', '0904567890', '004567890123', '1999-05-30', vi('321 Dien Bien Phu, Phuong Dakao, Quan 1, TP.HCM'), 'CN1', 'bartender', 8500000, '2023-04-20', 'thudung', '123', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'],
    ['5', vi('Hoang Quoc Hung'), 'NV-005', 'hoangquochung@fitblend.vn', '0905678901', '005678901234', '1996-09-12', vi('654 Cach Mang Thang 8, Phuong 11, Quan 3, TP.HCM'), 'CN2', 'manager', 11500000, '2023-01-15', 'quochung', '123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop'],
    ['6', vi('Vo Thi Kim'), 'NV-006', 'vothikim@fitblend.vn', '0906789012', '006789012345', '2000-01-25', vi('147 Xa lo Ha Noi, Phuong Thao Dien, Quan 2, TP.HCM'), 'CN3', 'server', 7500000, '2023-05-10', 'thikim', '123', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop'],
    ['7', vi('Dang Van Long'), 'NV-007', 'dangvanlong@fitblend.vn', '0907890123', '007890123456', '1998-12-03', vi('258 Vo Van Tan, Phuong 5, Quan 3, TP.HCM'), 'CN2', 'server', 7500000, '2023-06-01', 'vanlong', '123', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop'],
    ['8', vi('Bui Thi Mai'), 'NV-008', 'buithimai@fitblend.vn', '0908901234', '008901234567', '1997-06-18', vi('369 Ly Thuong Kiet, Phuong 14, Quan 10, TP.HCM'), 'CN3', 'cashier', 8000000, '2023-02-28', 'thimai', '123', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop'],
    ['9', vi('Ngo Minh Nam'), 'NV-009', 'ngominhnam@fitblend.vn', '0909012345', '009012345678', '1999-08-27', vi('741 Tran Hung Dao, Phuong 2, Quan 5, TP.HCM'), 'CN3', 'bartender', 9000000, '2023-07-15', 'minhnam', '123', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop'],
    ['10', vi('Ly Thi Oanh'), 'NV-010', 'lythioanh@fitblend.vn', '0900123456', '010123456789', '2001-02-14', vi('852 Hoang Van Thu, Phuong 4, Quan Tan Binh, TP.HCM'), 'CN1', 'server', 7500000, '2023-08-01', 'thioanh', '123', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop'],
    ['11', vi('Truong Van Phuc'), 'NV-011', 'truongvanphuc@fitblend.vn', '0911234567', '011234567890', '1996-04-20', vi('963 Cong Hoa, Phuong 12, Quan Tan Binh, TP.HCM'), 'CN3', 'manager', 12500000, '2023-01-05', 'vanphuc', '123', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop'],
    ['12', vi('Dinh Thi Quynh'), 'NV-012', 'dinhthiquynh@fitblend.vn', '0912345678', '012345678901', '2000-10-05', vi('159 Nguyen Dinh Chieu, Phuong Da Kao, Quan 1, TP.HCM'), 'CN2', 'cleaner', 6500000, '2023-09-01', 'thiquynh', '123', 'https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=400&h=400&fit=crop'],
    ['13', vi('Nguyen Thi Lan'), 'NV-013', 'nguyenthilan@fitblend.vn', '0913456789', '013456789012', '1998-04-12', vi('88 Vo Van Tan, Phuong 6, Quan 3, TP.HCM'), 'CN1', 'online_sales', 9000000, '2024-01-15', 'thilan', '123', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop'],
    ['14', vi('Tran Van Hieu'), 'NV-014', 'tranvanhieu@fitblend.vn', '0914567890', '014567890123', '1997-08-20', vi('55 Nguyen Trai, Phuong 3, Quan 5, TP.HCM'), 'CN1', 'online_sales', 9000000, '2024-02-01', 'vanhieu', '123', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop'],
  ];

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
    console.log('Seeding sample inventory...');
    const inventory = [
      ['INV-001', vi('Dau tay'), 'kg', 25.0, 5.0, 80000, 'fruit'],
      ['INV-002', vi('Xoai'), 'kg', 30.0, 6.0, 40000, 'fruit'],
      ['INV-003', vi('Chuoi'), 'kg', 15.0, 3.0, 20000, 'fruit'],
      ['INV-004', vi('Bo'), 'kg', 20.0, 5.0, 60000, 'fruit'],
      ['INV-005', vi('Dua'), 'kg', 10.0, 2.0, 25000, 'fruit'],
      ['INV-006', vi('Viet quat'), 'kg', 8.0, 2.0, 150000, 'fruit'],
      ['INV-007', vi('Rau bina'), 'kg', 5.0, 1.5, 35000, 'fruit'],
      ['INV-008', vi('Sua tuoi'), 'lit', 40.0, 10.0, 28000, 'dairy'],
      ['INV-009', vi('Sua chua'), 'kg', 15.0, 4.0, 45000, 'dairy'],
      ['INV-010', 'Whey Protein', 'goi', 100, 20, 30000, 'protein'],
      ['INV-014', vi('Mat ong'), 'lit', 5.0, 1.0, 120000, 'topping'],
    ];
    for (const item of inventory) {
      await pool.query(
        'INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
        item
      );
    }
  }

  if ((await countRows(pool, 'customers')) === 0) {
    console.log('Seeding sample customers...');
    const now = new Date().toISOString();
    const customers = [
      ['CUST-001', vi('Nguyen Hoang Nam'), '0987654321', 150, now],
      ['CUST-002', vi('Pham Minh Tuyen'), '0912345678', 45, now],
      ['CUST-003', vi('Tran Thi Thu Huong'), '0909998887', 280, now],
    ];
    for (const c of customers) {
      await pool.query(
        'INSERT INTO customers (id, name, phone, points, "createdAt") VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
        c
      );
    }
  }

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

  const extendedInventory = [
    ['INV-012', vi('Sua A2'), 'lít', 0, 2, 35000, 'dairy'],
    ['INV-013', vi('Bot dau ha lan'), 'kg', 0, 1, 45000, 'protein'],
    ['INV-015', 'Collagen', 'gói', 0, 5, 49000, 'protein'],
    ['INV-016', vi('Yen mach'), 'kg', 0, 2, 25000, 'topping'],
    ['INV-017', vi('Hat chia'), 'kg', 0, 2, 30000, 'topping'],
    ['INV-018', vi('Dua say'), 'kg', 0, 2, 35000, 'topping'],
    ['INV-019', vi('Co ngot'), 'kg', 0, 1, 20000, 'topping'],
    ['INV-020', vi('Mat mia'), 'lít', 0, 1, 15000, 'topping'],
    ['INV-021', vi('Cha la'), 'kg', 0, 1, 40000, 'topping'],
    ['INV-022', vi('Bo hat'), 'kg', 0, 2, 55000, 'topping'],
  ];
  for (const item of extendedInventory) {
    await pool.query(
      'INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
      item
    );
  }
}

module.exports = { initSchemaAndSeeds, SCHEMA_SQL };
