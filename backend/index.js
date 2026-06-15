require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize uploads folder for storing images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
// Serve uploads folder as a static route
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// Initialize SQLite database
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}
const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Database connected.');
    createTables();
  }
});

// SSE Clients for real-time notifications
let clients = [];

function createTables() {
  db.serialize(() => {
    // 1. Inventory Table
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT,
      unit TEXT,
      currentStock REAL,
      minStock REAL,
      cost INTEGER,
      category TEXT
    )`);

    // 2. Inventory Movements Table
    db.run(`CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      type TEXT,
      orderId TEXT,
      itemId TEXT,
      itemName TEXT,
      quantity REAL,
      reason TEXT,
      performedBy TEXT,
      cost INTEGER
    )`);

    // 3. Orders Table (items is stored as stringified JSON)
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      branchId TEXT,
      source TEXT,
      items TEXT,
      time TEXT,
      status TEXT,
      total INTEGER,
      staff TEXT,
      paidAt TEXT,
      readyAt TEXT,
      completedAt TEXT,
      orderNumber INTEGER,
      customerName TEXT,
      customerPhone TEXT,
      deliveryAddress TEXT,
      shipperName TEXT,
      shipperId TEXT,
      paymentMethod TEXT,
      stockDeducted INTEGER
    )`);

    // 4. Wholesale Accounts Table (redemptions is stored as stringified JSON)
    db.run(`CREATE TABLE IF NOT EXISTS wholesale_accounts (
      id TEXT PRIMARY KEY,
      customerName TEXT,
      customerPhone TEXT,
      packageName TEXT,
      totalCups INTEGER,
      remainingCups INTEGER,
      durationMonths INTEGER,
      purchasedAt TEXT,
      expiresAt TEXT,
      preferredProduct TEXT,
      preferredProductSize TEXT,
      preferredProductProtein INTEGER,
      branchId TEXT,
      branchName TEXT,
      redemptions TEXT
    )`);

    // 5. PT Partners Table
    db.run(`CREATE TABLE IF NOT EXISTS partners_pt (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      code TEXT UNIQUE,
      dateCreated TEXT,
      paidCommission INTEGER
    )`);

    // 6. Referral Transactions Table
    db.run(`CREATE TABLE IF NOT EXISTS referral_transactions (
      id TEXT PRIMARY KEY,
      ptId TEXT,
      ptCode TEXT,
      orderId TEXT,
      customerName TEXT,
      comboName TEXT,
      price REAL,
      timestamp TEXT
    )`);

    // 7. Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      basePrice INTEGER,
      image TEXT,
      description TEXT
    )`);

    // 8. Employees Table
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      employeeId TEXT,
      email TEXT,
      phone TEXT,
      idNumber TEXT,
      dateOfBirth TEXT,
      address TEXT,
      branch TEXT,
      position TEXT,
      baseSalary INTEGER,
      startDate TEXT,
      username TEXT,
      password TEXT,
      photo TEXT
    )`);

    // 9. Shifts Table
    db.run(`CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      employeeId TEXT,
      employeeName TEXT,
      date TEXT,
      shiftType TEXT,
      startTime TEXT,
      endTime TEXT,
      status TEXT,
      checkIn TEXT,
      checkOut TEXT
    )`);

    // 10. Settings Table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Seed Default Settings if empty
    db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
      if (row && row.count === 0) {
        console.log('Seeding default settings...');
        const defaultPriceTable = {
          '250ml': { 20: 39000, 40: 59000 },
          '360ml': { 20: 59000, 40: 79000, 60: 99000 },
          '500ml': { 20: 79000, 40: 99000, 60: 119000 },
          '700ml': { 60: 139000, 90: 159000 },
        };
        const defaultCombos = [
          { id: 'healthy-boost', name: 'Healthy Boost', items: 'Yến mạch + Hạt chia + Cỏ ngọt', price: 25000, originalPrice: 30000, save: 5000 },
          { id: 'protein-plus', name: 'Protein Plus', items: 'Whey Gold + Sữa A2', price: 49000, originalPrice: 59000, save: 10000 },
          { id: 'beauty-blend', name: 'Beauty Blend', items: 'Collagen + Sữa hạt + Mật ong', price: 65000, originalPrice: 79000, save: 14000 },
          { id: 'nutty-crunch', name: 'Nutty Crunch', items: 'Bơ đậu phộng + Dừa sấy + Chà là', price: 29000, originalPrice: 35000, save: 6000 },
        ];
        
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['menuPriceTable', JSON.stringify(defaultPriceTable)]);
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['menuComboToppings', JSON.stringify(defaultCombos)]);
      }
    });

    // Seed Default Products if empty
    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
      if (row && row.count === 0) {
        console.log('Seeding default products...');
        const defaultProducts = [
          { id: 'SM-01', name: 'Dâu hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Chia' },
          { id: 'SM-02', name: 'Dâu chuối', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Banana' },
          { id: 'SM-03', name: 'Mãng cầu dâu', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Soursop Strawberry' },
          { id: 'SM-04', name: 'Dâu cam', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Strawberry Orange' },
          { id: 'SM-05', name: 'Dâu tằm hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Mulberry Chia' },
          { id: 'SM-06', name: 'Phúc bồn tử hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/strawberry_smoothie.png', description: 'Raspberry Chia' },
          { id: 'SM-07', name: 'Chuối hạt chia', category: 'smoothies', basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Banana Chia' },
          { id: 'SM-08', name: 'Chanh dây chuối', category: 'smoothies', basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Passionfruit Banana' },
          { id: 'SM-09', name: 'Xoài thơm', category: 'smoothies', basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Pineapple' },
          { id: 'SM-10', name: 'Xoài cam', category: 'smoothies', basePrice: 59000, image: '/images/mango_smoothie.png', description: 'Mango Orange' },
          { id: 'SM-11', name: 'Cacao yến mạch', category: 'smoothies', basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Cacao Oat' },
          { id: 'SM-12', name: 'Cà phê chuối', category: 'smoothies', basePrice: 59000, image: '/images/cacao_oat_smoothie.png', description: 'Coffee Banana' },
          { id: 'SM-13', name: 'Bơ', category: 'smoothies', basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado' },
          { id: 'SM-14', name: 'Bơ chuối', category: 'smoothies', basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Avocado Banana' },
          { id: 'SM-15', name: 'Matcha', category: 'smoothies', basePrice: 79000, image: '/images/fitblend_hero_smoothie.png', description: 'Matcha' },
          { id: 'TP-01', name: 'Sữa hạt 100%', category: 'toppings', basePrice: 15000, image: '🥛', description: '' },
          { id: 'TP-02', name: 'Sữa A2', category: 'toppings', basePrice: 20000, image: '🥛', description: '' },
          { id: 'TP-03', name: 'Bột đậu hà lan', category: 'toppings', basePrice: 20000, image: '🫛', description: '' },
          { id: 'TP-04', name: 'Whey Gold Standard', category: 'toppings', basePrice: 39000, image: '💪', description: '' },
          { id: 'TP-05', name: 'Collagen', category: 'toppings', basePrice: 49000, image: '✨', description: '' },
          { id: 'TP-06', name: 'Yến mạch', category: 'toppings', basePrice: 10000, image: '🌾', description: '' },
          { id: 'TP-07', name: 'Hạt chia', category: 'toppings', basePrice: 10000, image: '🌾', description: '' },
          { id: 'TP-08', name: 'Dừa sấy giòn', category: 'toppings', basePrice: 10000, image: '🥥', description: '' },
          { id: 'TP-09', name: 'Cỏ ngọt', category: 'toppings', basePrice: 10000, image: '🌿', description: '' },
          { id: 'TP-10', name: 'Mật ong', category: 'toppings', basePrice: 15000, image: '🍯', description: '' },
          { id: 'TP-11', name: 'Mật mía', category: 'toppings', basePrice: 3000, image: '🍯', description: '' },
          { id: 'TP-12', name: 'Chà là', category: 'toppings', basePrice: 5000, image: '🌴', description: '' },
          { id: 'TP-13', name: 'Bơ hạnh nhân', category: 'toppings', basePrice: 10000, image: '🥜', description: '' },
          { id: 'TP-14', name: 'Bơ đậu phộng', category: 'toppings', basePrice: 20000, image: '🥜', description: '' },
          { id: 'TP-15', name: 'Bơ hạt điều', category: 'toppings', basePrice: 15000, image: '🥜', description: '' },
          { id: 'CB-01', name: 'Fat Loss Plan', category: 'combo', basePrice: 449000, image: '📦', description: 'Giảm mỡ 7 ngày' },
          { id: 'CB-02', name: 'Muscle Build Plan', category: 'combo', basePrice: 669000, image: '📦', description: 'Tăng cơ 7 ngày' },
          { id: 'CB-03', name: 'Elite Mass Plan', category: 'combo', basePrice: 899000, image: '📦', description: 'Tăng cân 7 ngày' }
        ];
        const stmt = db.prepare("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)");
        defaultProducts.forEach(p => {
          stmt.run(p.id, p.name, p.category, p.basePrice, p.image, p.description);
        });
        stmt.finalize();
      }
    });

    // Seed Sample Employees if empty
    db.get("SELECT COUNT(*) as count FROM employees", (err, row) => {
      if (row && row.count === 0) {
        console.log('Seeding sample employees...');
        const sampleEmployees = [
          {
            id: '1',
            fullName: 'Nguyễn Văn An',
            employeeId: 'NV-001',
            email: 'nguyenvanan@fitblend.vn',
            phone: '0901234567',
            idNumber: '001234567890',
            dateOfBirth: '1995-03-15',
            address: '123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM',
            branch: 'CN1',
            position: 'manager',
            baseSalary: 12000000,
            startDate: '2023-01-10',
            username: 'vanan',
            password: '123',
            photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
          },
          {
            id: '2',
            fullName: 'Trần Thị Bình',
            employeeId: 'NV-002',
            email: 'tranthibinh@fitblend.vn',
            phone: '0902345678',
            idNumber: '002345678901',
            dateOfBirth: '1998-07-22',
            address: '456 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
            branch: 'CN1',
            position: 'cashier',
            baseSalary: 8000000,
            startDate: '2023-02-15',
            username: 'thibinh',
            password: '123',
            photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
          },
          {
            id: '3',
            fullName: 'Lê Minh Cường',
            employeeId: 'NV-003',
            email: 'leminhcuong@fitblend.vn',
            phone: '0903456789',
            idNumber: '003456789012',
            dateOfBirth: '1997-11-08',
            address: '789 Pasteur, Phường Võ Thị Sáu, Quận 3, TP.HCM',
            branch: 'CN2',
            position: 'bartender',
            baseSalary: 9000000,
            startDate: '2023-03-01',
            username: 'minhcuong',
            password: '123',
            photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
          }
        ];
        const stmt = db.prepare("INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        sampleEmployees.forEach(e => {
          stmt.run(e.id, e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, e.username, e.password, e.photo);
        });
        stmt.finalize();
      }
    });

    // Seed Sample Inventory if empty
    db.get("SELECT COUNT(*) as count FROM inventory", (err, row) => {
      if (row && row.count === 0) {
        console.log('Seeding sample inventory...');
        const sampleInventory = [
          { id: 'INV-001', name: 'Dâu tây', unit: 'kg', currentStock: 25.0, minStock: 5.0, cost: 80000, category: 'fruit' },
          { id: 'INV-002', name: 'Xoài', unit: 'kg', currentStock: 30.0, minStock: 6.0, cost: 40000, category: 'fruit' },
          { id: 'INV-003', name: 'Chuối', unit: 'kg', currentStock: 15.0, minStock: 3.0, cost: 20000, category: 'fruit' },
          { id: 'INV-004', name: 'Bơ', unit: 'kg', currentStock: 20.0, minStock: 5.0, cost: 60000, category: 'fruit' },
          { id: 'INV-005', name: 'Dứa', unit: 'kg', currentStock: 10.0, minStock: 2.0, cost: 25000, category: 'fruit' },
          { id: 'INV-006', name: 'Việt quất', unit: 'kg', currentStock: 8.0, minStock: 2.0, cost: 150000, category: 'fruit' },
          { id: 'INV-007', name: 'Rau bina', unit: 'kg', currentStock: 5.0, minStock: 1.5, cost: 35000, category: 'fruit' },
          { id: 'INV-008', name: 'Sữa tươi', unit: 'lít', currentStock: 40.0, minStock: 10.0, cost: 28000, category: 'dairy' },
          { id: 'INV-009', name: 'Sữa chua', unit: 'kg', currentStock: 15.0, minStock: 4.0, cost: 45000, category: 'dairy' },
          { id: 'INV-010', name: 'Whey Protein', unit: 'gói', currentStock: 100, minStock: 20, cost: 30000, category: 'protein' },
          { id: 'INV-014', name: 'Mật ong', unit: 'lít', currentStock: 5.0, minStock: 1.0, cost: 120000, category: 'topping' }
        ];
        const stmt = db.prepare("INSERT INTO inventory VALUES (?, ?, ?, ?, ?, ?, ?)");
        sampleInventory.forEach(item => {
          stmt.run(item.id, item.name, item.unit, item.currentStock, item.minStock, item.cost, item.category);
        });
        stmt.finalize();
      }
    });

  });
}

// Upload image route
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file' });
  }
  // Return relative URL to file
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl: fileUrl });
});

// Create new inventory item
app.post('/api/inventory', (req, res) => {
  const item = req.body;
  const id = item.id || `INV-${Date.now()}`;
  db.run(
    `INSERT INTO inventory (id, name, unit, currentStock, minStock, cost, category) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, item.name, item.unit, item.currentStock, item.minStock, item.cost, item.category],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get("SELECT * FROM inventory WHERE id = ?", [id], (err, row) => {
        if (!err && row) {
          // Broadcast updated inventory list to all clients
          db.all("SELECT * FROM inventory", (err, currentInv) => {
            if (!err) broadcast('INVENTORY_UPDATED', currentInv);
          });
          res.status(201).json(row);
        } else {
          res.status(500).json({ error: "Failed to fetch created item" });
        }
      });
    }
  );
});

// Helper to broadcast events to all connected clients
function broadcast(type, data) {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  });
}

// SSE Connection Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
});

// --- ORDERS API ---

// Get all orders (active & completed history)
app.get('/api/orders', (req, res) => {
  db.all("SELECT * FROM orders ORDER BY time DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const orders = rows.map(r => ({
      ...r,
      items: JSON.parse(r.items),
      stockDeducted: !!r.stockDeducted,
      time: new Date(r.time),
      paidAt: r.paidAt ? new Date(r.paidAt) : undefined,
      readyAt: r.readyAt ? new Date(r.readyAt) : undefined,
      completedAt: r.completedAt ? new Date(r.completedAt) : undefined
    }));
    res.json(orders);
  });
});

// Create new order
app.post('/api/orders', (req, res) => {
  const order = req.body;
  const id = order.id || `ORD-${Date.now()}`;
  const orderNumber = order.orderNumber || Math.floor(Math.random() * 1000) + 1;
  const time = order.time || new Date().toISOString();

  const query = `INSERT INTO orders (
    id, branchId, source, items, time, status, total, staff, paidAt, readyAt, completedAt, orderNumber, customerName, customerPhone, deliveryAddress, shipperName, shipperId, paymentMethod, stockDeducted
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    id,
    order.branchId,
    order.source,
    JSON.stringify(order.items),
    time,
    order.status,
    order.total,
    order.staff,
    order.paidAt || null,
    order.readyAt || null,
    order.completedAt || null,
    orderNumber,
    order.customerName,
    order.customerPhone,
    order.deliveryAddress,
    order.shipperName,
    order.shipperId,
    order.paymentMethod,
    order.stockDeducted ? 1 : 0
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const createdOrder = { ...order, id, time: new Date(time), orderNumber };
    broadcast('ORDER_CREATED', createdOrder);
    res.status(201).json(createdOrder);
  });
});

// Update order status/fields
app.patch('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Find current order
  db.get("SELECT * FROM orders WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Order not found" });

    const currentOrder = {
      ...row,
      items: JSON.parse(row.items),
      stockDeducted: !!row.stockDeducted
    };

    const newStatus = updates.status !== undefined ? updates.status : currentOrder.status;
    const newStockDeducted = updates.stockDeducted !== undefined ? (updates.stockDeducted ? 1 : 0) : row.stockDeducted;
    const readyAt = updates.readyAt || row.readyAt;
    const completedAt = updates.completedAt || row.completedAt;

    db.run(
      `UPDATE orders SET status = ?, stockDeducted = ?, readyAt = ?, completedAt = ?, staff = ?, shipperName = ?, shipperId = ? WHERE id = ?`,
      [newStatus, newStockDeducted, readyAt, completedAt, updates.staff || row.staff, updates.shipperName || row.shipperName, updates.shipperId || row.shipperId, id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get("SELECT * FROM orders WHERE id = ?", [id], (err, updatedRow) => {
          if (err || !updatedRow) return res.status(500).json({ error: "Failed to fetch updated order" });
          const finalOrder = {
            ...updatedRow,
            items: JSON.parse(updatedRow.items),
            stockDeducted: !!updatedRow.stockDeducted,
            time: new Date(updatedRow.time),
            paidAt: updatedRow.paidAt ? new Date(updatedRow.paidAt) : undefined,
            readyAt: updatedRow.readyAt ? new Date(updatedRow.readyAt) : undefined,
            completedAt: updatedRow.completedAt ? new Date(updatedRow.completedAt) : undefined
          };
          broadcast('ORDER_UPDATED', finalOrder);
          res.json(finalOrder);
        });
      }
    );
  });
});

// --- INVENTORY API ---

// Get current inventory stock
app.get('/api/inventory', (req, res) => {
  db.all("SELECT * FROM inventory", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get inventory movements
app.get('/api/inventory/movements', (req, res) => {
  db.all("SELECT * FROM inventory_movements ORDER BY timestamp DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Update stock (adjust or sale etc.)
app.post('/api/inventory/update', (req, res) => {
  const { items, movements } = req.body; // Array of { id, currentStock }, and movements to record
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const itemStmt = db.prepare("UPDATE inventory SET currentStock = ? WHERE id = ?");
    items.forEach(item => {
      itemStmt.run(item.currentStock, item.id);
    });
    itemStmt.finalize();

    if (movements && movements.length > 0) {
      const movStmt = db.prepare(`INSERT INTO inventory_movements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      movements.forEach(m => {
        movStmt.run(
          m.id || `MOV-${Date.now()}-${Math.random()}`,
          m.timestamp || new Date().toISOString(),
          m.type,
          m.orderId || null,
          m.itemId,
          m.itemName,
          m.quantity,
          m.reason,
          m.performedBy,
          m.cost
        );
      });
      movStmt.finalize();
    }

    db.run("COMMIT", (err) => {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: err.message });
      }
      // Broadcast inventory update
      db.all("SELECT * FROM inventory", (err, currentInv) => {
        if (!err) broadcast('INVENTORY_UPDATED', currentInv);
        res.json({ success: true });
      });
    });
  });
});

// --- WHOLESALE ACCOUNTS API ---

// Get wholesale accounts
app.get('/api/wholesale', (req, res) => {
  db.all("SELECT * FROM wholesale_accounts", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const accounts = rows.map(r => ({
      ...r,
      preferredProduct: r.preferredProduct ? JSON.parse(r.preferredProduct) : undefined,
      redemptions: JSON.parse(r.redemptions || '[]')
    }));
    res.json(accounts);
  });
});

// Create/Register wholesale account
app.post('/api/wholesale', (req, res) => {
  const account = req.body;
  const query = `INSERT INTO wholesale_accounts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    account.id,
    account.customerName,
    account.customerPhone,
    account.packageName,
    account.totalCups,
    account.remainingCups,
    account.durationMonths,
    account.purchasedAt,
    account.expiresAt,
    account.preferredProduct ? JSON.stringify(account.preferredProduct) : null,
    account.preferredProductSize || null,
    account.preferredProductProtein || null,
    account.branchId || null,
    account.branchName || null,
    JSON.stringify(account.redemptions || [])
  ], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('WHOLESALE_UPDATED', account);
    res.status(201).json(account);
  });
});

// Update/Redeem wholesale account cups
app.patch('/api/wholesale/:id', (req, res) => {
  const { id } = req.params;
  const { remainingCups, redemptions } = req.body;

  db.run(
    `UPDATE wholesale_accounts SET remainingCups = ?, redemptions = ? WHERE id = ?`,
    [remainingCups, JSON.stringify(redemptions), id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM wholesale_accounts WHERE id = ?", [id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Failed to fetch updated wholesale account" });
        const updated = {
          ...row,
          preferredProduct: row.preferredProduct ? JSON.parse(row.preferredProduct) : undefined,
          redemptions: JSON.parse(row.redemptions || '[]')
        };
        broadcast('WHOLESALE_UPDATED', updated);
        res.json(updated);
      });
    }
  );
});

// --- AFFILIATES (PT PARTNERS) API ---

// Get all partners
app.get('/api/affiliates/partners', (req, res) => {
  db.all("SELECT * FROM partners_pt", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new partner
app.post('/api/affiliates/partners', (req, res) => {
  const p = req.body;
  db.run(
    `INSERT INTO partners_pt VALUES (?, ?, ?, ?, ?, ?)`,
    [p.id, p.name, p.phone, p.code, p.dateCreated, p.paidCommission],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('PT_PARTNER_CREATED', p);
      res.status(201).json(p);
    }
  );
});

// Update partner paid commission
app.patch('/api/affiliates/partners/:id/pay', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  db.run(
    `UPDATE partners_pt SET paidCommission = paidCommission + ? WHERE id = ?`,
    [amount, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get("SELECT * FROM partners_pt WHERE id = ?", [id], (err, row) => {
        if (!err && row) broadcast('PT_PARTNER_UPDATED', row);
        res.json({ success: true });
      });
    }
  );
});

// Get all referral transactions
app.get('/api/affiliates/referrals', (req, res) => {
  db.all("SELECT * FROM referral_transactions ORDER BY timestamp DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create referral transaction
app.post('/api/affiliates/referrals', (req, res) => {
  const r = req.body;
  db.run(
    `INSERT INTO referral_transactions VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [r.id, r.ptId, r.ptCode, r.orderId, r.customerName, r.comboName, r.price, r.timestamp],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('REFERRAL_CREATED', r);
      res.status(201).json(r);
    }
  );
});

// --- PRODUCTS API ---
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const p = req.body;
  const id = p.id || `PROD-${Date.now()}`;
  db.run(
    `INSERT INTO products (id, name, category, basePrice, image, description) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, p.name, p.category, p.basePrice, p.image, p.description || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = { ...p, id };
      broadcast('PRODUCT_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const p = req.body;
  db.run(
    `UPDATE products SET name = ?, category = ?, basePrice = ?, image = ?, description = ? WHERE id = ?`,
    [p.name, p.category, p.basePrice, p.image, p.description || '', id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const updated = { ...p, id };
      broadcast('PRODUCT_UPDATED', updated);
      res.json(updated);
    }
  );
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM products WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('PRODUCT_DELETED', { id });
    res.json({ success: true });
  });
});

// --- EMPLOYEES API ---
app.get('/api/employees', (req, res) => {
  db.all("SELECT * FROM employees", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/employees', (req, res) => {
  const e = req.body;
  const id = e.id || `EMP-${Date.now()}`;
  db.run(
    `INSERT INTO employees (id, fullName, employeeId, email, phone, idNumber, dateOfBirth, address, branch, position, baseSalary, startDate, username, password, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, e.username, e.password, e.photo || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = { ...e, id };
      broadcast('EMPLOYEE_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const e = req.body;
  db.run(
    `UPDATE employees SET fullName = ?, employeeId = ?, email = ?, phone = ?, idNumber = ?, dateOfBirth = ?, address = ?, branch = ?, position = ?, baseSalary = ?, startDate = ?, username = ?, password = ?, photo = ? WHERE id = ?`,
    [e.fullName, e.employeeId, e.email, e.phone, e.idNumber, e.dateOfBirth, e.address, e.branch, e.position, e.baseSalary, e.startDate, e.username, e.password, e.photo || '', id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const updated = { ...e, id };
      broadcast('EMPLOYEE_UPDATED', updated);
      res.json(updated);
    }
  );
});

app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM employees WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('EMPLOYEE_DELETED', { id });
    res.json({ success: true });
  });
});

// --- SHIFTS API ---
app.get('/api/shifts', (req, res) => {
  db.all("SELECT * FROM shifts", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/shifts', (req, res) => {
  const s = req.body;
  const id = s.id || `SHIFT-${Date.now()}`;
  db.run(
    `INSERT INTO shifts (id, employeeId, employeeName, date, shiftType, startTime, endTime, status, checkIn, checkOut) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, s.employeeId, s.employeeName, s.date, s.shiftType, s.startTime, s.endTime, s.status || 'scheduled', s.checkIn || '', s.checkOut || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const created = { ...s, id };
      broadcast('SHIFT_CREATED', created);
      res.status(201).json(created);
    }
  );
});

app.put('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  const s = req.body;
  db.run(
    `UPDATE shifts SET employeeId = ?, employeeName = ?, date = ?, shiftType = ?, startTime = ?, endTime = ?, status = ?, checkIn = ?, checkOut = ? WHERE id = ?`,
    [s.employeeId, s.employeeName, s.date, s.shiftType, s.startTime, s.endTime, s.status, s.checkIn || '', s.checkOut || '', id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      const updated = { ...s, id };
      broadcast('SHIFT_UPDATED', updated);
      res.json(updated);
    }
  );
});

app.delete('/api/shifts/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM shifts WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    broadcast('SHIFT_DELETED', { id });
    res.json({ success: true });
  });
});

// --- SETTINGS API ---
app.get('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Setting not found' });
    try {
      res.json(JSON.parse(row.value));
    } catch (e) {
      res.json(row.value);
    }
  });
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  db.run(
    "INSERT INTO settings (key, value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, stringValue],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      broadcast('SETTING_UPDATED', { key, value });
      res.json({ success: true, key, value });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
