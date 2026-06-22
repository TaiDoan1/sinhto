const { Pool } = require('pg');
const { initSchemaAndSeeds } = require('./initDb');
const { run: runNoDiacriticsMigration } = require('./migrateNoDiacritics');
const { init: initSqlite } = require('./sqliteDb');

let pool;
let dbMode = 'postgres';

function quoteCamelIdentifiers(sql) {
  return sql.replace(/\b([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)\b/g, '"$1"');
}

function toPg(sql, params = []) {
  let i = 0;
  const text = quoteCamelIdentifiers(sql)
    .replace(/INSERT OR REPLACE INTO\s+settings\s*\(key,\s*value\)/gi,
      'INSERT INTO settings (key, value)')
    .replace(/INSERT OR REPLACE INTO/gi, 'INSERT INTO')
    .replace(/\bBEGIN TRANSACTION\b/gi, 'BEGIN')
    .replace(/\bMAX\s*\(\s*0\s*,\s*points\s*-\s*\?/gi, 'GREATEST(0, points - ?')
    .replace(/\?/g, () => `$${++i}`);
  const upsertSettings =
    /INSERT INTO settings \(key, value\) VALUES/i.test(sql) &&
    /INSERT OR REPLACE/i.test(sql);
  const finalText = upsertSettings
    ? `${text} ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
    : text;
  return { text: finalText, params };
}

function createAdapter(pgPool) {
  return {
    serialize(fn) {
      fn();
    },

    run(sql, params, cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const { text, params: pgParams } = toPg(sql, params || []);
      pgPool
        .query(text, pgParams)
        .then((result) => {
          if (cb) cb.call({ changes: result.rowCount }, null);
        })
        .catch((err) => {
          if (cb) cb(err);
        });
    },

    get(sql, params, cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const { text, params: pgParams } = toPg(sql, params || []);
      pgPool
        .query(text, pgParams)
        .then((result) => cb(null, result.rows[0]))
        .catch((err) => cb(err));
    },

    all(sql, params, cb) {
      if (typeof params === 'function') {
        cb = params;
        params = [];
      }
      const { text, params: pgParams } = toPg(sql, params || []);
      pgPool
        .query(text, pgParams)
        .then((result) => cb(null, result.rows))
        .catch((err) => cb(err));
    },

    prepare(sql) {
      const queued = [];
      return {
        run(...args) {
          queued.push(args);
        },
        finalize(cb) {
          if (queued.length === 0) {
            if (cb) cb(null);
            return;
          }
          (async () => {
            try {
              for (const params of queued) {
                const { text, params: pgParams } = toPg(sql, params);
                await pgPool.query(text, pgParams);
              }
              if (cb) cb(null);
            } catch (err) {
              if (cb) cb(err);
            }
          })();
        },
      };
    },
  };
}

async function initDatabase() {
  const useSqlite =
    process.env.USE_SQLITE === 'true' ||
    process.env.USE_SQLITE === '1' ||
    !process.env.DATABASE_URL;

  if (useSqlite) {
    dbMode = 'sqlite';
    const db = await initSqlite();
    await new Promise((resolve, reject) => {
      runNoDiacriticsMigration(db, (err) => (err ? reject(err) : resolve()));
    });
    return db;
  }

  const connectionString = process.env.DATABASE_URL;
  dbMode = 'postgres';
  const needsSsl =
    process.env.PGSSLMODE === 'require' ||
    /\.supabase\.co\b/i.test(connectionString);

  pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  });

  await pool.query('SELECT 1');
  console.log('PostgreSQL connected.');

  const db = createAdapter(pool);
  await initSchemaAndSeeds(pool);
  await new Promise((resolve, reject) => {
    runNoDiacriticsMigration(db, (err) => (err ? reject(err) : resolve()));
  });
  return db;
}

function getPool() {
  if (dbMode !== 'postgres') {
    throw new Error('getPool() only available in PostgreSQL mode');
  }
  if (!pool) throw new Error('Database not initialized');
  return pool;
}

function isPostgres() {
  return dbMode === 'postgres';
}

module.exports = { initDatabase, getPool, createAdapter, isPostgres };
