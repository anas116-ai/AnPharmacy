const path = require('path');
const crypto = require('crypto');

let db = null;

function initDatabase() {
  const Database = require('better-sqlite3');
  const { app } = require('electron');
  
  const dbPath = path.join(app.getPath('appData'), 'AnPharmacy', 'anpharmcy.db');
  const dbDir = path.dirname(dbPath);

  const fs = require('fs');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema();
  
  if (db.prepare('SELECT COUNT(*) as count FROM users').get().count === 0) {
    seedData();
  }

  return db;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      drug_license_no TEXT,
      transporter_name TEXT,
      vehicle_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      strength TEXT,
      batch_number TEXT NOT NULL,
      pack_size TEXT,
      company TEXT,
      generic_name TEXT,
      manufacturer_id INTEGER,
      manufacturer_name TEXT,
      quantity INTEGER NOT NULL DEFAULT 0,
      loose_quantity INTEGER DEFAULT 0,
      total_base_units INTEGER DEFAULT 0,
      mrp REAL,
      purchase_price REAL,
      ptr REAL,
      pts REAL,
      retailer_margin_percent REAL,
      selling_price REAL,
      purchase_gst_percent REAL DEFAULT 0,
      sale_gst_percent REAL DEFAULT 0,
      hsn_code TEXT,
      schedule_type TEXT DEFAULT 'General',
      barcode TEXT,
      rack_location TEXT,
      low_stock_alert INTEGER DEFAULT 20,
      max_stock_limit INTEGER,
      min_margin_percent REAL DEFAULT 20,
      mfg_date TEXT,
      expiry_date TEXT,
      expiry_returnable INTEGER DEFAULT 0,
      supplier_id INTEGER,
      invoice_no TEXT,
      invoice_date TEXT,
      po_number TEXT,
      order_date TEXT,
      payment_terms TEXT,
      due_date TEXT,
      dispatch_location TEXT,
      item_code TEXT,
      scheme_qty INTEGER DEFAULT 0,
      free_qty INTEGER DEFAULT 0,
      scheme_bonus_code TEXT,
      discount_percent REAL,
      taxable_amount REAL,
      cgst_amount REAL,
      sgst_amount REAL,
      igst_amount REAL,
      eway_bill_no TEXT,
      num_cartons INTEGER,
      cold_chain INTEGER DEFAULT 0,
      prescription_doc TEXT,
      added_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
    );

    -- Purchases derived from medicines table via batch_number and supplier
    -- No separate purchases table needed - purchases are stock additions with supplier info

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      bill_number TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      customer_gstin TEXT,
      doctor_name TEXT,
      doctor_reg_no TEXT,
      prescription_type TEXT,
      medicine_name TEXT,
      quantity INTEGER DEFAULT 0,
      loose_quantity INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      net_payable REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'cash',
      counter_id TEXT,
      pharmacist_id INTEGER,
      pharmacist_name TEXT,
      sale_date TEXT DEFAULT (date('now')),
      processed_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS license_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT,
      hwid TEXT,
      expiry_date TEXT,
      status TEXT DEFAULT 'active',
      last_heartbeat TEXT,
      activated_on TEXT DEFAULT (datetime('now')),
      is_invalid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      last_login TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

  CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
  CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
  CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
  
  -- Wave 6: MDOS Blueprint Extensions
  
  -- Manufacturers
  CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    license_number TEXT,
    rating INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Generic Medicines mapping
  CREATE TABLE IF NOT EXISTS generic_medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generic_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    manufacturer_id INTEGER,
    category TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id) ON DELETE SET NULL
  );

  -- Customers
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    credit_limit REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    type TEXT DEFAULT 'retail',
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Customer Ledger
  CREATE TABLE IF NOT EXISTS customer_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT,
    reference_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  -- Purchase Returns
    -- Purchases table
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      supplier_id INTEGER,
      supplier_name TEXT,
      supplier_address TEXT,
      supplier_gstin TEXT,
      supplier_dl_no TEXT,
      invoice_no TEXT,
      invoice_date TEXT,
      po_number TEXT,
      order_date TEXT,
      payment_terms TEXT,
      due_date TEXT,
      dispatch_location TEXT,
      eway_bill_no TEXT,
      transporter_name TEXT,
      vehicle_number TEXT,
      num_cartons INTEGER,
      total_taxable REAL DEFAULT 0,
      total_cgst REAL DEFAULT 0,
      total_sgst REAL DEFAULT 0,
      total_igst REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      processed_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    supplier_id INTEGER,
    medicine_id INTEGER,
    quantity INTEGER NOT NULL,
    reason TEXT,
    refund_amount REAL,
    returned_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    FOREIGN KEY (returned_by) REFERENCES users(id)
  );

  -- Sales Returns
  CREATE TABLE IF NOT EXISTS sales_returns (
    id TEXT PRIMARY KEY,
    sale_id TEXT,
    customer_id INTEGER,
    medicine_name TEXT,
    quantity INTEGER NOT NULL,
    refund_amount REAL,
    reason TEXT,
    processed_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
  );

  -- Warehouses
  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT,
    manager_name TEXT,
    phone TEXT,
    email TEXT,
    capacity INTEGER,
    current_stock INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Stock Transfers
  CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY,
    from_warehouse_id INTEGER,
    to_warehouse_id INTEGER,
    medicine_id INTEGER,
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    transferred_by INTEGER,
    received_by INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id),
    FOREIGN KEY (transferred_by) REFERENCES users(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
  );

  -- Expenses
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    payment_method TEXT,
    receipt_path TEXT,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Price Management
  CREATE TABLE IF NOT EXISTS price_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER,
    rule_type TEXT NOT NULL,
    discount_percentage REAL,
    discount_amount REAL,
    min_quantity INTEGER,
    max_quantity INTEGER,
    start_date TEXT,
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
  );

  -- Discount Management
  CREATE TABLE IF NOT EXISTS discount_schemes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    min_purchase_amount REAL,
    applicable_to TEXT,
    start_date TEXT,
    end_date TEXT,
    requires_approval INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- GST & HSN Management
  CREATE TABLE IF NOT EXISTS hsn_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hsn_code TEXT UNIQUE NOT NULL,
    description TEXT,
    gst_rate REAL NOT NULL,
    cess_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Seed default HSN codes (after table creation)
  INSERT OR IGNORE INTO hsn_codes (hsn_code, description, gst_rate, cess_rate) VALUES
    ('3004', 'Medicaments - for retail sale', 12, 0),
    ('3005', 'Wadding, gauze, bandages', 12, 0),
    ('3003', 'Medicaments - for bulk/wholesale', 12, 0),
    ('3006', 'Pharmaceutical goods (specified)', 12, 0),
    ('9018', 'Medical instruments/appliances', 12, 0),
    ('4015', 'Rubber gloves, medical', 12, 0);

  CREATE TABLE IF NOT EXISTS medicine_hsn (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    hsn_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (hsn_id) REFERENCES hsn_codes(id) ON DELETE CASCADE
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    action_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Calendar & Reminders
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    reminder_type TEXT NOT NULL,
    reminder_date TEXT NOT NULL,
    is_recurring INTEGER DEFAULT 0,
    recurrence_pattern TEXT,
    is_completed INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  -- Documents
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    category TEXT,
    tags TEXT,
    uploaded_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  );

  -- AI Insights
  CREATE TABLE IF NOT EXISTS ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    confidence_score REAL,
    recommended_action TEXT,
    is_actioned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Import History
  CREATE TABLE IF NOT EXISTS import_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    imported_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);
  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
  CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger(customer_id);
  CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_sales_returns_customer ON sales_returns(customer_id);
  CREATE INDEX IF NOT EXISTS idx_stock_transfers_warehouse ON stock_transfers(from_warehouse_id, to_warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
  CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
  
  `);
}

function seedData() {
  const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

  // Default users - each role has its own password per specification
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, 1)');
  insertUser.run('admin', hash('admin@123'), 'Administrator', 'admin');
  insertUser.run('sales', hash('sales@123'), 'Sales Representative', 'sales');
  insertUser.run('purchase', hash('purchase@123'), 'Purchase Manager', 'purchase_mgr');

  // Sample medicines
  const insertMedicine = db.prepare(`INSERT INTO medicines (name, batch_number, company, quantity, purchase_price, selling_price, mfg_date, expiry_date, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`);

  const today = new Date();
  const addDays = (d) => new Date(today.getTime() + d * 86400000).toISOString().split('T')[0];

  insertMedicine.run('Paracetamol 500mg', 'BATCH001', 'ABC Pharma', 500, 2.50, 5.00, addDays(-365), addDays(180), 1);
  insertMedicine.run('Amoxicillin 250mg', 'BATCH002', 'XYZ Labs', 300, 8.00, 15.00, addDays(-300), addDays(60), 1);
  insertMedicine.run('Ibuprofen 400mg', 'BATCH003', 'MediCorp', 200, 3.00, 8.00, addDays(-200), addDays(30), 1);
  insertMedicine.run('Cetirizine 10mg', 'BATCH004', 'PharmaGood', 400, 1.50, 4.00, addDays(-150), addDays(120), 1);
  insertMedicine.run('Omeprazole 20mg', 'BATCH005', 'HealthPharm', 250, 5.00, 12.00, addDays(-400), addDays(200), 1);
  insertMedicine.run('Metformin 500mg', 'BATCH006', 'DiabeCare', 350, 3.50, 7.00, addDays(-250), addDays(90), 1);
  insertMedicine.run('Amlodipine 5mg', 'BATCH007', 'CardioHealth', 180, 4.00, 10.00, addDays(-100), addDays(45), 1);
  insertMedicine.run('Ranitidine 150mg', 'BATCH008', 'GastroCare', 220, 2.00, 6.00, addDays(-350), addDays(250), 1);
  insertMedicine.run('Azithromycin 500mg', 'BATCH009', 'AntiBio Labs', 150, 12.00, 25.00, addDays(-80), addDays(-10), 1);
  insertMedicine.run('Vitamin D3 60K', 'BATCH010', 'NutriPharm', 600, 1.00, 3.00, addDays(-500), addDays(365), 1);

  // Sample sales
  const insertSale = db.prepare('INSERT INTO sales (id, customer_name, medicine_name, quantity, total_amount, sale_date, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertSale.run('sale-001', 'City Pharmacy', 'Paracetamol 500mg', 50, 250.00, addDays(-5), 1);
  insertSale.run('sale-002', 'MediCare Store', 'Amoxicillin 250mg', 30, 450.00, addDays(-3), 2);
  insertSale.run('sale-003', 'HealthPlus', 'Ibuprofen 400mg', 20, 160.00, addDays(-1), 3);

  // Audit log
  const insertAudit = db.prepare('INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime(\'now\'))');
  insertAudit.run(1, 'system_init', 'Application initialized with seed data');
  insertAudit.run(1, 'seed_data', '10 sample medicines added');

  // Insert low stock alert entries
  insertAudit.run(1, 'system_config', 'Default HSN codes seeded (3004, 3005, 3003, 3006, 9018, 4015)');
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDb };
