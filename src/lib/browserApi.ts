/**
 * Browser-compatible API layer that mimics the Electron IPC handlers.
 * Uses localStorage for data persistence.
 * This allows the application to run fully in the browser without Electron.
 */

// ── In-memory cache to avoid synchronous localStorage reads/writes on every call ──
// This is the single biggest performance optimization for the browser API layer.
// Instead of JSON.parse/stringify on every single operation, we cache in memory.
const __storeCache = new Map<string, any>();
const __pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

function getStore<T>(key: string, fallback: T): T {
  const cacheKey = `anpharm_${key}`;
  // Return from cache first — avoids expensive JSON.parse on every call
  if (__storeCache.has(cacheKey)) {
    return __storeCache.get(cacheKey) as T;
  }
  try {
    const raw = localStorage.getItem(cacheKey);
    const data = raw ? JSON.parse(raw) : fallback;
    __storeCache.set(cacheKey, data);
    return data;
  } catch { 
    __storeCache.set(cacheKey, fallback);
    return fallback; 
  }
}

function setStore<T>(key: string, data: T): void {
  const cacheKey = `anpharm_${key}`;
  // Update cache immediately (synchronous, fast)
  __storeCache.set(cacheKey, data);
  // Debounce actual localStorage write (async — won't block the event loop)
  if (__pendingWrites.has(cacheKey)) {
    clearTimeout(__pendingWrites.get(cacheKey)!);
  }
  __pendingWrites.set(cacheKey, setTimeout(() => {
    try { 
      localStorage.setItem(cacheKey, JSON.stringify(data)); 
    } catch {}
    __pendingWrites.delete(cacheKey);
  }, 50));
}

// Force-flush all pending writes (call before page unload if needed)
function flushStore(): void {
  for (const [key, timer] of __pendingWrites) {
    clearTimeout(timer);
    try {
      const data = __storeCache.get(key);
      if (data !== undefined) localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }
  __pendingWrites.clear();
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function now(): string { return new Date().toISOString(); }
function today(): string { return new Date().toISOString().slice(0, 10); }

function nextId(items: any[]): number {
  return items.length > 0 ? Math.max(...items.map((i: any) => i.id || 0)) + 1 : 1;
}

// SHA-256 hash for passwords (browser crypto)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStatus(medicine: any): string {
  if (!medicine.expiry_date) return 'safe';
  const days = (new Date(medicine.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days <= 90) return 'critical';
  if (days <= 180) return 'warning';
  return 'safe';
}

function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  return Math.round((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function enrichMedicine(m: any) {
  return { ...m, status: getStatus(m), days_remaining: getDaysRemaining(m.expiry_date || null) };
}

const SEED_VERSION = 4; // Increment when seed data changes to force re-seed

// ====== SEED DATA ======
function seedIfEmpty(): void {
  const seedVersion = parseInt(localStorage.getItem('anpharm_seed_version') || '0', 10);
  if (seedVersion >= SEED_VERSION) {
    const users = getStore<any[]>('users', []);
    if (users.length > 0) return;
  }
  // Clear old data if version mismatch
  if (seedVersion < SEED_VERSION) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('anpharm_'));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // Seed users
  const seedUsers = [
    { id: 1, username: 'admin', password_hash: '7676aaafb027c825bd9abab78b234070e702752f625b752e55e55b48e607e358', display_name: 'Administrator', role: 'admin', last_login: null, is_active: 1 },
    { id: 2, username: 'sales', password_hash: 'a848873ca73d8112fd47d499be38eeb0ec99d352f44157bf53f1ed15e3d40ebb', display_name: 'Sales Representative', role: 'sales', last_login: null, is_active: 1 },
    { id: 3, username: 'purchase', password_hash: '25a4a288ed14e322276f32a8a7ce808dc927992d3c19e39f412d9135a45784e9', display_name: 'Purchase Manager', role: 'purchase_mgr', last_login: null, is_active: 1 },
  ];
  setStore('users', seedUsers);

  // Seed suppliers
  const seedSuppliers = [
    { id: 1, name: 'ABC Pharma Pvt Ltd', contact_person: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'info@abcpharma.com', address: 'Mumbai, Maharashtra', gstin: '27AABCU1234D1Z1', notes: 'Primary supplier - antibiotics', created_at: now() },
    { id: 2, name: 'XYZ Labs Ltd', contact_person: 'Priya Sharma', phone: '+91 98765 43211', email: 'orders@xyzlabs.com', address: 'Hyderabad, Telangana', gstin: '36XYZL5678E1Z1', notes: 'Secondary supplier - generics', created_at: now() },
    { id: 3, name: 'MediCorp Distributors', contact_person: 'Suresh Reddy', phone: '+91 98765 43212', email: 'info@medicorp.in', address: 'Bangalore, Karnataka', gstin: '29MEDC9012F1Z1', notes: 'Surgical supplies & equipment', created_at: now() },
    { id: 4, name: 'PharmaGood Ltd', contact_person: 'Anita Desai', phone: '+91 98765 43213', email: 'sales@pharmagood.com', address: 'Delhi, India', gstin: '07PHG3456G1Z1', notes: 'Schedule H drugs', created_at: now() },
    { id: 5, name: 'HealthFirst Distributors', contact_person: 'Vikram Patel', phone: '+91 98765 43214', email: 'info@healthfirst.in', address: 'Chennai, Tamil Nadu', gstin: '33HFS7890H1Z1', notes: 'Fast-moving OTC products', created_at: now() },
  ];
  setStore('suppliers', seedSuppliers);

  // Seed medicines
  const seedMedicines = [
    { id: 1, name: 'Paracetamol 500mg', strength: '500mg', batch_number: 'BATCH-001', pack_size: '10 Tab', company: 'ABC Pharma', quantity: 500, mrp: 25.00, purchase_price: 12.50, ptr: 18.00, selling_price: 22.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'General', barcode: 'MED001ABC', rack_location: 'A1-Row1', low_stock_alert: 50, min_margin_percent: 20, mfg_date: '2024-01-15', expiry_date: '2027-06-15', expiry_returnable: 0, supplier_id: 1, invoice_no: 'INV-001', invoice_date: '2024-01-20', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-01-20T10:00:00.000Z' },
    { id: 2, name: 'Amoxicillin 250mg', strength: '250mg', batch_number: 'BATCH-002', pack_size: '15 Cap', company: 'XYZ Labs', quantity: 300, mrp: 85.00, purchase_price: 45.00, ptr: 65.00, selling_price: 78.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'H', barcode: 'MED002XYZ', rack_location: 'B2-Shelf3', low_stock_alert: 30, min_margin_percent: 25, mfg_date: '2024-02-01', expiry_date: '2027-08-01', expiry_returnable: 0, supplier_id: 2, invoice_no: 'INV-002', invoice_date: '2024-02-05', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-02-05T10:00:00.000Z' },
    { id: 3, name: 'Cetirizine 10mg', strength: '10mg', batch_number: 'BATCH-003', pack_size: '10 Tab', company: 'PharmaGood', quantity: 800, mrp: 30.00, purchase_price: 8.00, ptr: 18.00, selling_price: 25.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'General', barcode: 'MED003PG', rack_location: 'A2-Row1', low_stock_alert: 100, min_margin_percent: 20, mfg_date: '2024-03-10', expiry_date: '2027-09-10', expiry_returnable: 0, supplier_id: 4, invoice_no: 'INV-003', invoice_date: '2024-03-15', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-03-15T10:00:00.000Z' },
    { id: 4, name: 'Ibuprofen 400mg', strength: '400mg', batch_number: 'BATCH-004', pack_size: '10 Tab', company: 'MediCorp', quantity: 0, mrp: 35.00, purchase_price: 14.00, ptr: 24.00, selling_price: 30.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'General', barcode: 'MED004MC', rack_location: 'A1-Row2', low_stock_alert: 40, min_margin_percent: 20, mfg_date: '2024-02-20', expiry_date: '2025-06-20', expiry_returnable: 0, supplier_id: 3, invoice_no: 'INV-004', invoice_date: '2024-02-25', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-02-25T10:00:00.000Z' },
    { id: 5, name: 'Paracetamol 500mg', strength: '500mg', batch_number: 'BATCH-005', pack_size: '10 Tab', company: 'ABC Pharma', quantity: 200, mrp: 25.00, purchase_price: 12.50, ptr: 18.00, selling_price: 22.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'General', barcode: 'MED005ABC', rack_location: 'A1-Row1', low_stock_alert: 50, min_margin_percent: 20, mfg_date: '2024-04-01', expiry_date: '2026-09-15', expiry_returnable: 0, supplier_id: 1, invoice_no: 'INV-005', invoice_date: '2024-04-05', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-04-05T10:00:00.000Z' },
    { id: 6, name: 'Amoxicillin 250mg', strength: '250mg', batch_number: 'BATCH-006', pack_size: '15 Cap', company: 'XYZ Labs', quantity: 150, mrp: 85.00, purchase_price: 45.00, ptr: 65.00, selling_price: 78.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'H', barcode: 'MED006XYZ', rack_location: 'B2-Shelf3', low_stock_alert: 30, min_margin_percent: 25, mfg_date: '2024-03-01', expiry_date: '2026-10-01', expiry_returnable: 1, supplier_id: 2, invoice_no: 'INV-006', invoice_date: '2024-03-10', scheme_qty: 10, free_qty: 1, added_by: 1, created_at: '2024-03-10T10:00:00.000Z' },
    { id: 7, name: 'Metformin 500mg', strength: '500mg', batch_number: 'BATCH-007', pack_size: '10 Tab', company: 'HealthFirst', quantity: 600, mrp: 20.00, purchase_price: 7.00, ptr: 14.00, selling_price: 18.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'General', barcode: 'MED007HF', rack_location: 'C1-Row1', low_stock_alert: 60, min_margin_percent: 20, mfg_date: '2024-05-01', expiry_date: '2027-05-01', expiry_returnable: 0, supplier_id: 5, invoice_no: 'INV-007', invoice_date: '2024-05-05', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-05-05T10:00:00.000Z' },
    { id: 8, name: 'Amlodipine 5mg', strength: '5mg', batch_number: 'BATCH-008', pack_size: '10 Tab', company: 'ABC Pharma', quantity: 400, mrp: 45.00, purchase_price: 18.00, ptr: 32.00, selling_price: 40.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'H', barcode: 'MED008ABC', rack_location: 'A1-Row3', low_stock_alert: 40, min_margin_percent: 25, mfg_date: '2024-06-01', expiry_date: '2027-06-01', expiry_returnable: 0, supplier_id: 1, invoice_no: 'INV-008', invoice_date: '2024-06-05', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-06-05T10:00:00.000Z' },
    { id: 9, name: 'Omeprazole 20mg', strength: '20mg', batch_number: 'BATCH-009', pack_size: '10 Cap', company: 'PharmaGood', quantity: 350, mrp: 55.00, purchase_price: 22.00, ptr: 38.00, selling_price: 48.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'General', barcode: 'MED009PG', rack_location: 'B1-Row2', low_stock_alert: 35, min_margin_percent: 20, mfg_date: '2024-04-15', expiry_date: '2027-10-15', expiry_returnable: 0, supplier_id: 4, invoice_no: 'INV-009', invoice_date: '2024-04-20', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-04-20T10:00:00.000Z' },
    { id: 10, name: 'Azithromycin 500mg', strength: '500mg', batch_number: 'BATCH-010', pack_size: '3 Tab', company: 'XYZ Labs', quantity: 250, mrp: 120.00, purchase_price: 65.00, ptr: 90.00, selling_price: 110.00, purchase_gst_percent: 5, sale_gst_percent: 12, hsn_code: '3004', schedule_type: 'H', barcode: 'MED010XYZ', rack_location: 'B2-Shelf1', low_stock_alert: 25, min_margin_percent: 25, mfg_date: '2024-07-01', expiry_date: '2027-07-01', expiry_returnable: 0, supplier_id: 2, invoice_no: 'INV-010', invoice_date: '2024-07-05', scheme_qty: 0, free_qty: 0, added_by: 1, created_at: '2024-07-05T10:00:00.000Z' },
  ];
  setStore('medicines', seedMedicines);

  // Seed customers
  const seedCustomers = [
    { id: 1, name: 'City Pharmacy', phone: '+91 99887 76655', email: 'citypharma@gmail.com', address: 'MG Road, Bangalore', gstin: '29AABCC1234D1Z1', credit_limit: 50000, current_balance: 12500, type: 'retail', created_at: now() },
    { id: 2, name: 'Apollo Hospital', phone: '+91 88776 65544', email: 'pharmacy@apollohosp.com', address: 'Koramangala, Bangalore', gstin: '29APO5678E1Z1', credit_limit: 200000, current_balance: 45000, type: 'hospital', created_at: now() },
    { id: 3, name: 'MedPlus Distributors', phone: '+91 77665 54433', email: 'orders@medplus.in', address: 'Whitefield, Bangalore', gstin: '29MED9012F1Z1', credit_limit: 100000, current_balance: 28000, type: 'wholesale', created_at: now() },
    { id: 4, name: 'HealthCare Generic Store', phone: '+91 66554 43322', email: 'info@healthcaregen.in', address: 'Indiranagar, Bangalore', gstin: '29HCG3456G1Z1', credit_limit: 25000, current_balance: 5000, type: 'retail', created_at: now() },
  ];
  setStore('customers', seedCustomers);

  // Seed sales
  const seedSales = [
    { id: uuid(), customer_name: 'City Pharmacy', medicine_name: 'Paracetamol 500mg', quantity: 50, total_amount: 1100.00, sale_date: '2024-07-15', processed_by: 1 },
    { id: uuid(), customer_name: 'Apollo Hospital', medicine_name: 'Amoxicillin 250mg', quantity: 100, total_amount: 7800.00, sale_date: '2024-07-16', processed_by: 1 },
    { id: uuid(), customer_name: 'MedPlus Distributors', medicine_name: 'Cetirizine 10mg', quantity: 200, total_amount: 5000.00, sale_date: '2024-07-17', processed_by: 1 },
    { id: uuid(), customer_name: 'City Pharmacy', medicine_name: 'Metformin 500mg', quantity: 30, total_amount: 540.00, sale_date: '2024-07-18', processed_by: 1 },
  ];
  setStore('sales', seedSales);

  // Seed expenses
  const seedExpenses = [
    { id: 1, category: 'Rent', amount: 25000, description: 'July 2024 office rent', payment_method: 'Bank Transfer', receipt_path: null, created_by: 1, created_at: '2024-07-01T10:00:00.000Z' },
    { id: 2, category: 'Salary', amount: 45000, description: 'Staff salaries July 1st week', payment_method: 'Bank Transfer', receipt_path: null, created_by: 1, created_at: '2024-07-07T10:00:00.000Z' },
    { id: 3, category: 'Utilities', amount: 3500, description: 'Electricity bill', payment_method: 'UPI', receipt_path: null, created_by: 1, created_at: '2024-07-12T10:00:00.000Z' },
    { id: 4, category: 'Transport', amount: 1200, description: 'Medicine delivery charges', payment_method: 'Cash', receipt_path: null, created_by: 1, created_at: '2024-07-15T10:00:00.000Z' },
  ];
  setStore('expenses', seedExpenses);

  // Seed warehouses
  const seedWarehouses = [
    { id: 1, name: 'Main Warehouse', location: 'Peenya Industrial Area', manager_name: 'Suresh', phone: '+91 99887 76655', email: 'main@anpharmacy.com', capacity: 50000, created_at: now() },
    { id: 2, name: 'Branch - MG Road', location: 'MG Road', manager_name: 'Ramesh', phone: '+91 88776 65544', email: 'branch@anpharmacy.com', capacity: 20000, created_at: now() },
    { id: 3, name: 'Cold Storage', location: 'Whitefield', manager_name: 'Kavitha', phone: '+91 77665 54433', email: 'cold@anpharmacy.com', capacity: 10000, created_at: now() },
  ];
  setStore('warehouses', seedWarehouses);

  // Seed HSN codes
  const seedHSN = [
    { id: 1, hsn_code: '3004', description: 'Medicaments of mixed or unmixed products for therapeutic or prophylactic uses', gst_rate: 12, cess_rate: 0 },
    { id: 2, hsn_code: '3005', description: 'Wadding, gauze, bandages and similar articles', gst_rate: 12, cess_rate: 0 },
    { id: 3, hsn_code: '9018', description: 'Medical instruments and appliances', gst_rate: 12, cess_rate: 0 },
    { id: 4, hsn_code: '4015', description: 'Gloves of rubber for medical use', gst_rate: 12, cess_rate: 0 },
  ];
  setStore('hsnCodes', seedHSN);

  // Seed manufacturers
  const seedManufacturers = [
    { id: 1, name: 'Sun Pharma', contact_person: 'Dilip Shanghvi', phone: '+91 22 4321 0000', email: 'info@sunpharma.com', address: 'Mumbai', gstin: '27SUN1234D1Z1', license_number: 'MFR/2024/001', rating: 5, notes: 'Top manufacturer', created_at: now() },
    { id: 2, name: 'Cipla', contact_person: 'Yusuf Hamied', phone: '+91 22 4321 1111', email: 'info@cipla.com', address: 'Mumbai', gstin: '27CIP5678E1Z1', license_number: 'MFR/2024/002', rating: 4, notes: 'Good quality generics', created_at: now() },
    { id: 3, name: 'Dr Reddys', contact_person: 'G V Prasad', phone: '+91 40 4321 2222', email: 'info@drreddys.com', address: 'Hyderabad', gstin: '36DRR9012F1Z1', license_number: 'MFR/2024/003', rating: 5, notes: 'Premium products', created_at: now() },
  ];
  setStore('manufacturers', seedManufacturers);

  // Seed generic medicines
  const seedGenerics = [
    { id: 1, generic_name: 'Paracetamol', brand_name: 'Calpol', manufacturer_id: 1, category: 'Analgesic', description: 'Fever & pain relief' },
    { id: 2, generic_name: 'Amoxicillin', brand_name: 'Amoxil', manufacturer_id: 2, category: 'Antibiotic', description: 'Bacterial infections' },
    { id: 3, generic_name: 'Metformin', brand_name: 'Glyciphage', manufacturer_id: 3, category: 'Anti-diabetic', description: 'Diabetes management' },
    { id: 4, generic_name: 'Cetirizine', brand_name: 'Zyrtec', manufacturer_id: 1, category: 'Antihistamine', description: 'Allergy relief' },
  ];
  setStore('generics', seedGenerics);

  // Seed notifications
  const seedNotifications = [
    { id: 1, user_id: 1, title: 'Welcome!', message: 'Welcome to AnPharmacy Management System', type: 'info', is_read: 0, action_url: null, created_at: now() },
    { id: 2, user_id: 1, title: 'Stock Alert', message: 'Ibuprofen 400mg is out of stock', type: 'warning', is_read: 0, action_url: '/stock', created_at: now() },
    { id: 3, user_id: 1, title: 'Expiry Alert', message: 'Amoxicillin BATCH-006 expires in Dec 2024', type: 'critical', is_read: 0, action_url: '/stock', created_at: now() },
  ];
  setStore('notifications', seedNotifications);

  // Seed customer ledger
  const seedLedger = [
    { id: 1, customer_id: 1, transaction_type: 'sale', amount: 1100.00, payment_method: 'Cash', reference_id: null, notes: 'Paracetamol purchase', created_at: '2024-07-15T10:00:00.000Z' },
    { id: 2, customer_id: 2, transaction_type: 'sale', amount: 7800.00, payment_method: 'Bank Transfer', reference_id: null, notes: 'Amoxicillin purchase', created_at: '2024-07-16T10:00:00.000Z' },
    { id: 3, customer_id: 1, transaction_type: 'payment', amount: 1100.00, payment_method: 'Cash', reference_id: null, notes: 'Payment received', created_at: '2024-07-16T10:00:00.000Z' },
  ];
  setStore('customerLedger', seedLedger);
  
  // Mark seed version
  localStorage.setItem('anpharm_seed_version', String(SEED_VERSION));
}

// ====== BROWSER API IMPLEMENTATION ======
export function initializeBrowserAPI(): void {
  if ((window as any).electronAPI) {
    // Electron API is already available (running in Electron), skip
    return;
  }

  seedIfEmpty();

  // Flush pending localStorage writes on page unload to prevent data loss
  window.addEventListener('beforeunload', flushStore);

  const api = {
    // Database
    dbInit: async () => ({ success: true }),

    // Auth
    login: async ({ username, password }: { username: string; password: string }) => {
      const users = getStore<any[]>('users', []);
      const hash = await sha256(password);
      const row = users.find(u => u.username === username && u.is_active === 1);
      if (!row) return { success: false, error: 'Invalid username or password' };
      if (row.password_hash !== hash) return { success: false, error: 'Invalid username or password' };
      // Update last_login
      const updated = users.map(u => u.id === row.id ? { ...u, last_login: now() } : u);
      setStore('users', updated);
      return {
        success: true,
        user: { id: row.id, username: row.username, displayName: row.display_name, role: row.role }
      };
    },

    // Users
    listUsers: async () => {
      const users = getStore<any[]>('users', []);
      const safe = users.map(({ password_hash, ...u }) => u);
      return { success: true, users: safe };
    },
    createUser: async (data: any) => {
      const users = getStore<any[]>('users', []);
      const hash = await sha256(data.password);
      const user = {
        id: nextId(users),
        username: data.username,
        password_hash: hash,
        display_name: data.displayName,
        role: data.role,
        last_login: null,
        is_active: 1,
      };
      users.push(user);
      setStore('users', users);
      return { success: true };
    },
    toggleUserActive: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const users = getStore<any[]>('users', []).map(u =>
        u.id === id && u.role !== 'admin' ? { ...u, is_active: isActive ? 1 : 0 } : u
      );
      setStore('users', users);
      return { success: true };
    },
    deleteUser: async ({ id }: { id: number }) => {
      let users = getStore<any[]>('users', []);
      const user = users.find(u => u.id === id);
      if (user?.role === 'admin') return { success: false, error: 'Cannot delete admin user' };
      users = users.filter(u => u.id !== id);
      setStore('users', users);
      return { success: true };
    },

    // Suppliers
    listSuppliers: async () => {
      const suppliers = getStore<any[]>('suppliers', []);
      return { success: true, suppliers };
    },
    createSupplier: async (data: any) => {
      const suppliers = getStore<any[]>('suppliers', []);
      const supplier = { id: nextId(suppliers), ...data, created_at: now() };
      suppliers.push(supplier);
      setStore('suppliers', suppliers);
      return { success: true, supplier };
    },
    updateSupplier: async (data: any) => {
      let suppliers = getStore<any[]>('suppliers', []);
      const idx = suppliers.findIndex(s => s.id === data.id);
      if (idx === -1) return { success: false, error: 'Supplier not found' };
      suppliers[idx] = { ...suppliers[idx], ...data };
      setStore('suppliers', suppliers);
      return { success: true, supplier: suppliers[idx] };
    },
    deleteSupplier: async ({ id }: { id: number }) => {
      const medicines = getStore<any[]>('medicines', []);
      const count = medicines.filter(m => m.supplier_id === id).length;
      if (count > 0) return { success: false, error: `Cannot delete supplier. ${count} medicine(s) are linked.` };
      let suppliers = getStore<any[]>('suppliers', []).filter(s => s.id !== id);
      setStore('suppliers', suppliers);
      return { success: true };
    },
    getSupplierMedicines: async ({ supplierId }: { supplierId: number }) => {
      const medicines = getStore<any[]>('medicines', []).filter(m => m.supplier_id === supplierId);
      return { success: true, medicines: medicines.map(enrichMedicine) };
    },

    // License
    getLicenseStatus: async () => ({ status: 'active', deviceId: 'BROWSER-DEVICE-001', license: null }),
    activateLicense: async () => ({ success: true }),
    deactivateLicense: async () => ({ success: true }),

    // Stock
    listStock: async () => {
      const medicines = getStore<any[]>('medicines', []).map(enrichMedicine);
      return { success: true, medicines };
    },
    // Bulk save all medicines at once (used by import commit)
    saveAllStock: async ({ medicines: meds }: { medicines: any[] }) => {
      setStore('medicines', meds);
      return { success: true, count: meds.length };
    },

    addStock: async ({ medicine, userId }: any) => {
      const medicines = getStore<any[]>('medicines', []);
      // Helper: read a field supporting both camelCase and snake_case
      const val = (camel: string, snake: string) => {
        if (medicine[camel] !== undefined && medicine[camel] !== null) return medicine[camel];
        return medicine[snake] !== undefined ? medicine[snake] : null;
      };
      const newMed = {
        id: nextId(medicines),
        name: medicine.name || '',
        strength: val('strength', 'strength'),
        batch_number: val('batchNumber', 'batch_number') || '',
        pack_size: val('packSize', 'pack_size'),
        company: val('company', 'company'),
        quantity: medicine.quantity || 0,
        mrp: medicine.mrp || 0,
        purchase_price: val('purchasePrice', 'purchase_price'),
        ptr: medicine.ptr || 0,
        selling_price: val('sellingPrice', 'selling_price'),
        purchase_gst_percent: val('purchaseGstPercent', 'purchase_gst_percent') ?? 0,
        sale_gst_percent: val('saleGstPercent', 'sale_gst_percent') ?? 0,
        hsn_code: val('hsnCode', 'hsn_code') || '3004',
        schedule_type: val('scheduleType', 'schedule_type') || 'General',
        barcode: val('barcode', 'barcode'),
        rack_location: val('rackLocation', 'rack_location'),
        low_stock_alert: val('lowStockAlert', 'low_stock_alert') || 20,
        min_margin_percent: val('minMarginPercent', 'min_margin_percent') || 20,
        mfg_date: val('mfgDate', 'mfg_date'),
        expiry_date: val('expiryDate', 'expiry_date'),
        expiry_returnable: (val('expiryReturnable', 'expiry_returnable') || 0) ? 1 : 0,
        supplier_id: val('supplierId', 'supplier_id'),
        invoice_no: val('invoiceNo', 'invoice_no'),
        invoice_date: val('invoiceDate', 'invoice_date'),
        added_by: userId || 1,
        created_at: now(),
      };
      medicines.push(newMed);
      setStore('medicines', medicines);
      return { success: true, id: newMed.id };
    },
    getBatches: async ({ medicineName }: { medicineName: string }) => {
      const medicines = getStore<any[]>('medicines', []).map(enrichMedicine);
      const batches = medicines.filter(
        m => m.name.toLowerCase() === medicineName.toLowerCase() && m.quantity > 0 && m.status !== 'expired'
      );
      return { success: true, batches };
    },

    // Sales
    processSale: async ({ customerName, medicineName, totalAmount, items, userId }: any) => {
      const medicines = getStore<any[]>('medicines', []);
      const sales = getStore<any[]>('sales', []);
      const saleId = uuid();

      for (const item of items) {
        const idx = medicines.findIndex(m => m.id === item.batchId);
        if (idx === -1) throw new Error(`Batch ${item.batchNumber} not found`);
        if (medicines[idx].quantity < item.quantity) throw new Error(`Insufficient stock for batch ${item.batchNumber}`);
        medicines[idx].quantity -= item.quantity;
      }
      setStore('medicines', medicines);

      sales.push({
        id: saleId,
        customer_name: customerName,
        medicine_name: medicineName,
        quantity: items.reduce((s: number, i: any) => s + i.quantity, 0),
        total_amount: totalAmount,
        sale_date: today(),
        processed_by: userId,
      });
      setStore('sales', sales);

      return { success: true, saleId };
    },
    listSales: async () => {
      const users = getStore<any[]>('users', []);
      const sales = getStore<any[]>('sales', []).map((s: any) => ({
        ...s,
        processed_by_name: users.find(u => u.id === s.processed_by)?.display_name || 'Unknown'
      }));
      return { success: true, sales };
    },

    // Purchases
    listPurchases: async () => {
      const users = getStore<any[]>('users', []);
      const purchases = getStore<any[]>('medicines', []).map((m: any) => ({
        id: m.id,
        medicine_name: m.name,
        batch_number: m.batch_number,
        supplier: m.company || null,
        quantity: m.quantity,
        purchase_price: m.purchase_price || 0,
        total_amount: (m.quantity || 0) * (m.purchase_price || 0),
        purchase_date: m.created_at,
        added_by_name: users.find(u => u.id === m.added_by)?.display_name || 'Unknown',
      }));
      return { success: true, purchases };
    },

    // Reports
    getStockReport: async () => {
      const medicines = getStore<any[]>('medicines', []).map(enrichMedicine);
      const uniqueNames = new Set(medicines.map(m => m.name)).size;
      const totalBatches = medicines.length;
      const totalUnits = medicines.reduce((s, m) => s + (m.quantity || 0), 0);
      const totalValue = medicines.reduce((s, m) => s + (m.quantity || 0) * (m.purchase_price || 0), 0);
      const avgPricePerUnit = totalUnits > 0 ? Math.round((totalValue / totalUnits) * 100) / 100 : 0;
      return {
        success: true,
        medicines,
        stats: { uniqueMedicines: uniqueNames, totalBatches, totalUnits, totalValue, avgPricePerUnit }
      };
    },
    getExpiryReport: async () => {
      const medicines = getStore<any[]>('medicines', []).map(enrichMedicine).filter(m => m.expiry_date);
      const categories = {
        expired: medicines.filter(m => m.status === 'expired'),
        critical: medicines.filter(m => m.status === 'critical'),
        warning: medicines.filter(m => m.status === 'warning'),
        safe: medicines.filter(m => m.status === 'safe'),
      };
      return { success: true, categories, total: medicines.length };
    },
    getExpiryTierReport: async () => {
      const all = getStore<any[]>('medicines', []).map(enrichMedicine).filter(m => m.expiry_date);
      const tiers: any = { expired: [], d90: [], d60: [], d30: [], safe: [], unknown: [] };
      for (const m of all) {
        const d = m.days_remaining;
        if (d == null) tiers.unknown.push(m);
        else if (d < 0) tiers.expired.push(m);
        else if (d <= 30) tiers.d30.push(m);
        else if (d <= 60) tiers.d60.push(m);
        else if (d <= 90) tiers.d90.push(m);
        else tiers.safe.push(m);
      }
      const atRiskValue = [...tiers.expired, ...tiers.d90, ...tiers.d60, ...tiers.d30]
        .reduce((s, m) => s + ((m.purchase_price || 0) * (m.quantity || 0)), 0);
      return {
        success: true,
        tiers,
        stats: {
          expired: tiers.expired.length, d90: tiers.d90.length, d60: tiers.d60.length,
          d30: tiers.d30.length, safe: tiers.safe.length, total: all.length, atRiskValue
        }
      };
    },
    getProfitReport: async () => {
      const medicines = getStore<any[]>('medicines', []).map(enrichMedicine);
      let totalPurchaseValue = 0, totalSaleValue = 0, totalInputGst = 0, totalOutputGst = 0, totalRealProfit = 0;
      const rows: any[] = [];
      for (const m of medicines) {
        const qty = m.quantity || 0;
        if (qty <= 0) continue;
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
      return {
        success: true, rows,
        stats: {
          totalPurchaseValue, totalSaleValue, totalInputGst, totalOutputGst, totalRealProfit,
          marginPercent: totalSaleValue > 0 ? (totalRealProfit / totalSaleValue) * 100 : 0,
          batchCount: rows.length,
        }
      };
    },
    getSalesReport: async () => {
      const sales = getStore<any[]>('sales', []);
      const stats = {
        totalSales: sales.length,
        totalRevenue: sales.reduce((s: number, sale: any) => s + (sale.total_amount || 0), 0),
        totalUnitsSold: sales.reduce((s: number, sale: any) => s + (sale.quantity || 0), 0),
      };
      (stats as any).avgSaleValue = stats.totalSales > 0 ? Math.round((stats.totalRevenue / stats.totalSales) * 100) / 100 : 0;
      return { success: true, sales, stats };
    },

    // Dashboard
    getDashboardStats: async () => {
      const medicines = getStore<any[]>('medicines', []).map(enrichMedicine);
      const sales = getStore<any[]>('sales', []);
      const todayStr = today();
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      
      // Today's sales
      const todaySales = sales.filter((s: any) => s.sale_date === todayStr);
      const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
      const todayItems = todaySales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
      
      // Yesterday's sales for comparison
      const yesterdaySales = sales.filter((s: any) => s.sale_date === yesterdayStr);
      const yesterdayRevenue = yesterdaySales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
      const yesterdayItems = yesterdaySales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
      
      const stats = {
        totalMedicines: new Set(medicines.map(m => m.name)).size,
        totalStock: medicines.reduce((s, m) => s + (m.quantity || 0), 0),
        totalValue: medicines.reduce((s, m) => s + ((m.quantity || 0) * (m.purchase_price || 0)), 0),
        expired: medicines.filter(m => m.status === 'expired').length,
        critical: medicines.filter(m => m.status === 'critical').length,
        todayRevenue,
        todayItems,
        yesterdayRevenue,
        yesterdayItems,
        todayTransactions: todaySales.length,
        recentSales: sales.slice(-10).reverse().map((s: any) => ({
          customer: s.customer_name,
          medicine: s.medicine_name,
          amount: s.total_amount,
          qty: s.quantity,
          date: s.sale_date,
        })),
      };
      return { success: true, stats, medicines };
    },

    // Import History
    getImportHistory: async () => {
      const imports = getStore<any[]>('importLogs', []);
      return { success: true, imports: imports.reverse() };
    },
    logImport: async (data: any) => {
      const imports = getStore<any[]>('importLogs', []);
      imports.push({
        id: uuid(),
        fileName: data.fileName,
        totalRows: data.totalRows,
        validRows: data.validRows,
        invalidRows: data.invalidRows,
        newColumns: data.newColumns || [],
        errors: data.errors || 0,
        importedBy: data.importedBy || 'User',
        timestamp: now(),
        date: today(),
      });
      setStore('importLogs', imports);
      return { success: true };
    },
    deleteImportLog: async ({ id }: { id: string }) => {
      let imports = getStore<any[]>('importLogs', []).filter((l: any) => l.id !== id);
      setStore('importLogs', imports);
      return { success: true };
    },
    clearImportLogs: async () => {
      setStore('importLogs', []);
      return { success: true };
    },

    // Supplier Analytics
    getSupplierAnalytics: async () => {
      const medicines = getStore<any[]>('medicines', []);
      const suppliers = getStore<any[]>('suppliers', []);
      const analytics = suppliers.map(supplier => {
        const supplierMeds = medicines.filter(m => m.supplier_id === supplier.id);
        const totalStock = supplierMeds.reduce((s, m) => s + (m.quantity || 0), 0);
        const avgPurchasePrice = supplierMeds.length > 0
          ? supplierMeds.reduce((s, m) => s + (m.purchase_price || 0), 0) / supplierMeds.length
          : 0;
        const totalValue = supplierMeds.reduce((s, m) => s + ((m.quantity || 0) * (m.purchase_price || 0)), 0);
        const batchesCount = supplierMeds.length;
        const uniqueMedicines = new Set(supplierMeds.map(m => m.name)).size;
        const nearExpiry = supplierMeds.filter(m => m.days_remaining !== null && m.days_remaining <= 180).length;
        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          batchesCount,
          uniqueMedicines,
          totalStock,
          avgPurchasePrice,
          totalValue,
          nearExpiry,
        };
      });
      return { success: true, analytics };
    },

    // Backup (simplified - store as JSON in localStorage)
    createBackup: async () => {
      const backupData: any = {};
      const keys = ['medicines', 'sales', 'suppliers', 'users', 'customers', 'customerLedger', 'expenses', 'warehouses', 'notifications', 'manufacturers', 'generics', 'hsnCodes'];
      for (const key of keys) {
        backupData[key] = getStore(key, []);
      }
      const json = JSON.stringify(backupData, null, 2);
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AnPharmacy_Backup_${today()}.anpbackup`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, path: `Downloaded: AnPharmacy_Backup_${today()}.anpbackup` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    restoreBackup: async ({ filePath }: { filePath: string }) => {
      // In browser mode, filePath can be either:
      // 1. A JSON string from openFileDialog (FileReader result)
      // 2. A filename/path string from createBackup (download path)
      try {
        let data: any;
        try {
          data = JSON.parse(filePath);
        } catch {
          // Not valid JSON - try to read it as a backup file from localStorage key
          const storedKey = filePath.replace(/[^a-zA-Z0-9]/g, '');
          const stored = localStorage.getItem(`anpharm_backup_${storedKey}`);
          if (stored) {
            data = JSON.parse(stored);
          } else {
            return { success: false, error: 'Invalid backup file. Please use the openFileDialog to select a .anpbackup file.' };
          }
        }
        // Restore data keys into their respective stores
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) setStore(key, value);
        }
        return { success: true, message: 'Restore completed successfully! Data has been refreshed.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to restore backup' };
      }
    },
    listBackups: async () => ({ success: true, backups: [] }),
    getAutoBackupSettings: async () => ({ success: true, settings: { enabled: false, intervalHours: 24, lastBackup: null } }),
    setAutoBackupSettings: async (settings: any) => ({ success: true, settings }),
    autoCreateBackup: async () => ({ success: true, path: 'auto-backup-simulated' }),
    onAutoBackupCompleted: () => {},
    openFileDialog: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.anpbackup';
        input.onchange = () => {
          const file = input.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve({ canceled: false, filePath: reader.result as string });
            reader.readAsText(file);
          } else {
            resolve({ canceled: true });
          }
        };
        input.click();
      });
    },
    saveFileDialog: async () => ({ canceled: false, filePath: `AnPharmacy_Backup_${today()}.anpbackup` }),
    openImageDialog: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
          const file = input.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve({ canceled: false, filePath: reader.result as string });
            reader.readAsDataURL(file);
          } else {
            resolve({ canceled: true });
          }
        };
        input.click();
      });
    },
    openPdfDialog: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        input.onchange = () => {
          const file = input.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve({ canceled: false, filePath: reader.result as string });
            reader.readAsDataURL(file);
          } else {
            resolve({ canceled: true });
          }
        };
        input.click();
      });
    },
    openExternal: async (url: string) => { window.open(url, '_blank'); return { success: true }; },
    logError: async (data: any) => {
      console.error('Browser API Error:', data);
      return { success: true };
    },

    // Manufacturers
    listManufacturers: async () => {
      const manufacturers = getStore<any[]>('manufacturers', []);
      return { success: true, manufacturers };
    },
    createManufacturer: async (data: any) => {
      const manufacturers = getStore<any[]>('manufacturers', []);
      const mfr = { id: nextId(manufacturers), ...data, created_at: now() };
      manufacturers.push(mfr);
      setStore('manufacturers', manufacturers);
      return { success: true, manufacturer: mfr };
    },
    updateManufacturer: async (data: any) => {
      let manufacturers = getStore<any[]>('manufacturers', []);
      const idx = manufacturers.findIndex(m => m.id === data.id);
      if (idx === -1) return { success: false, error: 'Manufacturer not found' };
      manufacturers[idx] = { ...manufacturers[idx], ...data };
      setStore('manufacturers', manufacturers);
      return { success: true, manufacturer: manufacturers[idx] };
    },
    deleteManufacturer: async ({ id }: { id: number }) => {
      let manufacturers = getStore<any[]>('manufacturers', []).filter(m => m.id !== id);
      setStore('manufacturers', manufacturers);
      return { success: true };
    },

    // Generic Medicines
    listGenericMedicines: async () => {
      const generics = getStore<any[]>('generics', []);
      const manufacturers = getStore<any[]>('manufacturers', []);
      const enriched = generics.map(g => ({
        ...g, manufacturer_name: manufacturers.find(m => m.id === g.manufacturer_id)?.name || 'Unknown'
      }));
      return { success: true, generics: enriched };
    },
    createGenericMedicine: async (data: any) => {
      const generics = getStore<any[]>('generics', []);
      const gen = { id: nextId(generics), ...data };
      generics.push(gen);
      setStore('generics', generics);
      return { success: true, generic: gen };
    },
    updateGenericMedicine: async (data: any) => {
      let generics = getStore<any[]>('generics', []);
      const idx = generics.findIndex(g => g.id === data.id);
      if (idx === -1) return { success: false, error: 'Generic not found' };
      generics[idx] = { ...generics[idx], ...data };
      setStore('generics', generics);
      return { success: true, generic: generics[idx] };
    },
    deleteGenericMedicine: async ({ id }: { id: number }) => {
      let generics = getStore<any[]>('generics', []).filter(g => g.id !== id);
      setStore('generics', generics);
      return { success: true };
    },

    // Customers
    listCustomers: async () => {
      const customers = getStore<any[]>('customers', []);
      return { success: true, customers };
    },
    createCustomer: async (data: any) => {
      const customers = getStore<any[]>('customers', []);
      const customer = { id: nextId(customers), ...data, current_balance: 0, created_at: now() };
      customers.push(customer);
      setStore('customers', customers);
      return { success: true, customer };
    },
    updateCustomer: async (data: any) => {
      let customers = getStore<any[]>('customers', []);
      const idx = customers.findIndex(c => c.id === data.id);
      if (idx === -1) return { success: false, error: 'Customer not found' };
      customers[idx] = { ...customers[idx], ...data };
      setStore('customers', customers);
      return { success: true, customer: customers[idx] };
    },
    deleteCustomer: async ({ id }: { id: number }) => {
      let customers = getStore<any[]>('customers', []).filter(c => c.id !== id);
      setStore('customers', customers);
      return { success: true };
    },
    getCustomerLedger: async ({ customerId }: { customerId: number }) => {
      const ledger = getStore<any[]>('customerLedger', []).filter((l: any) => l.customer_id === customerId);
      const customer = getStore<any[]>('customers', []).find(c => c.id === customerId);
      return { success: true, ledger, customer };
    },
    addCustomerLedger: async (data: any) => {
      const customers = getStore<any[]>('customers', []);
      const customerIdx = customers.findIndex(c => c.id === data.customer_id);
      if (customerIdx === -1) return { success: false, error: 'Customer not found' };
      const ledger = getStore<any[]>('customerLedger', []);
      const entry = { id: nextId(ledger), ...data, created_at: now() };
      ledger.push(entry);
      setStore('customerLedger', ledger);
      if (data.transaction_type === 'payment') {
        customers[customerIdx].current_balance = (customers[customerIdx].current_balance || 0) - data.amount;
      } else {
        customers[customerIdx].current_balance = (customers[customerIdx].current_balance || 0) + data.amount;
      }
      setStore('customers', customers);
      return { success: true };
    },

    // Purchase Returns
    listPurchaseReturns: async () => ({ success: true, returns: [] }),
    createPurchaseReturn: async (data: any) => {
      const medicines = getStore<any[]>('medicines', []);
      const idx = medicines.findIndex(m => m.id === data.medicine_id);
      if (idx !== -1) {
        medicines[idx].quantity += data.quantity;
        setStore('medicines', medicines);
      }
      return { success: true, id: uuid() };
    },

    // Sales Returns
    listSalesReturns: async () => ({ success: true, returns: [] }),
    createSalesReturn: async (data: any) => {
      const medicines = getStore<any[]>('medicines', []);
      const med = medicines.find(m => m.name === data.medicine_name);
      if (med) {
        med.quantity += data.quantity;
        setStore('medicines', medicines);
      }
      return { success: true, id: uuid() };
    },

    // Warehouses
    listWarehouses: async () => {
      const warehouses = getStore<any[]>('warehouses', []);
      return { success: true, warehouses };
    },
    createWarehouse: async (data: any) => {
      const warehouses = getStore<any[]>('warehouses', []);
      const wh = { id: nextId(warehouses), ...data, created_at: now() };
      warehouses.push(wh);
      setStore('warehouses', warehouses);
      return { success: true, warehouse: wh };
    },
    updateWarehouse: async (data: any) => {
      let warehouses = getStore<any[]>('warehouses', []);
      const idx = warehouses.findIndex(w => w.id === data.id);
      if (idx === -1) return { success: false, error: 'Warehouse not found' };
      warehouses[idx] = { ...warehouses[idx], ...data };
      setStore('warehouses', warehouses);
      return { success: true, warehouse: warehouses[idx] };
    },
    deleteWarehouse: async ({ id }: { id: number }) => {
      let warehouses = getStore<any[]>('warehouses', []).filter(w => w.id !== id);
      setStore('warehouses', warehouses);
      return { success: true };
    },

    // Stock Transfers
    listStockTransfers: async () => {
      const transfers = getStore<any[]>('stockTransfers', []);
      const warehouses = getStore<any[]>('warehouses', []);
      const medicines = getStore<any[]>('medicines', []);
      const enriched = transfers.map(t => ({
        ...t,
        from_warehouse: warehouses.find(w => w.id === t.from_warehouse_id)?.name || '?',
        to_warehouse: warehouses.find(w => w.id === t.to_warehouse_id)?.name || '?',
        medicine_name: medicines.find(m => m.id === t.medicine_id)?.name || '?',
      }));
      return { success: true, transfers: enriched };
    },
    createStockTransfer: async (data: any) => {
      const transfers = getStore<any[]>('stockTransfers', []);
      const transfer = {
        id: uuid(), from_warehouse_id: data.from_warehouse_id, to_warehouse_id: data.to_warehouse_id,
        medicine_id: data.medicine_id, quantity: data.quantity, notes: data.notes || null,
        status: 'pending', transferred_by: data.transferred_by, received_by: null, created_at: now(),
      };
      transfers.push(transfer);
      setStore('stockTransfers', transfers);
      return { success: true, id: transfer.id };
    },
    receiveStockTransfer: async ({ id, received_by }: any) => {
      let transfers = getStore<any[]>('stockTransfers', []);
      const idx = transfers.findIndex((t: any) => t.id === id);
      if (idx === -1) return { success: false, error: 'Transfer not found' };
      const transfer = transfers[idx];
      transfers[idx] = { ...transfers[idx], status: 'completed', received_by: received_by || 1 };
      setStore('stockTransfers', transfers);
      // Update warehouse stock counts
      const warehouses = getStore<any[]>('warehouses', []);
      const fromIdx = warehouses.findIndex(w => w.id === transfer.from_warehouse_id);
      const toIdx = warehouses.findIndex(w => w.id === transfer.to_warehouse_id);
      if (fromIdx !== -1) {
        warehouses[fromIdx].current_stock = (warehouses[fromIdx].current_stock || 0) - (transfer.quantity || 0);
      }
      if (toIdx !== -1) {
        warehouses[toIdx].current_stock = (warehouses[toIdx].current_stock || 0) + (transfer.quantity || 0);
      }
      setStore('warehouses', warehouses);
      return { success: true };
    },

    // Expenses
    listExpenses: async () => {
      const expenses = getStore<any[]>('expenses', []);
      const users = getStore<any[]>('users', []);
      const enriched = expenses.map(e => ({
        ...e, created_by_name: users.find(u => u.id === e.created_by)?.display_name || 'Unknown'
      }));
      return { success: true, expenses: enriched };
    },
    createExpense: async (data: any) => {
      const expenses = getStore<any[]>('expenses', []);
      const expense = { id: nextId(expenses), ...data, created_at: now() };
      expenses.push(expense);
      setStore('expenses', expenses);
      return { success: true, expense };
    },
    updateExpense: async (data: any) => {
      let expenses = getStore<any[]>('expenses', []);
      const idx = expenses.findIndex(e => e.id === data.id);
      if (idx === -1) return { success: false, error: 'Expense not found' };
      expenses[idx] = { ...expenses[idx], ...data };
      setStore('expenses', expenses);
      return { success: true, expense: expenses[idx] };
    },
    deleteExpense: async ({ id }: { id: number }) => {
      let expenses = getStore<any[]>('expenses', []).filter(e => e.id !== id);
      setStore('expenses', expenses);
      return { success: true };
    },

    // Price Rules
    listPriceRules: async () => ({ success: true, rules: [] }),
    createPriceRule: async (data: any) => ({ success: true, rule: { id: 1, ...data } }),
    deletePriceRule: async ({ id }: { id: number }) => ({ success: true }),

    // Discount Schemes
    listDiscountSchemes: async () => ({ success: true, schemes: [] }),
    createDiscountScheme: async (data: any) => ({ success: true, scheme: { id: 1, ...data } }),
    updateDiscountScheme: async (data: any) => ({ success: true, scheme: { ...data } }),
    deleteDiscountScheme: async ({ id }: { id: number }) => ({ success: true }),

    // HSN Codes
    listHSNCodes: async () => {
      const hsnCodes = getStore<any[]>('hsnCodes', []);
      return { success: true, hsnCodes };
    },
    createHSNCode: async (data: any) => {
      const hsnCodes = getStore<any[]>('hsnCodes', []);
      const hsn = { id: nextId(hsnCodes), ...data };
      hsnCodes.push(hsn);
      setStore('hsnCodes', hsnCodes);
      return { success: true, hsn };
    },
    updateHSNCode: async (data: any) => {
      let hsnCodes = getStore<any[]>('hsnCodes', []);
      const idx = hsnCodes.findIndex(h => h.id === data.id);
      if (idx === -1) return { success: false, error: 'HSN code not found' };
      hsnCodes[idx] = { ...hsnCodes[idx], ...data };
      setStore('hsnCodes', hsnCodes);
      return { success: true, hsn: hsnCodes[idx] };
    },
    deleteHSNCode: async ({ id }: { id: number }) => {
      let hsnCodes = getStore<any[]>('hsnCodes', []).filter(h => h.id !== id);
      setStore('hsnCodes', hsnCodes);
      return { success: true };
    },
    assignMedicineHSN: async (data: any) => ({ success: true }),
    getMedicineHSN: async (data: any) => ({ success: true, hsn: null }),

    // Notifications
    listNotifications: async ({ user_id }: { user_id: number }) => {
      const notifications = getStore<any[]>('notifications', []);
      return { success: true, notifications };
    },
    createNotification: async (data: any) => {
      const notifications = getStore<any[]>('notifications', []);
      const notification = {
        id: nextId(notifications), user_id: data.user_id || null,
        title: data.title || '', message: data.message || '',
        type: data.type || 'info', is_read: 0,
        action_url: data.action_url || null, created_at: now(),
      };
      notifications.push(notification);
      setStore('notifications', notifications);
      return { success: true, notification };
    },
    markNotificationRead: async ({ id }: { id: number }) => {
      let notifications = getStore<any[]>('notifications', []);
      const idx = notifications.findIndex((n: any) => n.id === id);
      if (idx !== -1) { notifications[idx].is_read = 1; setStore('notifications', notifications); }
      return { success: true };
    },
    markAllNotificationsRead: async ({ user_id }: { user_id: number }) => {
      let notifications = getStore<any[]>('notifications', []);
      notifications = notifications.map(n => ({ ...n, is_read: 1 }));
      setStore('notifications', notifications);
      return { success: true };
    },

    // ✦✦✦ RECYCLE BIN ✦✦✦
    deleteToBin: async ({ id }: { id: number }) => {
      const medicines = getStore<any[]>('medicines', []);
      const idx = medicines.findIndex((m: any) => m.id === id);
      if (idx === -1) return { success: false, error: 'Medicine not found' };
      
      const deletedItems = getStore<any[]>('deletedStock', []);
      const deletedItem = { ...medicines[idx], deleted_at: now() };
      deletedItems.push(deletedItem);
      setStore('deletedStock', deletedItems);
      
      medicines.splice(idx, 1);
      setStore('medicines', medicines);
      return { success: true };
    },
    getDeletedStock: async () => {
      const deletedItems = getStore<any[]>('deletedStock', []);
      return { success: true, deletedItems: deletedItems.reverse() };
    },
    restoreFromBin: async ({ id }: { id: number }) => {
      const deletedItems = getStore<any[]>('deletedStock', []);
      const idx = deletedItems.findIndex((m: any) => m.id === id);
      if (idx === -1) return { success: false, error: 'Deleted item not found' };
      const [restoredItem] = deletedItems.splice(idx, 1);
      setStore('deletedStock', deletedItems);
      const medicines = getStore<any[]>('medicines', []);
      const cleanItem = { ...restoredItem };
      delete cleanItem.deleted_at;
      medicines.push(cleanItem);
      setStore('medicines', medicines);
      return { success: true };
    },
    permanentDeleteStock: async ({ id }: { id: number }) => {
      const deletedItems = getStore<any[]>('deletedStock', []);
      setStore('deletedStock', deletedItems.filter((m: any) => m.id !== id));
      return { success: true };
    },

    // Reminders
    listReminders: async () => ({ success: true, reminders: [] }),
    createReminder: async (data: any) => ({ success: true, reminder: { id: 1, ...data } }),
    updateReminder: async (data: any) => ({ success: true, reminder: { ...data } }),
    deleteReminder: async ({ id }: { id: number }) => ({ success: true }),

    // Documents
    listDocuments: async () => ({ success: true, documents: [] }),
    uploadDocument: async (data: any) => {
      const documents = getStore<any[]>('documents', []);
      const doc = { id: nextId(documents), ...data, created_at: now() };
      documents.push(doc);
      setStore('documents', documents);
      return { success: true };
    },
    deleteDocument: async ({ id }: { id: number }) => {
      let documents = getStore<any[]>('documents', []).filter((d: any) => d.id !== id);
      setStore('documents', documents);
      return { success: true };
    },

    // AI Insights
    getAIInsights: async () => ({
      success: true,
      insights: [
        { id: 1, title: 'Stock Optimization', message: 'Paracetamol 500mg has 2 batches near expiry. Consider promotion.', type: 'warning', is_actioned: 0, created_at: now() },
        { id: 2, title: 'Sales Trend', message: 'Antibiotics sales increased 15% this month. Restock Amoxicillin.', type: 'info', is_actioned: 0, created_at: now() },
        { id: 3, title: 'Reorder Alert', message: 'Ibuprofen 400mg is out of stock. Place order with MediCorp.', type: 'critical', is_actioned: 0, created_at: now() },
      ]
    }),
    markInsightActioned: async ({ id }: { id: number }) => ({ success: true }),
    generateAIReport: async ({ reportType }: { reportType: string }) => ({
      success: true,
      report: `AI Report (${reportType}) generated at ${now()}`
    }),
  };

  (window as any).electronAPI = api;
}
