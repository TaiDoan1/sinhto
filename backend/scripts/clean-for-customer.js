#!/usr/bin/env node
/**
 * Dọn sạch dữ liệu để gửi cho khách hàng:
 * - Xóa tất cả chi nhánh
 * - Xóa tất cả nhân viên
 * - Xóa đơn hàng, khách hàng, shift, lịch sử kho
 * - Reset tồn kho = 0
 *
 * Giữ nguyên:
 * - Menu / Sản phẩm
 * - Cài đặt giá
 * - Kho hàng (inventory items, nhưng stock = 0)
 *
 * Usage:
 *   CONFIRM_CLEAN=yes node backend/scripts/clean-for-customer.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

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

async function summarizeSqlite(db) {
  const getCount = (table, where = '') =>
    new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) AS c FROM ${table}${where ? ' WHERE ' + where : ''}`;
      db.get(sql, (err, row) => (err ? reject(err) : resolve(row?.c || 0)));
    });

  return {
    branches: await getCount('branches'),
    employees: await getCount('employees'),
    orders: await getCount('orders'),
    customers: await getCount('customers'),
    shifts: await getCount('shifts'),
    combos: await getCount('combo_subscriptions'),
    wholesale: await getCount('wholesale_accounts'),
    movements: await getCount('inventory_movements'),
    stockWithItems: await getCount('branch_inventory', '"currentStock" > 0'),
  };
}

async function cleanSqlite(db) {
  await run(db, 'BEGIN TRANSACTION');
  try {
    for (const table of TABLES_TO_CLEAR) {
      await run(db, `DELETE FROM ${table}`);
    }
    // Reset tồn kho chi nhánh
    await run(db, 'DELETE FROM branch_inventory');
    // Reset tồn kho inventory items về 0
    await run(db, 'UPDATE inventory SET currentStock = 0');
    await run(db, 'COMMIT');
  } catch (err) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw err;
  }
}

async function summarizePostgres(pool) {
  const getCount = async (table, where = '') => {
    const sql = `SELECT COUNT(*)::int AS c FROM ${table}${where ? ' WHERE ' + where : ''}`;
    const result = await pool.query(sql);
    return result.rows[0].c;
  };

  return {
    branches: await getCount('branches'),
    employees: await getCount('employees'),
    orders: await getCount('orders'),
    customers: await getCount('customers'),
    shifts: await getCount('shifts'),
    combos: await getCount('combo_subscriptions'),
    wholesale: await getCount('wholesale_accounts'),
    movements: await getCount('inventory_movements'),
    stockWithItems: await getCount('branch_inventory', '"currentStock" > 0'),
  };
}

async function cleanPostgres(pool) {
  await pool.query('BEGIN');
  try {
    for (const table of TABLES_TO_CLEAR) {
      await pool.query(`DELETE FROM ${table}`);
    }
    // Reset tồn kho chi nhánh
    await pool.query('DELETE FROM branch_inventory');
    // Reset tồn kho inventory items về 0
    await pool.query('UPDATE inventory SET "currentStock" = 0');
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function main() {
  if (process.env.CONFIRM_CLEAN !== 'yes') {
    console.error('Abort: set CONFIRM_CLEAN=yes to run cleanup.');
    process.exit(1);
  }

  const useSqlite =
    (process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1') &&
    !process.env.DATABASE_URL?.includes('supabase');

  console.log('=== DỌN SẠch DỮ LIỆU CHO KHÁCH HÀNG ===\n');

  if (useSqlite) {
    const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/database.sqlite');
    const db = await openSqlite(sqlitePath);
    try {
      console.log('SQLite:', sqlitePath);
      const before = await summarizeSqlite(db);
      console.log('Before:', before);
      await cleanSqlite(db);
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
      await cleanPostgres(pool);
      const after = await summarizePostgres(pool);
      console.log('After :', after);
    } finally {
      await pool.end();
    }
  }

  console.log('\n✅ Dọn sạch xong.');
  console.log('   • Tất cả chi nhánh đã xóa');
  console.log('   • Tất cả nhân viên đã xóa');
  console.log('   • Đơn hàng, khách hàng, shift đã xóa');
  console.log('   • Tồn kho = 0');
  console.log('   • Menu/Sản phẩm và cài đặt giá giữ nguyên');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
