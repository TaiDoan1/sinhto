const { removeDiacritics, convertMaybeJson } = require('./vietnamese');

const MIGRATION_KEY = 'db_migrated_no_diacritics_v1';

function runSeries(db, fns, cb) {
  let i = 0;
  const next = (err) => {
    if (err) return cb(err);
    if (i >= fns.length) return cb();
    fns[i++](next);
  };
  next();
}

function updateRows(db, table, textCols, jsonCols, cb) {
  db.all(`SELECT * FROM ${table}`, (err, rows) => {
    if (err) return cb(err);
    if (!rows || rows.length === 0) return cb();

    let idx = 0;
    const allCols = [...textCols, ...jsonCols];
    const updateNext = (e) => {
      if (e) return cb(e);
      if (idx >= rows.length) return cb();
      const row = rows[idx++];
      const values = allCols.map(col => {
        if (jsonCols.includes(col)) return convertMaybeJson(row[col]);
        return removeDiacritics(row[col]);
      });
      db.run(
        `UPDATE ${table} SET ${allCols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...values, row.id],
        updateNext
      );
    };
    updateNext();
  });
}

function migrateOrders(db, cb) {
  db.all('SELECT id, items, staff, customerName, deliveryAddress, shipperName FROM orders', (err, rows) => {
    if (err) return cb(err);
    if (!rows || rows.length === 0) return cb();

    let idx = 0;
    const next = (e) => {
      if (e) return cb(e);
      if (idx >= rows.length) return cb();
      const row = rows[idx++];
      db.run(
        'UPDATE orders SET items = ?, staff = ?, customerName = ?, deliveryAddress = ?, shipperName = ? WHERE id = ?',
        [
          convertMaybeJson(row.items),
          removeDiacritics(row.staff),
          removeDiacritics(row.customerName),
          removeDiacritics(row.deliveryAddress),
          removeDiacritics(row.shipperName),
          row.id,
        ],
        next
      );
    };
    next();
  });
}

function migrateSettings(db, cb) {
  db.all('SELECT key, value FROM settings WHERE key != ?', [MIGRATION_KEY], (err, rows) => {
    if (err) return cb(err);
    if (!rows || rows.length === 0) return cb();

    let idx = 0;
    const next = (e) => {
      if (e) return cb(e);
      if (idx >= rows.length) return cb();
      const row = rows[idx++];
      db.run(
        'UPDATE settings SET value = ? WHERE key = ?',
        [convertMaybeJson(row.value), row.key],
        next
      );
    };
    next();
  });
}

function run(db, cb) {
  db.get('SELECT value FROM settings WHERE key = ?', [MIGRATION_KEY], (err, row) => {
    if (err) return cb(err);
    if (row) return cb(null, false);

    console.log('Migrating database to Vietnamese without diacritics...');

    const tasks = [
      (next) => updateRows(db, 'products', ['name', 'description'], [], next),
      (next) => updateRows(db, 'inventory', ['name', 'unit'], [], next),
      (next) => updateRows(db, 'customers', ['name'], [], next),
      (next) => updateRows(db, 'employees', ['fullName', 'address'], ['customData'], next),
      (next) => updateRows(db, 'shifts', ['employeeName'], [], next),
      (next) => updateRows(db, 'loyalty_vouchers', ['customerName'], [], next),
      (next) => updateRows(db, 'partners_pt', ['name'], [], next),
      (next) => updateRows(db, 'referral_transactions', ['customerName', 'comboName'], [], next),
      (next) => updateRows(db, 'inventory_movements', ['itemName', 'reason', 'performedBy'], [], next),
      (next) => updateRows(db, 'wholesale_accounts', ['customerName', 'packageName', 'preferredProduct', 'branchName'], ['redemptions'], next),
      (next) => migrateOrders(db, next),
      (next) => migrateSettings(db, next),
    ];

    runSeries(db, tasks, (e) => {
      if (e) return cb(e);
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [MIGRATION_KEY, '1'], (e2) => {
        if (e2) return cb(e2);
        console.log('Database migration to no-diacritics Vietnamese completed.');
        cb(null, true);
      });
    });
  });
}

module.exports = { run, MIGRATION_KEY };
