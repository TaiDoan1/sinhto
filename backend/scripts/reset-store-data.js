/**
 * Reset cửa hàng về trạng thái mới: xóa đơn, khách, lịch sử kho; tồn = 0; NV mẫu.
 * Giữ: sản phẩm menu, cài đặt giá.
 *
 * Usage:
 *   CONFIRM_RESET=yes DATABASE_URL=... node backend/scripts/reset-store-data.js
 *   CONFIRM_RESET=yes USE_SQLITE=true node backend/scripts/reset-store-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { getInventoryCatalog, getSampleEmployees } = require('../storeSeeds');
const { initSchemaAndSeeds } = require('../initDb');

const CLEAR_TABLES = [
  'sales_activities',
  'sales_leads',
  'customer_care_assignments',
  'loyalty_vouchers',
  'inventory_movements',
  'referral_transactions',
  'wholesale_accounts',
  'partners_pt',
  'combo_subscriptions',
  'orders',
  'shifts',
  'customers',
];

async function clearPostgres(pool) {
  for (const table of CLEAR_TABLES) {
    await pool.query(`DELETE FROM ${table}`);
    console.log(`  cleared ${table}`);
  }
  await pool.query('DELETE FROM employees');
  console.log('  cleared employees');
  await pool.query('DELETE FROM inventory');
  console.log('  cleared inventory');
}

async function seedPostgres(pool) {
  const catalog = getInventoryCatalog();
  for (const item of catalog) {
    await pool.query(
      `INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      item
    );
  }
  console.log(`  seeded ${catalog.length} inventory items (stock 0)`);

  const employees = getSampleEmployees();
  const sql = `INSERT INTO employees (id, "fullName", "employeeId", email, phone, "idNumber", "dateOfBirth", address, branch, position, "baseSalary", "startDate", username, password, photo, "customData")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}')`;
  for (const e of employees) {
    await pool.query(sql, e);
  }
  console.log(`  seeded ${employees.length} employees (password: 123)`);
}

function openSqlite(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(db)));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function clearSqlite(db) {
  for (const table of CLEAR_TABLES) {
    await run(db, `DELETE FROM ${table}`);
    console.log(`  cleared ${table}`);
  }
  await run(db, 'DELETE FROM employees');
  await run(db, 'DELETE FROM inventory');
}

async function seedSqlite(db) {
  for (const item of getInventoryCatalog()) {
    await run(
      db,
      'INSERT INTO inventory (id, name, unit, currentStock, minStock, cost, category) VALUES (?,?,?,?,?,?,?)',
      item
    );
  }
  for (const e of getSampleEmployees()) {
    await run(
      db,
      `INSERT INTO employees (id, fullName, employeeId, email, phone, idNumber, dateOfBirth, address, branch, position, baseSalary, startDate, username, password, photo, customData)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'{}')`,
      e
    );
  }
}

async function main() {
  if (process.env.CONFIRM_RESET !== 'yes') {
    console.error('Abort: set CONFIRM_RESET=yes to run store reset.');
    process.exit(1);
  }

  const useSqlite =
    (process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1') &&
    !process.env.DATABASE_URL?.includes('supabase');

  console.log('=== RESET CỬA HÀNG FITBLEND ===\n');

  if (useSqlite) {
    const sqlitePath =
      process.env.SQLITE_PATH || path.join(__dirname, '../../data/database.sqlite');
    const db = await openSqlite(sqlitePath);
    try {
      console.log('SQLite:', sqlitePath);
      await clearSqlite(db);
      await seedSqlite(db);
    } finally {
      db.close();
    }
  } else {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /\.supabase\.co\b/i.test(process.env.DATABASE_URL)
        ? { rejectUnauthorized: false }
        : undefined,
    });
    try {
      await pool.query('SELECT 1');
      await initSchemaAndSeeds(pool);
      await clearPostgres(pool);
      await seedPostgres(pool);
    } finally {
      await pool.end();
    }
  }

  console.log('\n✅ Reset xong.');
  console.log('   • Tồn kho = 0 — Admin cần Nhập kho trước khi bán');
  console.log('   • 14 NV mẫu — mật khẩu: 123');
  console.log('   • Menu sản phẩm + giá giữ nguyên');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
