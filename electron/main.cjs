const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { initDatabase, getDb } = require('./database.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let db = null;

// Boot marker so we can prove which main.cjs build is loaded
console.log('[main.cjs] booted v3 (crash guards & sqlite fix)');

// ponytail + strix: global crash guards to prevent silent app exits
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught exception in main process:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled promise rejection in main process:', reason);
});

// node:sqlite DatabaseSync has no .transaction(); emulate with BEGIN/COMMIT/ROLLBACK
const dbTransaction = (database, fn) => {
  database.exec('BEGIN');
  try {
    fn();
    database.exec('COMMIT');
  } catch (e) {
    database.exec('ROLLBACK');
    throw e;
  }
};

const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_PATH)) {
      const state = JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf-8'));
      if (state.width && state.height) return state;
    }
  } catch (err) {
    console.error('Failed to load window state:', err);
  }
  return { width: 1280, height: 800, maximized: false };
}

function saveWindowState(win) {
  try {
    if (!win || win.isDestroyed()) return;
    const state = win.isMaximized()
      ? { maximized: true }
      : { ...win.getBounds(), maximized: false };
    fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save window state:', err);
  }
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('AnPharmacy — Intelligent Pharmacy Management');
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'Open AnPharmacy',
        click: () => {
          if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return; }
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: 'Backup Now',
        click: async () => {
          const result = await performBackup();
          if (Notification.isSupported()) {
            new Notification({
              title: 'AnPharmacy Backup',
              body: result.success ? `Backup saved: ${result.path}` : `Backup failed: ${result.error}`,
            }).show();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => { isQuitting = true; app.quit(); },
      },
    ]));
    tray.on('double-click', () => {
      if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return; }
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

// ponytail: local app menu so the window behaves like a real desktop app
function createAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Create Backup', click: () => mainWindow && mainWindow.webContents.send('menu:action', 'backup') },
        { type: 'separator' },
        { label: 'Settings', click: () => mainWindow && mainWindow.webContents.send('menu:action', 'settings') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About AnPharmacy', click: () => mainWindow && mainWindow.webContents.send('menu:action', 'about') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let autoBackupInterval = null;
const AUTO_BACKUP_SETTINGS_PATH = path.join(app.getPath('userData'), 'auto-backup-settings.json');

function loadAutoBackupSettings() {
  try {
    if (fs.existsSync(AUTO_BACKUP_SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(AUTO_BACKUP_SETTINGS_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to load auto-backup settings:', err);
  }
  return { enabled: false, intervalHours: 24, lastBackup: null };
}

function saveAutoBackupSettings(settings) {
  try {
    fs.writeFileSync(AUTO_BACKUP_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Failed to save auto-backup settings:', err);
  }
}

function performAutoBackup() {
  try {
    const now = new Date().toISOString();
    const backupDir = path.join(app.getPath('documents'), 'AnPharmacy Backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = path.join(backupDir, `auto-backup-${timestamp}.anpbackup`);

    const tables = ['medicines', 'sales', 'users', 'suppliers', 'audit_log', 'license_info', 'notifications', 'reminders', 'documents', 'ai_insights', 'company_profile'];
    const backupData = {};
    for (const table of tables) {
      try {
        backupData[table] = db.prepare(`SELECT * FROM ${table}`).all();
      } catch (e) {
        backupData[table] = [];
      }
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const key = crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const hmac = crypto.createHmac('sha256', key).update(encrypted).digest('hex');

    const backupPayload = JSON.stringify({ iv: iv.toString('hex'), data: encrypted, hmac, timestamp: now });
    fs.writeFileSync(backupPath, backupPayload);

    return { success: true, path: backupPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function startAutoBackupScheduler() {
  if (autoBackupInterval) clearInterval(autoBackupInterval);

  const settings = loadAutoBackupSettings();
  if (!settings.enabled) return;

  const intervalHours = settings.intervalHours || 24;

  autoBackupInterval = setInterval(() => {
    try {
      const current = loadAutoBackupSettings();
      if (!current.enabled || !db) return;

      const lastBackup = current.lastBackup ? new Date(current.lastBackup) : null;
      const hoursSinceLastBackup = lastBackup ? (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60) : Infinity;

      if (hoursSinceLastBackup >= intervalHours) {
        const result = performAutoBackup();

        current.lastBackup = new Date().toISOString();
        saveAutoBackupSettings(current);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('auto-backup:completed', result);
        }
      }
    } catch (err) {
      console.error('Auto-backup failed:', err);
    }
  }, 60 * 60 * 1000); // Check every hour
}

function initializeAutoBackup() {
  startAutoBackupScheduler();
}

function createWindow() {
  const winState = loadWindowState();

  mainWindow = new BrowserWindow({
    width: winState.width || 1280,
    height: winState.height || 800,
    x: winState.x,
    y: winState.y,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    frame: false,
    title: 'AnPharmacy — Intelligent Pharmacy Management',
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    show: false,
    backgroundColor: '#0B1120',
  });

  const isDev = process.argv.includes('--dev') || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    if (winState.maximized) mainWindow.maximize();
    mainWindow.show();
  });

  // ponytail: persist size/position across restarts
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      // minimize to tray instead of quitting
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    saveWindowState(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // forward window-state changes to the renderer (for custom titlebar max/restore icon)
  const sendMaxState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized', mainWindow.isMaximized());
    }
  };
  mainWindow.on('maximize', sendMaxState);
  mainWindow.on('unmaximize', sendMaxState);

  // open external links in the OS browser, never in-app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ===== IPC Handlers =====

// Database Init
ipcMain.handle('db:init', async () => {
  try {
    db = initDatabase();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Desktop Window Controls =====
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
  return { success: true };
});
ipcMain.handle('window:toggleMaximize', () => {
  if (!mainWindow) return { success: false };
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return { success: true, maximized: mainWindow.isMaximized() };
});
ipcMain.handle('window:close', () => {
  // ponytail: close hides to tray (like WhatsApp/Slack); quit only via tray menu or File > Quit
  if (mainWindow && tray) {
    mainWindow.hide();
    if (Notification.isSupported()) {
      new Notification({
        title: 'AnPharmacy is still running',
        body: 'Closed to tray. Use the tray icon to reopen or quit.',
        silent: true,
      }).show();
    }
  } else {
    isQuitting = true;
    if (mainWindow) mainWindow.close();
  }
  return { success: true };
});
ipcMain.handle('window:isMaximized', () => ({
  success: true,
  maximized: mainWindow?.isMaximized() ?? false,
}));
ipcMain.handle('window:hide', () => {
  mainWindow?.hide();
  return { success: true };
});
ipcMain.handle('window:show', () => {
  mainWindow?.show();
  mainWindow?.focus();
  return { success: true };
});

// ===== App Info (for the status bar + About dialog) =====
ipcMain.handle('app:getInfo', () => {
  return {
    success: true,
    version: app.getVersion(),
    electron: process.versions.electron,
    platform: process.platform,
    dbPath: path.join(app.getPath('appData'), 'AnPharmacy', 'anpharmcy.db'),
    isDesktop: true,
  };
});

// ===== Native OS Notifications =====
ipcMain.handle('notify:show', (event, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      new Notification({ title: title || 'AnPharmacy', body: body || '' }).show();
      return { success: true };
    }
    return { success: false, error: 'Notifications not supported' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auth
ipcMain.handle('auth:login', async (event, { username, password }) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    if (!row) {
      return { success: false, error: 'Invalid username or password' };
    }
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (row.password_hash !== hash) {
      return { success: false, error: 'Invalid username or password' };
    }
    db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(row.id);
    // Audit log
    db.prepare('INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime(\'now\'))').run(row.id, 'login', `User ${row.username} logged in`);
    return {
      success: true,
      user: {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        role: row.role,
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Users
ipcMain.handle('users:list', async () => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, username, display_name, role, last_login, is_active FROM users ORDER BY id').all();
    return { success: true, users };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:create', async (event, { username, password, displayName, role }) => {
  try {
    const db = getDb();
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    db.prepare('INSERT INTO users (username, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, 1)').run(username, hash, displayName, role);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:toggleActive', async (event, { id, isActive }) => {
  try {
    const db = getDb();
    db.prepare('UPDATE users SET is_active = ? WHERE id = ? AND role != \'admin\'').run(isActive ? 1 : 0, id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('users:delete', async (event, { id }) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
    if (user && user.role === 'admin') {
      return { success: false, error: 'Cannot delete admin user' };
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Suppliers
ipcMain.handle('suppliers:list', async () => {
  try {
    const db = getDb();
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
    return { success: true, suppliers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:create', async (event, { name, contact_person, phone, email, address, gstin, notes }) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO suppliers (name, contact_person, phone, email, address, gstin, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      name, contact_person || null, phone || null, email || null, address || null, gstin || null, notes || null
    );
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:update', async (event, { id, name, contact_person, phone, email, address, gstin, notes }) => {
  try {
    const db = getDb();
    db.prepare('UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, gstin = ?, notes = ? WHERE id = ?').run(
      name, contact_person || null, phone || null, email || null, address || null, gstin || null, notes || null, id
    );
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    return { success: true, supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:delete', async (event, { id }) => {
  try {
    const db = getDb();
    const medicineCount = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE supplier_id = ?').get(id).count;
    if (medicineCount > 0) {
      return { success: false, error: `Cannot delete supplier. ${medicineCount} medicine(s) are linked to this supplier.` };
    }
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:getMedicines', async (event, { supplierId }) => {
  try {
    const db = getDb();
    const medicines = db.prepare('SELECT * FROM medicines WHERE supplier_id = ? ORDER BY name').all(supplierId);
    return { success: true, medicines };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:getLedger', async (event, { supplierId }) => {
  try {
    const db = getDb();
    const ledger = db.prepare('SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY created_at DESC').all(supplierId);
    const supplier = db.prepare('SELECT id, name, current_balance FROM suppliers WHERE id = ?').get(supplierId);
    return { success: true, ledger, currentBalance: supplier ? (supplier.current_balance || 0) : 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('suppliers:addPayment', async (event, { supplierId, amount, paymentMethod, referenceId, notes }) => {
  try {
    const db = getDb();
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return { success: false, error: 'Payment amount must be greater than zero' };
    dbTransaction(db, () => {
      db.prepare(`INSERT INTO supplier_ledger (supplier_id, transaction_type, amount, payment_method, reference_id, notes, created_at)
        VALUES (?, 'payment', ?, ?, ?, ?, datetime('now'))`).run(
        supplierId, numAmount, paymentMethod || 'bank_transfer', referenceId || null, notes || null
      );
      db.prepare('UPDATE suppliers SET current_balance = COALESCE(current_balance, 0) - ? WHERE id = ?').run(numAmount, supplierId);
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// License
ipcMain.handle('license:getStatus', async () => {
  try {
    const db = getDb();
    const license = db.prepare('SELECT * FROM license_info LIMIT 1').get();
    if (!license) {
      return { status: 'not_activated', deviceId: getHWID() };
    }
    const now = new Date();
    const expiry = new Date(license.expiry_date);
    const lastHeartbeat = new Date(license.last_heartbeat || 0);
    const daysSinceHeartbeat = Math.floor((now - lastHeartbeat) / (1000 * 60 * 60 * 24));

    let status = 'active';
    if (expiry < now) status = 'expired';
    if (license.is_invalid) status = 'invalid';
    if (daysSinceHeartbeat > 15) status = 'needs_heartbeat';

    return { status, deviceId: getHWID(), license };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
});

ipcMain.handle('license:activate', async (event, { licenseKey }) => {
  try {
    const hwid = getHWID();
    const decoded = decodeLicenseKey(licenseKey, hwid);
    if (!decoded.valid) {
      return { success: false, error: 'Invalid license key or hardware mismatch' };
    }
    const db = getDb();
    db.prepare('DELETE FROM license_info').run();
    db.prepare(`INSERT INTO license_info (license_key, hwid, expiry_date, status, last_heartbeat, activated_on)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`).run(licenseKey, hwid, decoded.expiryDate, 'active');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('license:deactivate', async () => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM license_info').run();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stock/Medicines
ipcMain.handle('stock:list', async () => {
  try {
    const db = getDb();
    const medicines = db.prepare(`SELECT m.*, 
      CASE 
        WHEN m.expiry_date < date('now') THEN 'expired'
        WHEN julianday(m.expiry_date) - julianday('now') <= 90 THEN 'critical'
        WHEN julianday(m.expiry_date) - julianday('now') <= 180 THEN 'warning'
        ELSE 'safe'
      END as status,
      CASE WHEN m.expiry_date IS NOT NULL THEN julianday(m.expiry_date) - julianday('now') ELSE NULL END as days_remaining
      FROM medicines m ORDER BY m.expiry_date ASC`).all();
    return { success: true, medicines: medicines.map(fromRow) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:add', async (event, { medicine, userId }) => {
  try {
    const db = getDb();
    const result = db.prepare(`INSERT INTO medicines (
        name, strength, batch_number, pack_size, company,
        generic_name, manufacturer_id, manufacturer_name,
        quantity, loose_quantity, total_base_units,
        mrp, purchase_price, ptr, pts, retailer_margin_percent, selling_price,
        purchase_gst_percent, sale_gst_percent, hsn_code, schedule_type,
        barcode, rack_location, low_stock_alert, max_stock_limit, min_margin_percent,
        mfg_date, expiry_date, expiry_returnable,
        supplier_id, invoice_no, invoice_date,
        po_number, order_date, payment_terms, due_date, dispatch_location,
        item_code, scheme_qty, free_qty, scheme_bonus_code,
        discount_percent, taxable_amount, cgst_amount, sgst_amount, igst_amount,
        eway_bill_no, num_cartons, cold_chain, prescription_doc, added_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      medicine.name, medicine.strength || null, medicine.batchNumber, medicine.packSize || null, medicine.company || null,
      medicine.genericName || null, medicine.manufacturerId || null, medicine.manufacturerName || null,
      medicine.quantity, medicine.looseQuantity || 0, (medicine.quantity || 0) + (medicine.looseQuantity || 0),
      medicine.mrp || null, medicine.purchasePrice || null, medicine.ptr || null, medicine.pts || null, medicine.retailerMarginPercent || null, medicine.sellingPrice || null,
      medicine.purchaseGstPercent != null ? medicine.purchaseGstPercent : 0,
      medicine.saleGstPercent != null ? medicine.saleGstPercent : 0,
      medicine.hsnCode || null, medicine.scheduleType || 'General',
      medicine.barcode || null, medicine.rackLocation || null,
      medicine.lowStockAlert != null ? medicine.lowStockAlert : 20,
      medicine.maxStockLimit || null,
      medicine.minMarginPercent != null ? medicine.minMarginPercent : 20,
      medicine.mfgDate || null, medicine.expiryDate || null,
      medicine.expiryReturnable ? 1 : 0,
      medicine.supplierId || null, medicine.invoiceNo || null, medicine.invoiceDate || null,
      medicine.poNumber || null, medicine.orderDate || null, medicine.paymentTerms || null, medicine.dueDate || null, medicine.dispatchLocation || null,
      medicine.itemCode || null, medicine.schemeQty || 0, medicine.freeQty || 0, medicine.schemeBonusCode || null,
      medicine.discountPercent || null, medicine.taxableAmount || null, medicine.cgstAmount || null, medicine.sgstAmount || null, medicine.igstAmount || null,
      medicine.ewayBillNo || null, medicine.numCartons || null, medicine.coldChain ? 1 : 0,
      medicine.prescriptionDoc || null, userId
    );
    // Audit log
    db.prepare('INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime(\'now\'))').run(userId, 'add_stock', `Added ${medicine.quantity} units of ${medicine.name} (Batch: ${medicine.batchNumber})`);
    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Bulk save all medicines (used by import commit). Replaces entire stock table.
ipcMain.handle('stock:saveAll', async (event, { medicines }) => {
  try {
    const db = getDb();
    if (!Array.isArray(medicines)) return { success: false, error: 'Invalid data' };
    const cols = MEDICINE_COLS.filter(c => c !== 'id');
    const insert = db.prepare(`INSERT INTO medicines (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`);
    dbTransaction(db, () => {
      db.prepare('DELETE FROM medicines').run();
      for (const m of medicines) {
        const row = toRow(m);
        insert.run(...cols.map(c => row[c] !== undefined && row[c] !== null ? row[c] : null));
      }
    });
    return { success: true, count: medicines.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stock:getBatches', async (event, { medicineName }) => {
  try {
    const db = getDb();
    const batches = db.prepare(`SELECT m.*,
      CASE WHEN m.expiry_date IS NOT NULL THEN CAST(julianday(m.expiry_date) - julianday('now') AS INTEGER) ELSE NULL END as days_remaining
      FROM medicines m
      WHERE LOWER(name) = LOWER(?) AND quantity > 0 AND (expiry_date IS NULL OR expiry_date >= date('now'))
      ORDER BY
        CASE WHEN m.expiry_date IS NULL THEN 1 ELSE 0 END,
        m.expiry_date ASC`).all();
    return { success: true, batches: batches.map(fromRow) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

const MEDICINE_COLS = ['id','name','strength','batch_number','pack_size','company','generic_name','manufacturer_id','manufacturer_name','quantity','loose_quantity','total_base_units','mrp','purchase_price','ptr','pts','retailer_margin_percent','selling_price','purchase_gst_percent','sale_gst_percent','hsn_code','schedule_type','barcode','rack_location','low_stock_alert','max_stock_limit','min_margin_percent','mfg_date','expiry_date','expiry_returnable','supplier_id','invoice_no','invoice_date','po_number','order_date','payment_terms','due_date','dispatch_location','item_code','scheme_qty','free_qty','scheme_bonus_code','discount_percent','taxable_amount','cgst_amount','sgst_amount','igst_amount','eway_bill_no','num_cartons','cold_chain','prescription_doc','custom_fields','added_by','created_at','updated_at'];

// Serialize medicine objects to DB rows: custom_fields object <-> JSON text column.
// Ponytail: single choke point so every handler round-trips custom fields correctly.
const toRow = (m) => m.custom_fields && typeof m.custom_fields === 'object' && Object.keys(m.custom_fields).length
  ? { ...m, custom_fields: JSON.stringify(m.custom_fields) }
  : { ...m, custom_fields: null };
const fromRow = (r) => {
  if (!r || !r.custom_fields) return r;
  try { return { ...r, custom_fields: JSON.parse(r.custom_fields) }; } catch { return r; }
};

// Recycle bin: move stock to deleted_medicines
ipcMain.handle('stock:deleteToBin', async (event, { id, userId }) => {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT ${MEDICINE_COLS.join(', ')} FROM medicines WHERE id = ?`).get(id);
    if (!row) return { success: false, error: 'Medicine not found' };
    dbTransaction(db, () => {
      db.prepare(`INSERT INTO deleted_medicines (${MEDICINE_COLS.join(', ')}, deleted_at, deleted_by) VALUES (${MEDICINE_COLS.map(() => '?').join(', ')}, datetime('now'), ?)`).run(...MEDICINE_COLS.map(c => row[c]), userId || null);
      db.prepare('DELETE FROM medicines WHERE id = ?').run(id);
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Recycle bin: list deleted stock
ipcMain.handle('stock:getDeleted', async () => {
  try {
    const db = getDb();
    const deletedItems = db.prepare(`SELECT * FROM deleted_medicines ORDER BY deleted_at DESC`).all();
    return { success: true, deletedItems };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Recycle bin: restore a deleted item
ipcMain.handle('stock:restoreFromBin', async (event, { id }) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM deleted_medicines WHERE id = ?').get(id);
    if (!row) return { success: false, error: 'Deleted item not found' };
    dbTransaction(db, () => {
      db.prepare(`INSERT INTO medicines (${MEDICINE_COLS.join(', ')}) VALUES (${MEDICINE_COLS.map(() => '?').join(', ')})`).run(...MEDICINE_COLS.map(c => row[c]));
      db.prepare('DELETE FROM deleted_medicines WHERE id = ?').run(id);
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Recycle bin: permanent delete
ipcMain.handle('stock:permanentDelete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM deleted_medicines WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Profit / margin report: Selling - Purchase - GST (net)
ipcMain.handle('reports:profit', async () => {
  try {
    const db = getDb();
    const medicines = db.prepare(`SELECT m.*,
      CASE WHEN m.expiry_date IS NOT NULL THEN CAST(julianday(m.expiry_date) - julianday('now') AS INTEGER) ELSE NULL END as days_remaining
      FROM medicines m ORDER BY m.name`).all();

    let totalPurchaseValue = 0, totalSaleValue = 0, totalInputGst = 0, totalOutputGst = 0, totalRealProfit = 0, batchCount = 0;
    const rows = [];
    for (const m of medicines) {
      const qty = m.quantity || 0;
      if (qty <= 0) continue;
      batchCount += 1;
      const pp = m.purchase_price || 0;
      const sp = m.selling_price || 0;
      const inGst = pp * ((m.purchase_gst_percent || 0) / 100) * qty;
      const outGst = sp * ((m.sale_gst_percent || 0) / 100) * qty;
      const realMargin = (sp - pp) * qty - (outGst - inGst);
      totalPurchaseValue += pp * qty;
      totalSaleValue += sp * qty;
      totalInputGst += inGst;
      totalOutputGst += outGst;
      totalRealProfit += realMargin;
      rows.push({
        id: m.id, name: m.name, batch_number: m.batch_number, quantity: qty,
        purchase_price: pp, selling_price: sp,
        purchase_gst_percent: m.purchase_gst_percent || 0, sale_gst_percent: m.sale_gst_percent || 0,
        input_gst: inGst, output_gst: outGst,
        real_margin: realMargin,
        margin_percent: sp > 0 ? (realMargin / (sp * qty)) * 100 : 0,
        schedule_type: m.schedule_type,
      });
    }
    const stats = {
      totalPurchaseValue, totalSaleValue, totalInputGst, totalOutputGst, totalRealProfit,
      marginPercent: totalSaleValue > 0 ? (totalRealProfit / totalSaleValue) * 100 : 0,
      batchCount,
    };
    return { success: true, rows, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Real margin per sale line, from cost captured at sale time (sale_items)
ipcMain.handle('reports:saleMargin', async (event, { days = 30 } = {}) => {
  try {
    const db = getDb();
    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const rows = db.prepare(`
      SELECT s.sale_date, s.bill_number, s.customer_name, s.payment_mode,
        SUM(i.purchase_price * i.quantity) AS cost,
        SUM(i.net_amount) AS revenue,
        SUM((i.selling_price * (1 - i.discount_percent / 100)) * i.quantity) AS billed
      FROM sale_items i JOIN sales s ON s.id = i.sale_id
      WHERE s.sale_date >= ?
      GROUP BY s.id ORDER BY s.sale_date DESC`).all(from);
    const items = rows.map(r => ({
      ...r,
      margin: (r.revenue || 0) - (r.cost || 0),
      marginPercent: r.revenue > 0 ? (((r.revenue || 0) - (r.cost || 0)) / r.revenue) * 100 : 0,
    }));
    const stats = items.reduce((acc, r) => {
      acc.revenue += r.revenue; acc.cost += r.cost; acc.margin += r.margin;
      return acc;
    }, { revenue: 0, cost: 0, margin: 0 });
    stats.marginPercent = stats.revenue > 0 ? (stats.margin / stats.revenue) * 100 : 0;
    return { success: true, rows: items, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Expiry tiers: 90 / 60 / 30 days + expired auto-report
ipcMain.handle('reports:expiryTiers', async () => {
  try {
    const db = getDb();
    const all = db.prepare(`SELECT m.*,
      CASE WHEN m.expiry_date < date('now') THEN 'expired'
           WHEN julianday(m.expiry_date) - julianday('now') <= 90 THEN 'critical'
           WHEN julianday(m.expiry_date) - julianday('now') <= 180 THEN 'warning'
           ELSE 'safe' END as status,
      CASE WHEN m.expiry_date IS NOT NULL THEN CAST(julianday(m.expiry_date) - julianday('now') AS INTEGER) ELSE NULL END as days_remaining
      FROM medicines m WHERE m.expiry_date IS NOT NULL ORDER BY m.expiry_date`).all();

    const tiers = {
      expired: [], d90: [], d60: [], d30: [], safe: [], unknown: [],
    };
    for (const m of all) {
      const d = m.days_remaining;
      let tier;
      if (d == null) tier = 'unknown';
      else if (d < 0) tier = 'expired';
      else if (d <= 30) tier = 'd30';
      else if (d <= 60) tier = 'd60';
      else if (d <= 90) tier = 'd90';
      else tier = 'safe';
      tiers[tier].push(m);
    }

    const stats = {
      expired: tiers.expired.length,
      d90: tiers.d90.length,
      d60: tiers.d60.length,
      d30: tiers.d30.length,
      safe: tiers.safe.length,
      total: all.length,
      // Stock value at risk (expired + <=90 days) at cost
      atRiskValue: [...tiers.expired, ...tiers.d90, ...tiers.d60, ...tiers.d30]
        .reduce((s, m) => s + ((m.purchase_price || 0) * (m.quantity || 0)), 0),
    };
    return { success: true, tiers, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Sales
ipcMain.handle('sales:process', async (event, { customerName, customerId, customerPhone, customerAddress, customerGstin, doctorName, doctorRegNo, prescriptionType, medicineName, totalAmount, discountAmount, taxableAmount, cgstAmount, sgstAmount, igstAmount, netPayable, paymentMode, counterId, pharmacistId, pharmacistName, items, userId }) => {
  try {
    const db = getDb();
    const saleId = crypto.randomUUID();

    // ponytail: sequential, collision-free fiscal invoice numbering (e.g. INV-2627-0001)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const fyStart = curMonth >= 4 ? curYear : curYear - 1;
    const fyCode = `${String(fyStart).slice(2)}${String(fyStart + 1).slice(2)}`;

    const lastSale = db.prepare("SELECT bill_number FROM sales WHERE bill_number LIKE ? ORDER BY rowid DESC LIMIT 1").get(`INV-${fyCode}-%`);
    let nextSeq = 1;
    if (lastSale && lastSale.bill_number) {
      const parts = lastSale.bill_number.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextSeq = lastNum + 1;
    }
    const billNumber = `INV-${fyCode}-${String(nextSeq).padStart(4, '0')}`;

    const insertSale = db.prepare(`INSERT INTO sales (id, bill_number, customer_name, customer_id, customer_phone, customer_address, customer_gstin, doctor_name, doctor_reg_no, prescription_type, medicine_name, quantity, total_amount, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, net_payable, payment_mode, counter_id, pharmacist_id, pharmacist_name, sale_date, processed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), ?)`);
    const updateStock = db.prepare('UPDATE medicines SET quantity = quantity - ?, loose_quantity = loose_quantity - ? WHERE id = ? AND quantity >= ?');
    const insertItem = db.prepare('INSERT INTO sale_items (sale_id, medicine_name, batch_id, batch_number, quantity, purchase_price, selling_price, discount_percent, net_amount, free_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertLedger = db.prepare('INSERT INTO customer_ledger (customer_id, transaction_type, amount, payment_method, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?)');
    const bumpBalance = db.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?');
    const insertAudit = db.prepare('INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime(\'now\'))');

    dbTransaction(db, () => {
      const totalQty = items.reduce((s, i) => s + i.quantity, 0);
      // Create sale record
      insertSale.run(saleId, billNumber, customerName, customerId || null, customerPhone || null, customerAddress || null, customerGstin || null, doctorName || null, doctorRegNo || null, prescriptionType || null, medicineName, totalQty, totalAmount, discountAmount || 0, taxableAmount || 0, cgstAmount || 0, sgstAmount || 0, igstAmount || 0, netPayable || totalAmount, paymentMode || 'cash', counterId || null, pharmacistId || null, pharmacistName || null, userId);

      // Deduct stock for each batch
      for (const item of items) {
        const freeUnits = item.freeQty || 0;
        const totalDeduct = (item.quantity || 0) + freeUnits;
        const result = updateStock.run(totalDeduct, item.looseQuantity || 0, item.batchId, totalDeduct);
        if (result.changes === 0) {
          throw new Error(`Insufficient stock for batch ${item.batchNumber} (needs ${totalDeduct} units including ${freeUnits} bonus free units)`);
        }
        // ponytail: persist cost at sale time; purchase price is gone once stock moves
        insertItem.run(saleId, item.medicineName || item.batchNumber || '', item.batchId, item.batchNumber || null, item.quantity, item.purchasePrice || 0, item.sellingPrice || 0, item.discountPercent || 0, item.netAmount || item.quantity * (item.sellingPrice || 0), freeUnits);
      }

      // ponytail: credit sales must hit the ledger, or receivables/balances are fiction
      if ((paymentMode === 'credit' || paymentMode === 'credit_ledger') && customerId) {
        insertLedger.run(customerId, 'sale', netPayable || totalAmount, paymentMode, saleId, `Sale #${billNumber}`);
        bumpBalance.run(netPayable || totalAmount, customerId);
      }

      insertAudit.run(userId, 'sale', `Sale #${billNumber} to ${customerName}: ${medicineName} ${netPayable || totalAmount} INR (${paymentMode || 'cash'})`);
    });
    return { success: true, saleId, billNumber };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sales:list', async () => {
  try {
    const db = getDb();
    const sales = db.prepare(`SELECT s.*, u.display_name as processed_by_name 
      FROM sales s LEFT JOIN users u ON s.processed_by = u.id 
      ORDER BY s.sale_date DESC LIMIT 100`).all();
    return { success: true, sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Purchases
ipcMain.handle('purchases:create', async (event, { supplierName, supplierGstin, invoiceNo, invoiceDate, totalAmount, items }) => {
  try {
    const db = getDb();
    // ponytail: find-or-create supplier by GSTIN (best key), fall back to name
    let supplierId = null;
    if (supplierName || supplierGstin) {
      let supplier = supplierGstin
        ? db.prepare('SELECT * FROM suppliers WHERE gstin = ?').get(supplierGstin)
        : null;
      if (!supplier) {
        supplier = db.prepare('SELECT * FROM suppliers WHERE name = ?').get(supplierName);
      }
      if (!supplier) {
        const r = db.prepare('INSERT INTO suppliers (name, gstin) VALUES (?, ?)').run(supplierName || 'Unknown Supplier', supplierGstin || null);
        supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(r.lastInsertRowid);
      }
      supplierId = supplier.id;
    }

    const id = crypto.randomUUID();
    const totalQty = (items || []).reduce((s, i) => s + (i.quantity || 0), 0);
    const invoiceTotal = parseFloat(totalAmount) || 0;

    dbTransaction(db, () => {
      db.prepare(`INSERT INTO purchases (id, supplier_id, supplier_name, supplier_gstin, invoice_no, invoice_date, total_amount, order_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'))`).run(
        id, supplierId, supplierName || null, supplierGstin || null, invoiceNo || null, invoiceDate || null, invoiceTotal
      );

      if (supplierId && invoiceTotal > 0) {
        db.prepare('UPDATE suppliers SET current_balance = COALESCE(current_balance, 0) + ? WHERE id = ?').run(invoiceTotal, supplierId);
        db.prepare(`INSERT INTO supplier_ledger (supplier_id, transaction_type, amount, reference_id, notes, created_at)
          VALUES (?, 'purchase', ?, ?, ?, datetime('now'))`).run(
          supplierId, invoiceTotal, invoiceNo || null, `Purchase invoice #${invoiceNo || id.slice(0, 8)}`
        );
      }
    });

    return { success: true, id, supplierId, totalQty };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchases:list', async () => {
  try {
    const db = getDb();
    // Purchases are derived from stock additions with batch info
    const purchases = db.prepare(`SELECT m.id, m.name as medicine_name, m.batch_number, m.company as supplier, 
      m.quantity, m.purchase_price, (m.quantity * COALESCE(m.purchase_price, 0)) as total_amount, 
      m.created_at as purchase_date, u.display_name as added_by_name
      FROM medicines m LEFT JOIN users u ON m.added_by = u.id 
      ORDER BY m.created_at DESC LIMIT 100`).all();
    return { success: true, purchases };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reports
ipcMain.handle('reports:stock', async () => {
  try {
    const db = getDb();
    const medicines = db.prepare(`SELECT m.*,
      CASE 
        WHEN m.expiry_date < date('now') THEN 'expired'
        WHEN julianday(m.expiry_date) - julianday('now') <= 90 THEN 'critical'
        WHEN julianday(m.expiry_date) - julianday('now') <= 180 THEN 'warning'
        ELSE 'safe'
      END as status,
      CASE WHEN m.expiry_date IS NOT NULL THEN julianday(m.expiry_date) - julianday('now') ELSE NULL END as days_remaining
      FROM medicines m ORDER BY m.name`).all();
    const stats = {
      uniqueMedicines: db.prepare('SELECT COUNT(DISTINCT name) as count FROM medicines').get().count,
      totalBatches: db.prepare('SELECT COUNT(*) as count FROM medicines').get().count,
      totalUnits: db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM medicines').get().total,
      totalValue: db.prepare('SELECT COALESCE(SUM(quantity * COALESCE(purchase_price, 0)), 0) as total FROM medicines').get().total,
    };
    stats.avgPricePerUnit = stats.totalUnits > 0 ? (stats.totalValue / stats.totalUnits).toFixed(2) : 0;
    return { success: true, medicines, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:expiry', async () => {
  try {
    const db = getDb();
    const all = db.prepare(`SELECT m.*,
      CASE 
        WHEN m.expiry_date < date('now') THEN 'expired'
        WHEN julianday(m.expiry_date) - julianday('now') <= 90 THEN 'critical'
        WHEN julianday(m.expiry_date) - julianday('now') <= 180 THEN 'warning'
        ELSE 'safe'
      END as status,
      CASE WHEN m.expiry_date IS NOT NULL THEN julianday(m.expiry_date) - julianday('now') ELSE NULL END as days_remaining
      FROM medicines m WHERE m.expiry_date IS NOT NULL ORDER BY m.expiry_date`).all();
    
    const categories = {
      expired: all.filter(m => m.status === 'expired'),
      critical: all.filter(m => m.status === 'critical'),
      warning: all.filter(m => m.status === 'warning'),
      safe: all.filter(m => m.status === 'safe'),
    };

    return { success: true, categories, total: all.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reports:sales', async () => {
  try {
    const db = getDb();
    const sales = db.prepare('SELECT * FROM sales ORDER BY sale_date DESC').all();
    const stats = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
      totalUnitsSold: sales.reduce((sum, s) => sum + (s.quantity || 0), 0),
    };
    stats.avgSaleValue = stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : 0;
    return { success: true, sales, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Dashboard
// Import History
ipcMain.handle('importHistory:list', async () => {
  try {
    const db = getDb();
    const imports = db.prepare('SELECT * FROM import_history ORDER BY created_at DESC').all();
    return { success: true, imports };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('importHistory:log', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('INSERT INTO import_history (file_name, total_rows, valid_rows, invalid_rows, errors, imported_by) VALUES (?, ?, ?, ?, ?, ?)').run(
      data.fileName, data.totalRows, data.validRows, data.invalidRows, data.errors, data.importedBy
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('importHistory:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM import_history WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('importHistory:clearAll', async () => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM import_history').run();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Supplier Analytics
ipcMain.handle('suppliers:getAnalytics', async () => {
  try {
    const db = getDb();
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
    const analytics = suppliers.map(s => {
      const medicines = db.prepare('SELECT COUNT(*) as count, SUM(quantity) as total_qty, COALESCE(SUM(quantity * purchase_price), 0) as total_value FROM medicines WHERE supplier_id = ?').get(s.id);
      const nearExpiry = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE supplier_id = ? AND expiry_date >= date('now') AND julianday(expiry_date) - julianday('now') <= 90").get(s.id);
      return {
        supplierId: s.id,
        supplierName: s.name,
        totalBatches: medicines.count,
        totalQuantity: medicines.total_qty || 0,
        totalStockValue: medicines.total_value || 0,
        nearExpiryCount: nearExpiry.count || 0,
      };
    });
    return { success: true, analytics };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:stats', async () => {
  try {
    const db = getDb();
    const stats = {
      totalMedicines: db.prepare('SELECT COUNT(DISTINCT name) as count FROM medicines').get().count,
      totalStock: db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM medicines').get().total,
      totalValue: db.prepare('SELECT COALESCE(SUM(quantity * COALESCE(purchase_price, 0)), 0) as total FROM medicines').get().total,
      expired: db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date < date('now')").get().count,
      critical: db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date >= date('now') AND julianday(expiry_date) - julianday('now') <= 90").get().count,
    };
    const medicines = db.prepare(`SELECT m.*,
      CASE 
        WHEN m.expiry_date < date('now') THEN 'expired'
        WHEN julianday(m.expiry_date) - julianday('now') <= 90 THEN 'critical'
        WHEN julianday(m.expiry_date) - julianday('now') <= 180 THEN 'warning'
        ELSE 'safe'
      END as status,
      CASE WHEN m.expiry_date IS NOT NULL THEN CAST(julianday(m.expiry_date) - julianday('now') AS INTEGER) ELSE NULL END as days_remaining
      FROM medicines m ORDER BY m.expiry_date ASC LIMIT 50`).all();
    return { success: true, stats, medicines };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Backup
function performBackup() {
  try {
    const db = getDb();
    const backupDir = app.getPath('documents');
    const fileName = `AnPharmacy_Backup_${new Date().toISOString().slice(0, 10)}.anpbackup`;
    const filePath = path.join(backupDir, 'exports', fileName);

    // Get all data
    const data = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        appId: 'com.anpharmacy.app',
      },
      tables: {
        medicines: db.prepare('SELECT * FROM medicines').all(),
        // purchases table removed - data is in medicines table
        sales: db.prepare('SELECT * FROM sales').all(),
        license_info: db.prepare('SELECT * FROM license_info').all(),
        audit_log: db.prepare('SELECT * FROM audit_log').all(),
        users: db.prepare('SELECT id, username, display_name, role, last_login, is_active FROM users').all(),
        company_profile: db.prepare('SELECT * FROM company_profile').all(),
      }
    };

    // Encrypt with AES-256
    const encryptionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const backupContent = JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      keyHex: encryptionKey.toString('hex'),
    });

    // HMAC for integrity
    const hmac = crypto.createHmac('sha256', encryptionKey).update(backupContent).digest('hex');
    const finalBackup = JSON.stringify({ content: backupContent, hmac });

    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, finalBackup, 'utf8');

    return { success: true, path: filePath, key: encryptionKey.toString('hex') };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

ipcMain.handle('backup:create', async () => {
  return performBackup();
});

ipcMain.handle('backup:restore', async (event, { filePath }) => {
  try {
    const db = getDb();
    const content = fs.readFileSync(filePath, 'utf8');
    const backup = JSON.parse(content);

    // Parse the backup structure
    const parsed = JSON.parse(backup.content);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(parsed.keyHex, 'hex'), Buffer.from(parsed.iv, 'hex'));
    let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const backupData = JSON.parse(decrypted);

    // Create safety backup of current data first
    const backupDir = app.getPath('documents');
    const safetyFileName = `PreRestore_Safety_${new Date().toISOString().slice(0, 10)}.anpbackup`;
    const safetyPath = path.join(backupDir, 'exports', safetyFileName);

    const currentData = {
      metadata: { timestamp: new Date().toISOString(), version: '1.0.0', appId: 'com.anpharmacy.app' },
      tables: {
        medicines: db.prepare('SELECT * FROM medicines').all(),
        sales: db.prepare('SELECT * FROM sales').all(),
        license_info: db.prepare('SELECT * FROM license_info').all(),
        audit_log: db.prepare('SELECT * FROM audit_log').all(),
        users: db.prepare('SELECT id, username, display_name, role, last_login, is_active FROM users').all(),
        company_profile: db.prepare('SELECT * FROM company_profile').all(),
      }
    };

    const safetyKey = crypto.randomBytes(32);
    const safetyIv = crypto.randomBytes(16);
    const safetyCipher = crypto.createCipheriv('aes-256-cbc', safetyKey, safetyIv);
    let safetyEncrypted = safetyCipher.update(JSON.stringify(currentData), 'utf8', 'hex');
    safetyEncrypted += safetyCipher.final('hex');

    const safetyBackupContent = JSON.stringify({ iv: safetyIv.toString('hex'), data: safetyEncrypted, keyHash: crypto.createHash('sha256').update(safetyKey.toString('hex')).digest('hex') });
    const safetyHmac = crypto.createHmac('sha256', safetyKey).update(safetyBackupContent).digest('hex');

    if (!fs.existsSync(path.dirname(safetyPath))) {
      fs.mkdirSync(path.dirname(safetyPath), { recursive: true });
    }
    fs.writeFileSync(safetyPath, JSON.stringify({ content: safetyBackupContent, hmac: safetyHmac }), 'utf8');

    // Now restore the backup data
    dbTransaction(db, () => {
      // Clear existing data
      db.prepare('DELETE FROM medicines').run();
      db.prepare('DELETE FROM sales').run();
      db.prepare('DELETE FROM audit_log').run();
      db.prepare('DELETE FROM license_info').run();
      db.prepare('DELETE FROM users').run();

      // Restore users
      const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, display_name, role, last_login, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const u of backupData.tables.users || []) {
        insertUser.run(u.id, u.username, u.password_hash || '', u.display_name, u.role, u.last_login, u.is_active);
      }

      // Restore medicines
      const insertMed = db.prepare('INSERT INTO medicines (id, name, batch_number, company, quantity, purchase_price, selling_price, mfg_date, expiry_date, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const m of backupData.tables.medicines || []) {
        insertMed.run(m.id, m.name, m.batch_number, m.company || null, m.quantity, m.purchase_price || null, m.selling_price || null, m.mfg_date || null, m.expiry_date || null, m.added_by || null, m.created_at || new Date().toISOString());
      }

      // Restore sales
      const insertSale = db.prepare('INSERT INTO sales (id, customer_name, medicine_name, quantity, total_amount, sale_date, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const s of backupData.tables.sales || []) {
        insertSale.run(s.id, s.customer_name || '', s.medicine_name || '', s.quantity || 0, s.total_amount || 0, s.sale_date, s.processed_by || null);
      }

      // Restore license
      const insertLicense = db.prepare('INSERT INTO license_info (license_key, hwid, expiry_date, status, last_heartbeat, activated_on) VALUES (?, ?, ?, ?, ?, ?)');
      for (const l of backupData.tables.license_info || []) {
        insertLicense.run(l.license_key, l.hwid, l.expiry_date, l.status, l.last_heartbeat, l.activated_on);
      }

      // Restore pharmacy / company profile
      const insertProfile = db.prepare('INSERT OR REPLACE INTO company_profile (id, store_name, tagline, phone, email, address, gstin, drug_license_no, owner_name, footer_note, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const p of backupData.tables.company_profile || []) {
        insertProfile.run(p.id || 1, p.store_name || 'AnPharmacy', p.tagline || null, p.phone || null, p.email || null, p.address || null, p.gstin || null, p.drug_license_no || null, p.owner_name || null, p.footer_note || null, p.updated_at || null);
      }

      // Log restore in audit trail
      db.prepare("INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (1, 'restore', ?, datetime('now'))").run(`Data restored from: ${filePath}. Safety backup: ${safetyPath}`);
    });

    return {
      success: true,
      message: 'Restore completed successfully!',
      safetyBackup: safetyPath,
    };
  } catch (error) {
    return { success: false, error: error.message || 'Failed to restore backup' };
  }
});

ipcMain.handle('backup:list', async () => {
  try {
    const backupDir = path.join(app.getPath('documents'), 'exports');
    if (!fs.existsSync(backupDir)) {
      return { success: true, backups: [] };
    }
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.anpbackup'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { name: f, path: path.join(backupDir, f), size: stat.size, created: stat.birthtime };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    return { success: true, backups: files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto-Backup Settings
ipcMain.handle('backup:getAutoBackupSettings', async () => {
  return { success: true, settings: loadAutoBackupSettings() };
});

ipcMain.handle('backup:setAutoBackupSettings', async (event, newSettings) => {
  try {
    const settings = { enabled: false, intervalHours: 24, lastBackup: null, ...newSettings };
    saveAutoBackupSettings(settings);
    startAutoBackupScheduler();
    return { success: true, settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:autoCreate', async () => {
  try {
    if (!db) return { success: false, error: 'Database not initialized' };
    const result = performAutoBackup();
    if (result.success) {
      const settings = loadAutoBackupSettings();
      settings.lastBackup = new Date().toISOString();
      saveAutoBackupSettings(settings);
    }
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Pharmacy / Company Profile =====
ipcMain.handle('company:getProfile', async () => {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM company_profile WHERE id = 1').get();
    return { success: true, profile: profile || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('company:saveProfile', async (event, profile) => {
  try {
    const db = getDb();
    db.prepare(`INSERT INTO company_profile (id, store_name, tagline, phone, email, address, gstin, drug_license_no, owner_name, footer_note, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        store_name = excluded.store_name,
        tagline = excluded.tagline,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        gstin = excluded.gstin,
        drug_license_no = excluded.drug_license_no,
        owner_name = excluded.owner_name,
        footer_note = excluded.footer_note,
        updated_at = datetime('now')`).run(
      profile.store_name || 'AnPharmacy',
      profile.tagline || null,
      profile.phone || null,
      profile.email || null,
      profile.address || null,
      profile.gstin || null,
      profile.drug_license_no || null,
      profile.owner_name || null,
      profile.footer_note || null
    );
    const saved = db.prepare('SELECT * FROM company_profile WHERE id = 1').get();
    return { success: true, profile: saved };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Dialog
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Backup Files', extensions: ['anpbackup'] }],
  });
  if (result.canceled) return { canceled: true };
  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `AnPharmacy_Backup_${new Date().toISOString().slice(0, 10)}.anpbackup`,
    filters: [{ name: 'Backup Files', extensions: ['anpbackup'] }],
  });
  if (result.canceled) return { canceled: true };
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('dialog:openImage', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp'] },
    ],
  });
  if (result.canceled) return { canceled: true };
  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle('dialog:openPdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
    ],
  });
  if (result.canceled) return { canceled: true };
  return { canceled: false, filePath: result.filePaths[0] };
});

// Error logging
ipcMain.handle('app:logError', async (event, { message, stack, componentStack }) => {
  try {
    const db = getDb();
    db.prepare("INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime('now'))").run(
      0, // System user
      'error',
      `Component Error: ${message}${stack ? `\nStack: ${stack}` : ''}${componentStack ? `\nComponent: ${componentStack}` : ''}`
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to log error:', error);
    return { success: false };
  }
});

// ===== Manufacturers =====
ipcMain.handle('manufacturers:list', async () => {
  try {
    const db = getDb();
    const manufacturers = db.prepare('SELECT * FROM manufacturers ORDER BY name ASC').all();
    return { success: true, manufacturers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manufacturers:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO manufacturers (name, contact_person, phone, email, address, gstin, license_number, rating, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      data.name, data.contact_person || null, data.phone || null, data.email || null, data.address || null, data.gstin || null, data.license_number || null, data.rating || 0, data.notes || null
    );
    const manufacturer = db.prepare('SELECT * FROM manufacturers WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, manufacturer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manufacturers:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE manufacturers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, gstin = ?, license_number = ?, rating = ?, notes = ? WHERE id = ?').run(
      data.name, data.contact_person || null, data.phone || null, data.email || null, data.address || null, data.gstin || null, data.license_number || null, data.rating || 0, data.notes || null, data.id
    );
    const manufacturer = db.prepare('SELECT * FROM manufacturers WHERE id = ?').get(data.id);
    return { success: true, manufacturer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manufacturers:delete', async (event, { id }) => {
  try {
    const db = getDb();
    const medicineCount = db.prepare('SELECT COUNT(*) as count FROM generic_medicines WHERE manufacturer_id = ?').get(id).count;
    if (medicineCount > 0) {
      return { success: false, error: `Cannot delete manufacturer. ${medicineCount} generic medicine(s) are linked.` };
    }
    db.prepare('DELETE FROM manufacturers WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Generic Medicines =====
ipcMain.handle('generic:list', async () => {
  try {
    const db = getDb();
    const generics = db.prepare(`SELECT gm.*, m.name as manufacturer_name 
      FROM generic_medicines gm 
      LEFT JOIN manufacturers m ON gm.manufacturer_id = m.id 
      ORDER BY gm.generic_name`).all();
    return { success: true, generics };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('generic:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO generic_medicines (generic_name, brand_name, manufacturer_id, category, description) VALUES (?, ?, ?, ?, ?)').run(
      data.generic_name, data.brand_name, data.manufacturer_id || null, data.category || null, data.description || null
    );
    const generic = db.prepare('SELECT * FROM generic_medicines WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, generic };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('generic:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE generic_medicines SET generic_name = ?, brand_name = ?, manufacturer_id = ?, category = ?, description = ? WHERE id = ?').run(
      data.generic_name, data.brand_name, data.manufacturer_id || null, data.category || null, data.description || null, data.id
    );
    const generic = db.prepare('SELECT * FROM generic_medicines WHERE id = ?').get(data.id);
    return { success: true, generic };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('generic:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM generic_medicines WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Customers =====
ipcMain.handle('customers:list', async () => {
  try {
    const db = getDb();
    const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    return { success: true, customers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO customers (name, phone, email, address, gstin, credit_limit, current_balance, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      data.name, data.phone || null, data.email || null, data.address || null, data.gstin || null, data.credit_limit || 0, data.current_balance || 0, data.type || 'retail'
    );
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, customer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, gstin = ?, credit_limit = ?, current_balance = ?, type = ? WHERE id = ?').run(
      data.name, data.phone || null, data.email || null, data.address || null, data.gstin || null, data.credit_limit || 0, data.current_balance || 0, data.type || 'retail', data.id
    );
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(data.id);
    return { success: true, customer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:delete', async (event, { id }) => {
  try {
    const db = getDb();
    const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM customer_ledger WHERE customer_id = ?').get(id).count;
    if (ledgerCount > 0) {
      return { success: false, error: `Cannot delete customer. ${ledgerCount} ledger entries exist.` };
    }
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:getLedger', async (event, { customerId }) => {
  try {
    const db = getDb();
    const ledger = db.prepare('SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY created_at DESC').all(customerId);
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    return { success: true, ledger, customer };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:addLedger', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('INSERT INTO customer_ledger (customer_id, transaction_type, amount, payment_method, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?)').run(
      data.customer_id, data.transaction_type, data.amount, data.payment_method || null, data.reference_id || null, data.notes || null
    );
    if (data.transaction_type === 'payment') {
      db.prepare('UPDATE customers SET current_balance = current_balance - ? WHERE id = ?').run(data.amount, data.customer_id);
    } else {
      db.prepare('UPDATE customers SET current_balance = current_balance + ? WHERE id = ?').run(data.amount, data.customer_id);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Payables: total owed per supplier from recorded purchases.
// ponytail: no supplier payment ledger yet; outstanding = unpaid purchase totals. Add payment recording to age it like receivables.
ipcMain.handle('reports:payables', async () => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT supplier_id, supplier_name, invoice_no, invoice_date, total_amount
      FROM purchases ORDER BY supplier_id, invoice_date`).all();
    const bySupplier = {};
    for (const r of rows) {
      const key = r.supplier_id || r.supplier_name;
      if (!bySupplier[key]) {
        bySupplier[key] = { supplier_name: r.supplier_name || 'Unknown', outstanding: 0, bills: 0 };
      }
      bySupplier[key].outstanding += r.total_amount || 0;
      bySupplier[key].bills += 1;
    }
    const suppliers = Object.values(bySupplier).sort((a, b) => b.outstanding - a.outstanding);
    const totalPayable = suppliers.reduce((s, c) => s + c.outstanding, 0);
    return { success: true, suppliers, totalPayable, count: rows.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Receivables aging: FIFO-allocate customer payments against their credit sales, bucket by age.
// ponytail: FIFO allocation; upgrade to per-invoice allocation if statement matching matters.
ipcMain.handle('reports:receivables', async () => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT s.customer_id, c.name AS customer_name, c.phone, s.sale_date, s.bill_number,
             s.net_payable AS amount, s.payment_mode
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.customer_id IS NOT NULL AND s.net_payable > 0
      ORDER BY s.customer_id, s.sale_date`).all();

    const payments = db.prepare(`
      SELECT customer_id, SUM(amount) AS paid
      FROM customer_ledger WHERE transaction_type = 'payment'
      GROUP BY customer_id`).all();

    const paidBy = {};
    for (const p of payments) paidBy[p.customer_id] = p.paid;

    const buckets = { current: 0, d30: 0, d60: 0, d90plus: 0 };
    const customers = {};
    const today = new Date();

    // Receivables are only the credit-mode sales; cash sales were settled instantly.
    const creditSales = rows.filter(r => r.payment_mode === 'credit' || r.payment_mode === 'credit_ledger');
    const salesByCust = {};
    for (const s of creditSales) {
      if (!salesByCust[s.customer_id]) salesByCust[s.customer_id] = [];
      salesByCust[s.customer_id].push(s);
    }

    for (const cid of Object.keys(salesByCust)) {
      let paidRemaining = paidBy[cid] || 0;
      const cust = salesByCust[cid][0];
      const entries = [];
      // ponytail: FIFO — oldest sale gets paid off first
      for (const s of salesByCust[cid]) {
        const due = s.amount;
        const applied = Math.min(due, paidRemaining);
        const outstanding = due - applied;
        paidRemaining -= applied;
        if (outstanding > 0) {
          const ageDays = Math.max(0, Math.floor((today - new Date(s.sale_date + 'T00:00:00')) / 86400000));
          const bucket = ageDays > 90 ? 'd90plus' : ageDays > 60 ? 'd60' : ageDays > 30 ? 'd30' : 'current';
          buckets[bucket] += outstanding;
          entries.push({ sale_date: s.sale_date, bill_number: s.bill_number, amount: s.amount, outstanding, age_days: ageDays });
        }
      }
      if (entries.length) {
        customers[cid] = {
          customer_id: cid, customer_name: cust.customer_name, phone: cust.phone,
          outstanding: entries.reduce((s, e) => s + e.outstanding, 0),
          sales: entries,
        };
      }
    }

    const totalOutstanding = Object.values(customers).reduce((s, c) => s + c.outstanding, 0);
    return {
      success: true,
      customers: Object.values(customers).sort((a, b) => b.outstanding - a.outstanding),
      buckets,
      totalOutstanding,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// GSTR-1 style summary: per month, B2B (customer has GSTIN) vs B2C split + tax totals.
// ponytail: derived from sales; GSTR-2B (purchase side) needs recorded purchases which don't exist yet (see F4/F8).
ipcMain.handle('reports:gst1', async (event, { month } = {}) => {
  try {
    const db = getDb();
    // month like "2026-07"; default to current
    const m = month || new Date().toISOString().slice(0, 7);
    const rows = db.prepare(`
      SELECT sale_date, customer_gstin, taxable_amount, cgst_amount, sgst_amount, igst_amount
      FROM sales WHERE sale_date LIKE ?`).all(m + '%');

    const summary = { month: m, count: rows.length, b2b: 0, b2c: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    for (const r of rows) {
      const isB2B = !!(r.customer_gstin && r.customer_gstin.trim());
      if (isB2B) summary.b2b++; else summary.b2c++;
      summary.taxable += r.taxable_amount || 0;
      summary.cgst += r.cgst_amount || 0;
      summary.sgst += r.sgst_amount || 0;
      summary.igst += r.igst_amount || 0;
    }
    return { success: true, summary };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Purchase Returns =====
ipcMain.handle('purchaseReturns:list', async () => {
  try {
    const db = getDb();
    const returns = db.prepare(`SELECT pr.*, s.name as supplier_name, u.display_name as returned_by_name 
      FROM purchase_returns pr 
      LEFT JOIN suppliers s ON pr.supplier_id = s.id 
      LEFT JOIN users u ON pr.returned_by = u.id 
      ORDER BY pr.created_at DESC`).all();
    return { success: true, returns };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purchaseReturns:create', async (event, data) => {
  try {
    const db = getDb();
    const returnId = crypto.randomUUID();
    db.prepare('INSERT INTO purchase_returns (id, supplier_id, medicine_id, batch_number, expiry_date, quantity, reason, refund_amount, status, returned_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      returnId, data.supplier_id, data.medicine_id, data.batch_number || null, data.expiry_date || null, data.quantity, data.reason || null, data.refund_amount || 0, 'raised', data.returned_by
    );
    // ponytail: goods leave the shelf when returned to the supplier (decrement). Was + (copied from sales-returns) = bug.
    db.prepare('UPDATE medicines SET quantity = quantity - ? WHERE id = ? AND quantity >= ?').run(data.quantity, data.medicine_id, data.quantity);
    return { success: true, id: returnId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Status workflow: raised -> dispatched -> credited | rejected. Rejected restores stock.
ipcMain.handle('purchaseReturns:updateStatus', async (event, { id, status, rejectReason }) => {
  try {
    const db = getDb();
    const ret = db.prepare('SELECT * FROM purchase_returns WHERE id = ?').get(id);
    if (!ret) return { success: false, error: 'Return not found' };
    if (status === 'dispatched') {
      db.prepare(`UPDATE purchase_returns SET status = ?, dispatch_date = datetime('now') WHERE id = ?`).run(status, id);
    } else if (status === 'credited') {
      db.prepare(`UPDATE purchase_returns SET status = ?, credit_date = datetime('now') WHERE id = ?`).run(status, id);
    } else if (status === 'rejected') {
      db.prepare(`UPDATE purchase_returns SET status = ?, reject_reason = ? WHERE id = ?`).run(status, rejectReason || null, id);
      // supplier won't take it back; stock comes back onto the shelf
      db.prepare('UPDATE medicines SET quantity = quantity + ? WHERE id = ?').run(ret.quantity, ret.medicine_id);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Sales Returns =====
ipcMain.handle('salesReturns:list', async () => {
  try {
    const db = getDb();
    const returns = db.prepare(`SELECT sr.*, c.name as customer_name, u.display_name as processed_by_name 
      FROM sales_returns sr 
      LEFT JOIN customers c ON sr.customer_id = c.id 
      LEFT JOIN users u ON sr.processed_by = u.id 
      ORDER BY sr.created_at DESC`).all();
    return { success: true, returns };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('salesReturns:create', async (event, data) => {
  try {
    const db = getDb();
    const returnId = crypto.randomUUID();
    db.prepare('INSERT INTO sales_returns (id, sale_id, customer_id, medicine_name, quantity, refund_amount, reason, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      returnId, data.sale_id, data.customer_id, data.medicine_name, data.quantity, data.refund_amount || 0, data.reason || null, data.processed_by
    );
    // Restore stock (simple logic - find medicine by name)
    const medicine = db.prepare(`SELECT id FROM medicines WHERE name = ? ORDER BY expiry_date DESC LIMIT 1`).get(data.medicine_name);
    if (medicine) {
      db.prepare('UPDATE medicines SET quantity = quantity + ? WHERE id = ?').run(data.quantity, medicine.id);
    }
    return { success: true, id: returnId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Warehouses =====
ipcMain.handle('warehouses:list', async () => {
  try {
    const db = getDb();
    const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY name ASC').all();
    return { success: true, warehouses };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('warehouses:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO warehouses (name, location, manager_name, phone, email, capacity) VALUES (?, ?, ?, ?, ?, ?)').run(
      data.name, data.location || null, data.manager_name || null, data.phone || null, data.email || null, data.capacity || null
    );
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, warehouse };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('warehouses:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE warehouses SET name = ?, location = ?, manager_name = ?, phone = ?, email = ?, capacity = ? WHERE id = ?').run(
      data.name, data.location || null, data.manager_name || null, data.phone || null, data.email || null, data.capacity || null, data.id
    );
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(data.id);
    return { success: true, warehouse };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('warehouses:delete', async (event, { id }) => {
  try {
    const db = getDb();
    const transferCount = db.prepare(`SELECT COUNT(*) as count FROM stock_transfers WHERE from_warehouse_id = ? OR to_warehouse_id = ?`).get(id, id).count;
    if (transferCount > 0) {
      return { success: false, error: `Cannot delete warehouse. ${transferCount} transfer(s) exist.` };
    }
    db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Stock Transfers =====
ipcMain.handle('stockTransfers:list', async () => {
  try {
    const db = getDb();
    const transfers = db.prepare(`SELECT st.*, 
      fw.name as from_warehouse, tw.name as to_warehouse,
      m.name as medicine_name,
      u1.display_name as transferred_by_name, u2.display_name as received_by_name
      FROM stock_transfers st
      LEFT JOIN warehouses fw ON st.from_warehouse_id = fw.id
      LEFT JOIN warehouses tw ON st.to_warehouse_id = tw.id
      LEFT JOIN medicines m ON st.medicine_id = m.id
      LEFT JOIN users u1 ON st.transferred_by = u1.id
      LEFT JOIN users u2 ON st.received_by = u2.id
      ORDER BY st.created_at DESC`).all();
    return { success: true, transfers };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stockTransfers:create', async (event, data) => {
  try {
    const db = getDb();
    const transferId = crypto.randomUUID();
    db.prepare('INSERT INTO stock_transfers (id, from_warehouse_id, to_warehouse_id, medicine_id, quantity, notes, transferred_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      transferId, data.from_warehouse_id, data.to_warehouse_id, data.medicine_id, data.quantity, data.notes || null, data.transferred_by
    );
    return { success: true, id: transferId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stockTransfers:receive', async (event, { id, received_by }) => {
  try {
    const db = getDb();
    const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(id);
    if (!transfer) return { success: false, error: 'Transfer not found' };
    
    db.prepare('UPDATE stock_transfers SET status = ?, received_by = ? WHERE id = ?').run('completed', received_by, id);
    db.prepare('UPDATE warehouses SET current_stock = current_stock + ? WHERE id = ?').run(transfer.quantity, transfer.to_warehouse_id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Expenses =====
ipcMain.handle('expenses:list', async () => {
  try {
    const db = getDb();
    const expenses = db.prepare(`SELECT e.*, u.display_name as created_by_name 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      ORDER BY e.created_at DESC`).all();
    return { success: true, expenses };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO expenses (category, amount, description, payment_method, receipt_path, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(
      data.category, data.amount, data.description || null, data.payment_method || null, data.receipt_path || null, data.created_by
    );
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, expense };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE expenses SET category = ?, amount = ?, description = ?, payment_method = ?, receipt_path = ? WHERE id = ?').run(
      data.category, data.amount, data.description || null, data.payment_method || null, data.receipt_path || null, data.id
    );
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(data.id);
    return { success: true, expense };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('expenses:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Price Management =====
ipcMain.handle('priceRules:list', async () => {
  try {
    const db = getDb();
    const rules = db.prepare(`SELECT pr.*, m.name as medicine_name 
      FROM price_rules pr 
      LEFT JOIN medicines m ON pr.medicine_id = m.id 
      ORDER BY pr.created_at DESC`).all();
    return { success: true, rules };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('priceRules:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO price_rules (medicine_id, rule_type, discount_percentage, discount_amount, min_quantity, max_quantity, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      data.medicine_id, data.rule_type, data.discount_percentage || null, data.discount_amount || null, data.min_quantity || null, data.max_quantity || null, data.start_date || null, data.end_date || null
    );
    const rule = db.prepare('SELECT * FROM price_rules WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, rule };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('priceRules:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM price_rules WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Discount Management =====
ipcMain.handle('discountSchemes:list', async () => {
  try {
    const db = getDb();
    const schemes = db.prepare('SELECT * FROM discount_schemes ORDER BY created_at DESC').all();
    return { success: true, schemes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('discountSchemes:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO discount_schemes (name, description, discount_type, discount_value, min_purchase_amount, applicable_to, start_date, end_date, requires_approval) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      data.name, data.description || null, data.discount_type, data.discount_value, data.min_purchase_amount || null, data.applicable_to || null, data.start_date || null, data.end_date || null, data.requires_approval ? 1 : 0
    );
    const scheme = db.prepare('SELECT * FROM discount_schemes WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, scheme };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('discountSchemes:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE discount_schemes SET name = ?, description = ?, discount_type = ?, discount_value = ?, min_purchase_amount = ?, applicable_to = ?, start_date = ?, end_date = ?, requires_approval = ?, is_active = ? WHERE id = ?').run(
      data.name, data.description || null, data.discount_type, data.discount_value, data.min_purchase_amount || null, data.applicable_to || null, data.start_date || null, data.end_date || null, data.requires_approval ? 1 : 0, data.is_active ? 1 : 0, data.id
    );
    const scheme = db.prepare('SELECT * FROM discount_schemes WHERE id = ?').get(data.id);
    return { success: true, scheme };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('discountSchemes:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM discount_schemes WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== GST & HSN =====
ipcMain.handle('hsn:list', async () => {
  try {
    const db = getDb();
    const hsnCodes = db.prepare('SELECT * FROM hsn_codes ORDER BY hsn_code ASC').all();
    return { success: true, hsnCodes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hsn:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO hsn_codes (hsn_code, description, gst_rate, cess_rate) VALUES (?, ?, ?, ?)').run(
      data.hsn_code, data.description || null, data.gst_rate, data.cess_rate || 0
    );
    const hsn = db.prepare('SELECT * FROM hsn_codes WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, hsn };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hsn:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE hsn_codes SET hsn_code = ?, description = ?, gst_rate = ?, cess_rate = ? WHERE id = ?').run(
      data.hsn_code, data.description || null, data.gst_rate, data.cess_rate || 0, data.id
    );
    const hsn = db.prepare('SELECT * FROM hsn_codes WHERE id = ?').get(data.id);
    return { success: true, hsn };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hsn:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM hsn_codes WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('medicineHSN:assign', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('INSERT OR REPLACE INTO medicine_hsn (medicine_id, hsn_id) VALUES (?, ?)').run(data.medicine_id, data.hsn_id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('medicineHSN:get', async (event, { medicineId }) => {
  try {
    const db = getDb();
    const hsn = db.prepare(`SELECT hsn_codes.* FROM medicine_hsn 
      LEFT JOIN hsn_codes ON medicine_hsn.hsn_id = hsn_codes.id 
      WHERE medicine_hsn.medicine_id = ?`).get(medicineId);
    return { success: true, hsn };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Notifications =====
ipcMain.handle('notifications:list', async (event, { userId }) => {
  try {
    const db = getDb();
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50').all(userId);
    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notifications:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO notifications (user_id, title, message, type, action_url) VALUES (?, ?, ?, ?, ?)').run(
      data.user_id || null, data.title, data.message, data.type || 'info', data.action_url || null
    );
    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, notification };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notifications:markRead', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('notifications:markAllRead', async (event, { userId }) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Reminders =====
ipcMain.handle('reminders:list', async () => {
  try {
    const db = getDb();
    const reminders = db.prepare(`SELECT r.*, u.display_name as created_by_name 
      FROM reminders r 
      LEFT JOIN users u ON r.created_by = u.id 
      ORDER BY r.reminder_date ASC`).all();
    return { success: true, reminders };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:create', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO reminders (title, description, reminder_type, reminder_date, is_recurring, recurrence_pattern, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      data.title, data.description || null, data.reminder_type, data.reminder_date, data.is_recurring ? 1 : 0, data.recurrence_pattern || null, data.created_by
    );
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, reminder };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:update', async (event, data) => {
  try {
    const db = getDb();
    db.prepare('UPDATE reminders SET title = ?, description = ?, reminder_date = ?, is_recurring = ?, recurrence_pattern = ?, is_completed = ? WHERE id = ?').run(
      data.title, data.description || null, data.reminder_date, data.is_recurring ? 1 : 0, data.recurrence_pattern || null, data.is_completed ? 1 : 0, data.id
    );
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(data.id);
    return { success: true, reminder };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Documents =====
ipcMain.handle('documents:list', async () => {
  try {
    const db = getDb();
    const documents = db.prepare(`SELECT d.*, u.display_name as uploaded_by_name 
      FROM documents d 
      LEFT JOIN users u ON d.uploaded_by = u.id 
      ORDER BY d.created_at DESC`).all();
    return { success: true, documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:upload', async (event, data) => {
  try {
    const db = getDb();
    const result = db.prepare('INSERT INTO documents (title, description, file_path, file_type, file_size, category, tags, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      data.title, data.description || null, data.file_path, data.file_type || null, data.file_size || null, data.category || null, data.tags || null, data.uploaded_by
    );
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    return { success: true, document };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('documents:delete', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== AI Insights =====
ipcMain.handle('ai:getInsights', async () => {
  try {
    const db = getDb();
    const insights = db.prepare('SELECT * FROM ai_insights WHERE is_actioned = 0 ORDER BY created_at DESC LIMIT 20').all();
    
    // Generate basic insights based on data
    const expiredCount = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date < date('now')").get().count;
    const criticalCount = db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date >= date('now') AND julianday(expiry_date) - julianday('now') <= 90").get().count;
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE quantity < 10').get().count;
    
    const newInsights = [];
    if (expiredCount > 0) {
      newInsights.push({
        insight_type: 'alert',
        title: 'Expired Medicines Detected',
        description: `${expiredCount} medicine(s) have expired. Immediate action required.`,
        confidence_score: 1.0,
        recommended_action: 'Remove expired stock and investigate cause'
      });
    }
    if (criticalCount > 0) {
      newInsights.push({
        insight_type: 'warning',
        title: 'Near Expiry Alert',
        description: `${criticalCount} medicine(s) will expire within 90 days.`,
        confidence_score: 0.95,
        recommended_action: 'Plan promotions or returns for near-expiry stock'
      });
    }
    if (lowStock > 0) {
      newInsights.push({
        insight_type: 'info',
        title: 'Low Stock Warning',
        description: `${lowStock} medicine(s) have critically low stock (< 10 units).`,
        confidence_score: 0.9,
        recommended_action: 'Reorder low stock items from suppliers'
      });
    }
    
    // Save new insights
    for (const insight of newInsights) {
      const existing = db.prepare('SELECT id FROM ai_insights WHERE title = ? AND is_actioned = 0').get(insight.title);
      if (!existing) {
        db.prepare('INSERT INTO ai_insights (insight_type, title, description, confidence_score, recommended_action) VALUES (?, ?, ?, ?, ?)').run(
          insight.insight_type, insight.title, insight.description, insight.confidence_score, insight.recommended_action
        );
      }
    }
    
    const allInsights = db.prepare('SELECT * FROM ai_insights WHERE is_actioned = 0 ORDER BY created_at DESC LIMIT 20').all();
    return { success: true, insights: allInsights };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:markInsightActioned', async (event, { id }) => {
  try {
    const db = getDb();
    db.prepare('UPDATE ai_insights SET is_actioned = 1 WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ai:generateReport', async (event, { reportType }) => {
  try {
    const db = getDb();
    let report = '';
    let title = '';
    
    if (reportType === 'stock') {
      const stats = {
        total: db.prepare('SELECT COUNT(*) as count FROM medicines').get().count,
        expired: db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date < date('now')").get().count,
        critical: db.prepare("SELECT COUNT(*) as count FROM medicines WHERE expiry_date >= date('now') AND julianday(expiry_date) - julianday('now') <= 90").get().count,
      };
      title = 'AI Stock Analysis Report';
      report = `Total Medicines: ${stats.total}\nExpired: ${stats.expired}\nCritical (90 days): ${stats.critical}\n\nRecommendations:\n`;
      if (stats.expired > 0) report += '- Remove expired stock immediately\n';
      if (stats.critical > 0) report += '- Plan promotions for near-expiry items\n';
      report += '- Maintain minimum stock levels for fast-moving items\n';
    } else if (reportType === 'sales') {
      const salesStats = db.prepare("SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM sales WHERE sale_date >= date('now', '-30 days')").get();
      title = 'AI Sales Analysis Report';
      report = `Last 30 Days Sales Report\n\nTotal Sales: ${salesStats.count}\nRevenue: ${formatCurrency(salesStats.revenue || 0)}\n\nInsights:\n`;
      report += '- Top selling categories identified\n';
      report += '- Customer purchase patterns analyzed\n';
    }
    
    return { success: true, title, report };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Shell =====
ipcMain.handle('shell:openExternal', async (event, url) => {
  try {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Audit =====
ipcMain.handle('audit:log', async (event, { userId, action, details }) => {
  try {
    const db = getDb();
    db.prepare('INSERT INTO audit_log (user_id, action, details, timestamp) VALUES (?, ?, ?, datetime(\'now\'))').run(
      userId, action, typeof details === 'string' ? details : JSON.stringify(details)
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Helper Functions =====

function getHWID() {
  const parts = [
    process.env.COMPUTERNAME || 'UNKNOWN',
    process.env.PROCESSOR_IDENTIFIER || 'UNKNOWN',
    process.env.PROCESSOR_LEVEL || 'UNKNOWN',
    osInfo(),
  ];
  return crypto.createHash('sha256').update(parts.join('-')).digest('hex').substring(0, 32).toUpperCase();
}

function osInfo() {
  try {
    const os = require('os');
    return `${os.totalmem()}-${os.cpus().length}-${os.arch()}`;
  } catch {
    return 'UNKNOWN';
  }
}

function decodeLicenseKey(key, hwid) {
  // Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
  const parts = key.split('-');
  if (parts.length !== 5) return { valid: false };
  
  // Simple validation: check if key has valid format
  for (const part of parts) {
    if (part.length !== 5 || !/^[A-Z0-9]+$/.test(part)) return { valid: false };
  }

  // Generate expiry date from license key (1 year from activation)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  return { valid: true, expiryDate: expiryDate.toISOString().split('T')[0] };
}

// ===== App Lifecycle =====

// ponytail: single-instance lock — double-launch focuses the existing window
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    createAppMenu();
    initializeAutoBackup();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) saveWindowState(mainWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
