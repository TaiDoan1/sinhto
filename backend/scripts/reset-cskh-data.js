#!/usr/bin/env node
/**
 * Reset toàn bộ dữ liệu module CSKH / Bán hàng online:
 * - customer_care_assignments (khách được phân bổ)
 * - sales_leads (lead Facebook)
 * - sales_activities (lịch sử hoạt động CSKH)
 * - cskh_checkins (check-in/out CSKH)
 * - delivery_alerts (cảnh báo giao hàng)
 * - combo_subscriptions + delivery_logs + combo_transfers (toàn bộ combo)
 *
 * Giữ nguyên:
 * - nhân viên, menu, settings, chi nhánh
 * - orders (đơn POS bán lẻ), inventory, loyalty, wholesale, referral_transactions
 *
 * Usage:
 *   CONFIRM_RESET=yes node backend/scripts/reset-cskh-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const TABLES = [
  'combo_transfers',
  'delivery_logs',
  'delivery_alerts',
  'cskh_checkins',
  'sales_activities',
  'sales_leads',
  'customer_care_assignments',
  'combo_subscriptions',
];

function ensureArgs() {
  if (process.env.CONFIRM_RESET !== 'yes') {
    console.error('Abort: set CONFIRM_RESET=yes to run CSKH reset.');
    process.exit(1);
  }
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

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

async function summarizeSqlite(db) {
  const counts = {};
  for (const table of TABLES) {
    try {
      counts[table] = (await get(db, `SELECT COUNT(*) AS c FROM ${table}`)).c || 0;
    } catch (err) {
      if (/no such table/i.test(err.message)) counts[table] = 'n/a (bảng chưa tồn tại ở dev sqlite)';
      else throw err;
    }
  }
  return counts;
}

async function resetSqlite(db) {
  await run(db, 'BEGIN TRANSACTION');
  try {
    for (const table of TABLES) {
      try {
        await run(db, `DELETE FROM ${table}`);
      } catch (err) {
        if (!/no such table/i.test(err.message)) throw err;
      }
    }
    await run(db, 'COMMIT');
  } catch (err) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw err;
  }
}

async function summarizePg(pool) {
  const counts = {};
  for (const table of TABLES) {
    counts[table] = (await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`)).rows[0].c;
  }
  return counts;
}

async function resetPg(pool) {
  await pool.query('BEGIN');
  try {
    for (const table of TABLES) {
      await pool.query(`DELETE FROM ${table}`);
    }
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  ensureArgs();

  const useSqlite =
    (process.env.USE_SQLITE === 'true' || process.env.USE_SQLITE === '1') &&
    !process.env.DATABASE_URL?.includes('supabase');

  console.log('=== RESET MODULE CSKH / BÁN HÀNG ONLINE ===\n');

  if (useSqlite) {
    const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, '../../data/database.sqlite');
    const db = await openSqlite(sqlitePath);
    try {
      const before = await summarizeSqlite(db);
      console.log('Before:', before);
      await resetSqlite(db);
      const after = await summarizeSqlite(db);
      console.log('After :', after);
    } finally {
      db.close();
    }
  } else {
    if (!process.env.DATABASE_URL) {
      console.error('Abort: DATABASE_URL not set (this script targets whichever database it is run against).');
      process.exit(1);
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /\.supabase\.co\b|railway\.app|rlwy\.net/i.test(process.env.DATABASE_URL)
        ? { rejectUnauthorized: false }
        : undefined,
    });
    try {
      await pool.query('SELECT 1');
      const before = await summarizePg(pool);
      console.log('Before:', before);
      await resetPg(pool);
      const after = await summarizePg(pool);
      console.log('After :', after);
    } finally {
      await pool.end();
    }
  }

  console.log('\n✅ Reset module CSKH xong.');
  console.log('   • Đã xóa: khách phân bổ, lead FB, hoạt động CSKH, check-in CSKH, cảnh báo giao hàng, toàn bộ combo');
  console.log('   • Không đụng: nhân viên, đơn POS, menu, kho, settings, chi nhánh');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
