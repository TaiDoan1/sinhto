#!/usr/bin/env node
/** Chay thu cong: node backend/scripts/migrate-vi.js */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { run } = require('../migrateNoDiacritics');

const dbPath = path.join(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

const force = process.argv.includes('--force');
const done = (err) => {
  if (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  db.close();
};

if (force) {
  db.run("DELETE FROM settings WHERE key = 'db_migrated_no_diacritics_v1'", () => {
    run(db, (err, did) => {
      console.log(did ? 'Migration completed.' : 'Skipped (already migrated).');
      done(err);
    });
  });
} else {
  run(db, (err, did) => {
    console.log(did ? 'Migration completed.' : 'Already migrated — use --force to re-run.');
    done(err);
  });
}
