/**
 * Tồn kho theo chi nhánh — branch_inventory + movements.branchId
 */

const FALLBACK_BRANCHES = ['CN1', 'CN2', 'CN3'];

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

async function ensureBranchInventorySchema(db) {
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS branch_inventory (
      branchId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      currentStock REAL DEFAULT 0,
      minStock REAL,
      PRIMARY KEY (branchId, itemId)
    )`
  ).catch(() => {});

  await dbRun(db, "ALTER TABLE inventory_movements ADD COLUMN branchId TEXT DEFAULT 'CN1'").catch(() => {});
}

async function getBranchIds(db) {
  try {
    const rows = await dbAll(
      db,
      `SELECT id FROM branches WHERE active = 1 OR active IS TRUE OR active = '1' ORDER BY sortOrder, id`
    );
    if (rows.length > 0) return rows.map((r) => r.id);
  } catch {
    /* bảng branches chưa có */
  }
  return FALLBACK_BRANCHES;
}

async function seedBranchRowsForItem(db, itemId, minStock, branchIds) {
  const ids = branchIds || (await getBranchIds(db));
  for (const branchId of ids) {
    await dbRun(
      db,
      `INSERT INTO branch_inventory (branchId, itemId, currentStock, minStock) VALUES (?, ?, 0, ?)
       ON CONFLICT (branchId, itemId) DO NOTHING`,
      [branchId, itemId, minStock ?? 0]
    ).catch(() => {});
  }
}

async function seedBranchInventoryForBranch(db, branchId) {
  const items = await dbAll(db, 'SELECT id, minStock FROM inventory');
  for (const item of items) {
    await dbRun(
      db,
      `INSERT INTO branch_inventory (branchId, itemId, currentStock, minStock) VALUES (?, ?, 0, ?)
       ON CONFLICT (branchId, itemId) DO NOTHING`,
      [branchId, item.id, item.minStock ?? 0]
    ).catch(() => {});
  }
}

async function migrateGlobalStockToBranches(db) {
  const catalog = await dbAll(db, 'SELECT id, currentStock, minStock FROM inventory');
  const branchIds = await getBranchIds(db);
  for (const row of catalog) {
    for (const branchId of branchIds) {
      const exists = await dbGet(
        db,
        'SELECT branchId FROM branch_inventory WHERE branchId = ? AND itemId = ?',
        [branchId, row.id]
      );
      if (!exists) {
        const stock = branchId === 'CN1' ? Number(row.currentStock) || 0 : 0;
        await dbRun(
          db,
          `INSERT INTO branch_inventory (branchId, itemId, currentStock, minStock) VALUES (?, ?, ?, ?)`,
          [branchId, row.id, stock, row.minStock ?? 0]
        );
      }
    }
  }
}

async function initBranchInventory(db) {
  await ensureBranchInventorySchema(db);
  const items = await dbAll(db, 'SELECT id, minStock FROM inventory');
  for (const item of items) {
    await seedBranchRowsForItem(db, item.id, item.minStock);
  }
  await migrateGlobalStockToBranches(db);
}

async function getInventoryForBranch(db, branchId) {
  if (!branchId) {
    return dbAll(db, 'SELECT * FROM inventory ORDER BY category, name');
  }
  return dbAll(
    db,
    `SELECT i.id, i.name, i.unit, i.cost, i.category,
            COALESCE(b.currentStock, 0) AS currentStock,
            COALESCE(b.minStock, i.minStock, 0) AS minStock
     FROM inventory i
     LEFT JOIN branch_inventory b ON b.itemId = i.id AND b.branchId = ?
     ORDER BY i.category, i.name`,
    [branchId]
  );
}

async function getMovementsForBranch(db, branchId) {
  if (!branchId) {
    return dbAll(db, 'SELECT * FROM inventory_movements ORDER BY timestamp DESC');
  }
  return dbAll(
    db,
    `SELECT * FROM inventory_movements WHERE branchId = ? OR branchId IS NULL OR branchId = ''
     ORDER BY timestamp DESC`,
    [branchId]
  );
}

async function applyBranchInventoryUpdate(db, branchId, items, movements) {
  if (!branchId) {
    throw new Error('branchId required for inventory update');
  }

  await dbRun(db, 'BEGIN TRANSACTION').catch(() => dbRun(db, 'BEGIN'));

  try {
    for (const item of items || []) {
      await dbRun(
        db,
        `UPDATE branch_inventory SET currentStock = ? WHERE branchId = ? AND itemId = ?`,
        [item.currentStock, branchId, item.id]
      );
    }
    for (const m of movements || []) {
      await dbRun(
        db,
        `INSERT INTO inventory_movements (id, timestamp, type, orderId, itemId, itemName, quantity, reason, performedBy, cost, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.id || `MOV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          m.timestamp || new Date().toISOString(),
          m.type,
          m.orderId || null,
          m.itemId,
          m.itemName,
          m.quantity,
          m.reason,
          m.performedBy,
          m.cost,
          branchId,
        ]
      );
    }
    await dbRun(db, 'COMMIT');
  } catch (err) {
    await dbRun(db, 'ROLLBACK').catch(() => {});
    throw err;
  }

  return getInventoryForBranch(db, branchId);
}

module.exports = {
  FALLBACK_BRANCHES,
  getBranchIds,
  initBranchInventory,
  getInventoryForBranch,
  getMovementsForBranch,
  applyBranchInventoryUpdate,
  seedBranchRowsForItem,
  seedBranchInventoryForBranch,
};
