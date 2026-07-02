#!/usr/bin/env node
/**
 * Reset dữ liệu vận hành của 1 chi nhánh:
 * - đơn hàng
 * - shifts
 * - combo / giao combo
 * - wholesale theo chi nhánh
 * - biến động kho
 * - tồn kho chi nhánh về 0
 *
 * Giữ nguyên:
 * - menu / settings
 * - nhân viên
 * - dữ liệu chi nhánh khác
 *
 * Usage:
 *   CONFIRM_RESET=yes node backend/scripts/reset-branch-data.js CN1
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const branchId = (process.argv[2] || '').trim();

function ensureArgs() {
  if (process.env.CONFIRM_RESET !== 'yes') {
    console.error('Abort: set CONFIRM_RESET=yes to run branch reset.');
    process.exit(1);
  }
  if (!branchId) {
    console.error('Abort: branch id required. Example: CN1');
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
  const comboIds = await new Promise((resolve, reject) => {
    db.all('SELECT id FROM combo_subscriptions WHERE branchId = ?', [branchId], (err, rows) =>
      err ? reject(err) : resolve((rows || []).map((r) => r.id))
    );
  });
  const placeholders = comboIds.map(() => '?').join(',');
  const deliveryWhere = comboIds.length
    ? `(branch_id = ? OR combo_order_id IN (${placeholders}))`
    : 'branch_id = ?';
  const deliveryParams = comboIds.length ? [branchId, ...comboIds] : [branchId];
  const transferWhere = comboIds.length ? `combo_order_id IN (${placeholders})` : `1 = 0`;
  const transferParams = comboIds.length ? comboIds : [];

  return {
    orders: (await get(db, 'SELECT COUNT(*) AS c FROM orders WHERE branchId = ?', [branchId])).c || 0,
    shifts: (await get(db, 'SELECT COUNT(*) AS c FROM shifts WHERE branch = ?', [branchId])).c || 0,
    combos: (await get(db, 'SELECT COUNT(*) AS c FROM combo_subscriptions WHERE branchId = ?', [branchId])).c || 0,
    wholesale:
      (await get(db, 'SELECT COUNT(*) AS c FROM wholesale_accounts WHERE branchId = ?', [branchId])).c || 0,
    movements:
      (await get(db, 'SELECT COUNT(*) AS c FROM inventory_movements WHERE branchId = ?', [branchId])).c || 0,
    deliveryLogs: (await get(db, `SELECT COUNT(*) AS c FROM delivery_logs WHERE ${deliveryWhere}`, deliveryParams)).c || 0,
    comboTransfers:
      (await get(db, `SELECT COUNT(*) AS c FROM combo_transfers WHERE ${transferWhere}`, transferParams)).c || 0,
    stockPositive:
      (await get(
        db,
        'SELECT COUNT(*) AS c FROM branch_inventory WHERE branchId = ? AND currentStock > 0',
        [branchId]
      )).c || 0,
  };
}

async function resetSqlite(db) {
  const comboIds = await new Promise((resolve, reject) => {
    db.all('SELECT id FROM combo_subscriptions WHERE branchId = ?', [branchId], (err, rows) =>
      err ? reject(err) : resolve((rows || []).map((r) => r.id))
    );
  });
  const placeholders = comboIds.map(() => '?').join(',');

  await run(db, 'BEGIN TRANSACTION');
  try {
    if (comboIds.length) {
      await run(db, `DELETE FROM combo_transfers WHERE combo_order_id IN (${placeholders})`, comboIds);
      await run(
        db,
        `DELETE FROM delivery_logs WHERE branch_id = ? OR combo_order_id IN (${placeholders})`,
        [branchId, ...comboIds]
      );
    } else {
      await run(db, 'DELETE FROM delivery_logs WHERE branch_id = ?', [branchId]);
    }
    await run(db, 'DELETE FROM orders WHERE branchId = ?', [branchId]);
    await run(db, 'DELETE FROM shifts WHERE branch = ?', [branchId]);
    await run(db, 'DELETE FROM wholesale_accounts WHERE branchId = ?', [branchId]);
    await run(db, 'DELETE FROM combo_subscriptions WHERE branchId = ?', [branchId]);
    await run(db, 'DELETE FROM inventory_movements WHERE branchId = ?', [branchId]);
    await run(db, 'UPDATE branch_inventory SET currentStock = 0 WHERE branchId = ?', [branchId]);
    await run(db, 'COMMIT');
  } catch (err) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw err;
  }
}

async function summarizePg(pool) {
  const comboIds = (
    await pool.query('SELECT id FROM combo_subscriptions WHERE "branchId" = $1', [branchId])
  ).rows.map((r) => r.id);

  const deliveryLogs = comboIds.length
    ? await pool.query(
        'SELECT COUNT(*)::int AS c FROM delivery_logs WHERE branch_id = $1 OR combo_order_id = ANY($2::text[])',
        [branchId, comboIds]
      )
    : await pool.query('SELECT COUNT(*)::int AS c FROM delivery_logs WHERE branch_id = $1', [branchId]);

  const comboTransfers = comboIds.length
    ? await pool.query('SELECT COUNT(*)::int AS c FROM combo_transfers WHERE combo_order_id = ANY($1::text[])', [
        comboIds,
      ])
    : { rows: [{ c: 0 }] };

  return {
    orders: (await pool.query('SELECT COUNT(*)::int AS c FROM orders WHERE "branchId" = $1', [branchId])).rows[0].c,
    shifts: (await pool.query('SELECT COUNT(*)::int AS c FROM shifts WHERE branch = $1', [branchId])).rows[0].c,
    combos: (
      await pool.query('SELECT COUNT(*)::int AS c FROM combo_subscriptions WHERE "branchId" = $1', [branchId])
    ).rows[0].c,
    wholesale: (
      await pool.query('SELECT COUNT(*)::int AS c FROM wholesale_accounts WHERE "branchId" = $1', [branchId])
    ).rows[0].c,
    movements: (
      await pool.query('SELECT COUNT(*)::int AS c FROM inventory_movements WHERE "branchId" = $1', [branchId])
    ).rows[0].c,
    deliveryLogs: deliveryLogs.rows[0].c,
    comboTransfers: comboTransfers.rows[0].c,
    stockPositive: (
      await pool.query(
        'SELECT COUNT(*)::int AS c FROM branch_inventory WHERE "branchId" = $1 AND "currentStock" > 0',
        [branchId]
      )
    ).rows[0].c,
  };
}

async function resetPg(pool) {
  const comboIds = (
    await pool.query('SELECT id FROM combo_subscriptions WHERE "branchId" = $1', [branchId])
  ).rows.map((r) => r.id);

  await pool.query('BEGIN');
  try {
    if (comboIds.length) {
      await pool.query('DELETE FROM combo_transfers WHERE combo_order_id = ANY($1::text[])', [comboIds]);
      await pool.query(
        'DELETE FROM delivery_logs WHERE branch_id = $1 OR combo_order_id = ANY($2::text[])',
        [branchId, comboIds]
      );
    } else {
      await pool.query('DELETE FROM delivery_logs WHERE branch_id = $1', [branchId]);
    }
    await pool.query('DELETE FROM orders WHERE "branchId" = $1', [branchId]);
    await pool.query('DELETE FROM shifts WHERE branch = $1', [branchId]);
    await pool.query('DELETE FROM wholesale_accounts WHERE "branchId" = $1', [branchId]);
    await pool.query('DELETE FROM combo_subscriptions WHERE "branchId" = $1', [branchId]);
    await pool.query('DELETE FROM inventory_movements WHERE "branchId" = $1', [branchId]);
    await pool.query('UPDATE branch_inventory SET "currentStock" = 0 WHERE "branchId" = $1', [branchId]);
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

  console.log(`=== RESET CHI NHÁNH ${branchId} ===\n`);

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
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: /\.supabase\.co\b/i.test(process.env.DATABASE_URL)
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

  console.log('\n✅ Reset chi nhánh xong.');
  console.log('   • Đơn / combo / shifts / tồn kho CN mục tiêu đã làm mới');
  console.log('   • Không đụng tới nhân viên, menu, settings, chi nhánh khác');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
