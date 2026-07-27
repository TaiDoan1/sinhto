#!/usr/bin/env node
/**
 * Script tạo tài khoản tester có full quyền để test local.
 * Chạy: node backend/scripts/create-tester.js
 *
 * Tài khoản tạo ra:
 *   username : minhanh
 *   password : 123
 *   position : manager  (full access admin dashboard)
 *   branch   : CN1
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const { hashPassword } = require('../password');

const TESTER = {
  id: 'TESTER-001',
  fullName: 'Minh Anh (Tester)',
  employeeId: 'TEST-001',
  email: 'minhanh.test@fitblend.vn',
  phone: '0999000001',
  idNumber: '',
  dateOfBirth: '1995-01-01',
  address: 'Test Address',
  branch: 'CN1',
  position: 'manager',
  baseSalary: 0,
  startDate: new Date().toISOString().slice(0, 10),
  username: 'minhanh',
  password: '123',
  photo: 'https://ui-avatars.com/api/?name=Minh+Anh&background=10b981&color=fff&size=200',
};

async function main() {
  const useSqlite =
    process.env.USE_SQLITE === 'true' ||
    process.env.USE_SQLITE === '1' ||
    !process.env.DATABASE_URL;

  const hashedPassword = hashPassword(TESTER.password);

  if (useSqlite) {
    await runSqlite(hashedPassword);
  } else {
    await runPostgres(hashedPassword);
  }
}

// ── SQLite ────────────────────────────────────────────────────────────────────
async function runSqlite(hashedPassword) {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '../../data/database.sqlite');
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(
      `INSERT OR REPLACE INTO employees
         (id, fullName, employeeId, email, phone, idNumber, dateOfBirth,
          address, branch, position, baseSalary, startDate,
          username, password, photo, customData)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'{}')`,
      [
        TESTER.id,
        TESTER.fullName,
        TESTER.employeeId,
        TESTER.email,
        TESTER.phone,
        TESTER.idNumber,
        TESTER.dateOfBirth,
        TESTER.address,
        TESTER.branch,
        TESTER.position,
        TESTER.baseSalary,
        TESTER.startDate,
        TESTER.username,
        hashedPassword,
        TESTER.photo,
      ],
      function (err) {
        if (err) {
          console.error('❌ Lỗi khi tạo tài khoản:', err.message);
        } else {
          printSuccess();
        }
        db.close();
      }
    );
  });
}

// ── PostgreSQL ────────────────────────────────────────────────────────────────
async function runPostgres(hashedPassword) {
  const { Pool } = require('pg');
  const dns = require('dns').promises;
  dns.setDefaultResultOrder('ipv4first');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /supabase\.co/i.test(process.env.DATABASE_URL || '')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await pool.query(
      `INSERT INTO employees
         (id, "fullName", "employeeId", email, phone, "idNumber", "dateOfBirth",
          address, branch, position, "baseSalary", "startDate",
          username, password, photo, "customData")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}')
       ON CONFLICT (id) DO UPDATE SET
         "fullName"    = EXCLUDED."fullName",
         username      = EXCLUDED.username,
         password      = EXCLUDED.password,
         position      = EXCLUDED.position,
         branch        = EXCLUDED.branch`,
      [
        TESTER.id,
        TESTER.fullName,
        TESTER.employeeId,
        TESTER.email,
        TESTER.phone,
        TESTER.idNumber,
        TESTER.dateOfBirth,
        TESTER.address,
        TESTER.branch,
        TESTER.position,
        TESTER.baseSalary,
        TESTER.startDate,
        TESTER.username,
        hashedPassword,
        TESTER.photo,
      ]
    );
    printSuccess();
  } catch (err) {
    console.error('❌ Lỗi khi tạo tài khoản:', err.message);
  } finally {
    await pool.end();
  }
}

function printSuccess() {
  console.log('');
  console.log('✅ Tạo tài khoản tester thành công!');
  console.log('──────────────────────────────────────');
  console.log(`  Họ tên   : ${TESTER.fullName}`);
  console.log(`  Username : ${TESTER.username}`);
  console.log(`  Password : ${TESTER.password}`);
  console.log(`  Chức vụ  : ${TESTER.position} (full access)`);
  console.log(`  Chi nhánh: ${TESTER.branch}`);
  console.log('──────────────────────────────────────');
  console.log('  🔗 Admin : http://localhost:5173/admin');
  console.log('  🔗 POS   : http://localhost:5173/pos');
  console.log('');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
