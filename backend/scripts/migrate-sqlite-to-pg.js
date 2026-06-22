/**
 * Copy data from SQLite (data/database.sqlite) into PostgreSQL.
 * Usage: DATABASE_URL=... node backend/scripts/migrate-sqlite-to-pg.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const { initSchemaAndSeeds } = require('../initDb');

const TABLES = [
  'settings',
  'products',
  'employees',
  'customers',
  'inventory',
  'inventory_movements',
  'orders',
  'wholesale_accounts',
  'partners_pt',
  'referral_transactions',
  'shifts',
  'loyalty_vouchers',
  'combo_subscriptions',
  'customer_care_assignments',
  'sales_leads',
  'sales_activities',
];

const PG_COLUMN_MAP = {
  inventory: ['id', 'name', 'unit', 'currentStock', 'minStock', 'cost', 'category'],
  inventory_movements: ['id', 'timestamp', 'type', 'orderId', 'itemId', 'itemName', 'quantity', 'reason', 'performedBy', 'cost'],
  orders: ['id', 'branchId', 'source', 'items', 'time', 'status', 'total', 'staff', 'paidAt', 'readyAt', 'completedAt', 'orderNumber', 'customerName', 'customerPhone', 'deliveryAddress', 'shipperName', 'shipperId', 'paymentMethod', 'stockDeducted', 'salesStaffId', 'salesStaffName'],
  wholesale_accounts: ['id', 'customerName', 'customerPhone', 'packageName', 'totalCups', 'remainingCups', 'durationMonths', 'purchasedAt', 'expiresAt', 'preferredProduct', 'preferredProductSize', 'preferredProductProtein', 'branchId', 'branchName', 'redemptions'],
  partners_pt: ['id', 'name', 'phone', 'code', 'dateCreated', 'paidCommission'],
  referral_transactions: ['id', 'ptId', 'ptCode', 'orderId', 'customerName', 'comboName', 'price', 'timestamp'],
  products: ['id', 'name', 'category', 'basePrice', 'image', 'description'],
  employees: ['id', 'fullName', 'employeeId', 'email', 'phone', 'idNumber', 'dateOfBirth', 'address', 'branch', 'position', 'baseSalary', 'startDate', 'username', 'password', 'photo', 'customData'],
  shifts: ['id', 'employeeId', 'employeeName', 'date', 'shiftType', 'startTime', 'endTime', 'status', 'checkIn', 'checkOut', 'branch', 'requestedBy', 'checkInPhoto', 'checkOutPhoto'],
  customers: ['id', 'name', 'phone', 'points', 'createdAt'],
  loyalty_vouchers: ['id', 'code', 'programId', 'customerId', 'customerName', 'customerPhone', 'status', 'pointsDeducted', 'issuedAt', 'usedAt', 'expiresAt'],
  combo_subscriptions: ['id', 'orderId', 'customerName', 'customerPhone', 'planName', 'comboType', 'comboDuration', 'startDate', 'nextDelivery', 'deliveryDays', 'items', 'totalPrice', 'status', 'branchId', 'deliveryAddress', 'careStaffId', 'careStaffName', 'closedByStaffId', 'closedByStaffName', 'closedAt', 'assignedAt', 'pauseStartDate', 'pauseEndDate', 'notes', 'staff', 'createdAt', 'updatedAt'],
  customer_care_assignments: ['id', 'customerPhone', 'customerName', 'careStaffId', 'careStaffName', 'assignedAt', 'assignedBy', 'notes', 'customerType', 'fbName', 'pipelineStage', 'lastContactAt', 'tags', 'salesRefCode'],
  sales_leads: ['id', 'fbName', 'customerName', 'customerPhone', 'careStaffId', 'careStaffName', 'pipelineStage', 'source', 'notes', 'createdAt', 'updatedAt', 'lastContactAt'],
  sales_activities: ['id', 'customerPhone', 'leadId', 'careStaffId', 'careStaffName', 'activityType', 'content', 'createdAt'],
  settings: ['key', 'value'],
};

function quoteCol(col) {
  return /[A-Z]/.test(col) ? `"${col}"` : col;
}

function openSqlite(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(db)));
  });
}

function sqliteAll(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function migrateTable(pool, table, rows) {
  if (!rows.length) {
    console.log(`  ${table}: 0 rows (skip)`);
    return;
  }
  const cols = PG_COLUMN_MAP[table];
  if (!cols) {
    console.warn(`  ${table}: no column map, skip`);
    return;
  }
  const colList = cols.map(quoteCol).join(', ');
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const conflictCol = table === 'settings' ? 'key' : 'id';
  const updateCols = cols.filter((c) => c !== conflictCol);
  const sql =
    updateCols.length === 0
      ? `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (${quoteCol(conflictCol)}) DO NOTHING`
      : `INSERT INTO ${table} (${colList}) VALUES (${placeholders})
    ON CONFLICT (${quoteCol(conflictCol)}) DO UPDATE SET ${updateCols
        .map((c) => `${quoteCol(c)} = EXCLUDED.${quoteCol(c)}`)
        .join(', ')}`;

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map((c) => row[c] ?? row[c.toLowerCase()] ?? null);
    await pool.query(sql, values);
    inserted++;
  }
  console.log(`  ${table}: ${inserted} rows`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sqlitePath =
    process.env.SQLITE_PATH || path.join(__dirname, '../../data/database.sqlite');
  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite file not found: ${sqlitePath}`);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: /\.supabase\.co\b/i.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });
  const sqlite = await openSqlite(sqlitePath);

  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected.');
    await initSchemaAndSeeds(pool);
    console.log('Schema ready. Migrating data...');

    for (const table of TABLES) {
      const rows = await sqliteAll(sqlite, `SELECT * FROM ${table}`);
      await migrateTable(pool, table, rows);
    }

    console.log('Migration complete.');
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
