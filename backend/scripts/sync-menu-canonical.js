#!/usr/bin/env node
/**
 * Đồng bộ toàn bộ menu canonical lên API:
 * giá ly lẻ, topping, combo topping, 24 vị smoothie, nguyên liệu mới.
 * Usage: node backend/scripts/sync-menu-canonical.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = (process.argv[2] || process.env.E2E_API_BASE || 'http://localhost:5005').replace(/\/$/, '');
const API = `${BASE}/api`;
const { DEFAULT_MENU_PRICE_TABLE } = require('../menuPricing');
const { DEFAULT_COMBO_TOPPINGS, getToppingProductRows } = require('../menuToppings');
const { getSmoothieProductRows } = require('../menuFlavors');
const { getInventoryCatalog } = require('../storeSeeds');
const { DEFAULT_BRANCHES } = require('../branches');

async function syncBranchesDirectPg() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: url,
    ssl: /\.supabase\.co\b/i.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        active BOOLEAN DEFAULT TRUE,
        "sortOrder" INTEGER DEFAULT 0,
        "createdAt" TEXT
      )
    `);
    for (const b of DEFAULT_BRANCHES) {
      await pool.query(
        `INSERT INTO branches (id, name, address, phone, active, "sortOrder", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone`,
        [b.id, b.name, b.address, b.phone, b.active, b.sortOrder, new Date().toISOString()]
      );
    }
    console.log(`✅ branches table (${DEFAULT_BRANCHES.length} cửa hàng)`);
  } finally {
    await pool.end();
  }
}

async function syncSettingsDirectPg(key, value) {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, reason: 'no DATABASE_URL' };
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: url,
    ssl: /\.supabase\.co\b/i.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, stringValue]
    );
    return { ok: true };
  } finally {
    await pool.end();
  }
}

async function upsertSetting(key, value) {
  const res = await post('/settings', { key, value });
  if (res.ok) return res;
  const direct = await syncSettingsDirectPg(key, value);
  if (direct.ok) return { ok: true, via: 'pg' };
  return res;
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function put(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log(`\n=== SYNC MENU CANONICAL → ${BASE} ===\n`);

  await syncBranchesDirectPg().catch((e) => console.log(`❌ branches: ${e.message}`));

  const priceRes = await upsertSetting('menuPriceTable', DEFAULT_MENU_PRICE_TABLE);
  console.log(
    priceRes.ok
      ? `✅ menuPriceTable${priceRes.via ? ' (direct DB)' : ''}`
      : `❌ menuPriceTable: ${JSON.stringify(priceRes.data)}`
  );

  const comboRes = await upsertSetting('menuComboToppings', DEFAULT_COMBO_TOPPINGS);
  console.log(
    comboRes.ok
      ? `✅ menuComboToppings${comboRes.via ? ' (direct DB)' : ''}`
      : `❌ menuComboToppings: ${JSON.stringify(comboRes.data)}`
  );

  const productsRes = await fetch(`${API}/products`).then((r) => r.json());
  const productIds = new Set(productsRes.map((p) => p.id));

  async function upsertProduct(row) {
    const [id, name, category, basePrice, image, description] = row;
    const product = { id, name, category, basePrice, image, description };
    if (productIds.has(id)) {
      const res = await put(`/products/${id}`, product);
      console.log(res.ok ? `✅ ${id} ${name}` : `❌ ${id}: ${JSON.stringify(res.data)}`);
      return;
    }
    const create = await post('/products', product);
    if (create.ok) {
      productIds.add(id);
      console.log(`✅ (new) ${id} ${name}`);
    } else {
      console.log(`❌ ${id}: ${JSON.stringify(create.data)}`);
    }
  }

  console.log('— Topping —');
  for (const row of getToppingProductRows()) {
    await upsertProduct(row);
  }

  console.log('— Smoothie (24 vị) —');
  for (const row of getSmoothieProductRows()) {
    await upsertProduct(row);
  }

  const productsAfter = await fetch(`${API}/products`).then((r) => r.json());
  for (const p of productsAfter.filter((x) => x.category === 'smoothies')) {
    const res = await put(`/products/${p.id}`, { ...p, basePrice: 0 });
    if (!res.ok) console.log(`❌ ${p.id} basePrice: ${JSON.stringify(res.data)}`);
  }
  console.log(`✅ ${productsAfter.filter((x) => x.category === 'smoothies').length} smoothie → basePrice 0`);

  const invRes = await fetch(`${API}/inventory`).then((r) => r.json());
  const invIds = new Set((Array.isArray(invRes) ? invRes : []).map((x) => x.id));
  const newInv = getInventoryCatalog().filter(([id]) => !invIds.has(id));
  if (newInv.length > 0) {
    console.log(`— Nguyên liệu mới (${newInv.length}) —`);
    for (const [id, name, unit, , minStock, cost, category] of newInv) {
      const res = await post('/inventory', { id, name, unit, minStock, cost, category });
      console.log(res.ok ? `✅ ${id} ${name}` : `❌ ${id}: ${JSON.stringify(res.data)}`);
    }
  } else {
    console.log('✅ inventory catalog đủ');
  }

  const verify = await fetch(`${API}/products`).then((r) => r.json());
  const smCount = verify.filter((x) => x.category === 'smoothies').length;
  console.log(`\n📊 Production: ${smCount} smoothie, ${verify.filter((x) => x.category === 'toppings').length} topping`);
  console.log('\nDone.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
