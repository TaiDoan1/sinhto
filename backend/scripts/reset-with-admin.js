#!/usr/bin/env node
/**
 * Reset toàn bộ dữ liệu và tạo tài khoản admin mới
 * - Xóa hết tất cả dữ liệu
 * - Seed inventory (stock = 0)
 * - Tạo admin account: nhondo / 123
 *
 * Giữ nguyên:
 * - Menu / Sản phẩm
 * - Cài đặt giá
 *
 * Usage:
 *   CONFIRM_RESET=yes node backend/scripts/reset-with-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { hashPassword } = require('../password');
const { getInventoryCatalog } = require('../storeSeeds');

const TABLES_TO_CLEAR = [
  'sales_activities',
  'sales_leads',
  'customer_care_assignments',
  'loyalty_vouchers',
  'inventory_movements',
  'referral_transactions',
  'wholesale_accounts',
  'partners_pt',
  'combo_subscriptions',
  'delivery_logs',
  'combo_transfers',
  'orders',
  'shifts',
  'customers',
  'employees',
  'branches',
];

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

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

async function summarizeSqlite(db) {
  const getCount = (table) =>
    new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) AS c FROM ${table}`, (err, row) =>
        err ? reject(err) : resolve(row?.c || 0)
      );
    });

  return {
    branches: await getCount('branches'),
    employees: await getCount('employees'),
    orders: await getCount('orders'),
    customers: await getCount('customers'),
  };
}

async function resetSqlite(db) {
  await run(db, 'BEGIN TRANSACTION');
  try {
    // Clear all operational data
    for (const table of TABLES_TO_CLEAR) {
      await run(db, `DELETE FROM ${table}`);
    }
    // Clear branch inventory
    await run(db, 'DELETE FROM branch_inventory');
    // Clear and reseed inventory items
    await run(db, 'DELETE FROM inventory');

    // Seed inventory items
    const catalog = getInventoryCatalog();
    for (const item of catalog) {
      await run(
        db,
        'INSERT INTO inventory (id, name, unit, currentStock, minStock, cost, category) VALUES (?,?,?,?,?,?,?)',
        item
      );
    }

    // Create admin account
    const adminPassword = hashPassword('123');
    await run(
      db,
      `INSERT INTO employees (id, fullName, employeeId, email, phone, idNumber, dateOfBirth, address, branch, position, baseSalary, startDate, username, password, photo, customData)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'{}')`,
      [
        'ADMIN-001',
        'Nho ndo',
        'ADMIN-001',
        'admin@fitblend.vn',
        '',
        '',
        '2000-01-01',
        '',
        '',
        'admin',
        0,
        new Date().toISOString(),
        'nhondo',
        adminPassword,
        '',
      ]
    );

    await run(db, 'COMMIT');
  } catch (err) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw err;
  }
}

async function summarizePostgres(pool) {
  const getCount = async (table) => {
    const result = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
    return result.rows[0].c;
  };

  return {
    branches: await getCount('branches'),
    employees: await getCount('employees'),
    orders: await getCount('orders'),
    customers: await getCount('customers'),
  };
}

async function resetPostgres(pool) {
  await pool.query('BEGIN');
  try {
    // Clear all operational data
    for (const table of TABLES_TO_CLEAR) {
      await pool.query(`DELETE FROM ${table}`);
    }
    // Clear branch inventory
    await pool.query('DELETE FROM branch_inventory');
    // Clear and reseed inventory items
    await pool.query('DELETE FROM inventory');

    // Seed inventory items
    const catalog = getInventoryCatalog();
    for (const item of catalog) {
      await pool.query(
        `INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        item
      );
    }

    // Create admin account
    const adminPassword = hashPassword('123');
    await pool.query(
      `INSERT INTO employees (id, "fullName", "employeeId", email, phone, "idNumber", "dateOfBirth", address, branch, position, "baseSalary", "startDate", username, password, photo, "customData")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}')`,
      [
        'ADMIN-001',
        'Nho ndo',
        'ADMIN-001',
        'admin@fitblend.vn',
        '',
        '',
        '2000-01-01',
        '',
        '',
        'admin',
        0,
        new Date().toISOString(),
        'nhondo',
        adminPassword,
        '',
      ]
    );

    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function main() {
  if (process.env.CONFIRM_RESET !== 'yes') {
    console.error('Abort: set CONFIRM_RESET=yes to run reset.');
    process.exit(1);
  }

  const useSqlite =
    (process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1') &&
    !process.env.DATABASE_URL?.includes('supabase');

  console.log('=== RESET + TẠO ADMIN ===\n');

  if (useSqlite) {
    const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/database.sqlite');
    const db = await openSqlite(sqlitePath);
    try {
      console.log('SQLite:', sqlitePath);
      const before = await summarizeSqlite(db);
      console.log('Before:', before);
      await resetSqlite(db);
      const after = await summarizeSqlite(db);
      console.log('After :', after);
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
      const before = await summarizePostgres(pool);
      console.log('Before:', before);
      await resetPostgres(pool);
      const after = await summarizePostgres(pool);
      console.log('After :', after);
    } finally {
      await pool.end();
    }
  }

  console.log('\n✅ Reset xong.');
  console.log('   • Dữ liệu hoàn toàn mới');
  console.log('   • Admin: nhondo / 123');
  console.log('   • Inventory seeded (stock = 0)');
  console.log('   • Menu/Sản phẩm giữ nguyên');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
