export interface User {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'sales' | 'purchase_mgr' | 'pharmacist';
  lastLogin?: string;
  isActive?: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  drug_license_no: string | null;
  transporter_name: string | null;
  vehicle_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface Medicine {
  id: number;
  name: string;
  strength: string | null;
  batch_number: string;
  pack_size: string | null;
  company: string | null;
  generic_name: string | null;
  manufacturer_id: number | null;
  manufacturer_name: string | null;
  quantity: number;
  loose_quantity: number;
  total_base_units: number;
  mrp: number | null;
  purchase_price: number | null;
  ptr: number | null;
  pts: number | null;
  retailer_margin_percent: number | null;
  selling_price: number | null;
  purchase_gst_percent: number | null;
  sale_gst_percent: number | null;
  hsn_code: string | null;
  schedule_type: string | null;
  barcode: string | null;
  rack_location: string | null;
  low_stock_alert: number | null;
  max_stock_limit: number | null;
  min_margin_percent: number | null;
  mfg_date: string | null;
  expiry_date: string | null;
  expiry_returnable: number | null;
  supplier_id: number | null;
  invoice_no: string | null;
  invoice_date: string | null;
  po_number: string | null;
  order_date: string | null;
  payment_terms: string | null;
  due_date: string | null;
  dispatch_location: string | null;
  item_code: string | null;
  scheme_qty: number | null;
  free_qty: number | null;
  scheme_bonus_code: string | null;
  discount_percent: number | null;
  taxable_amount: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  eway_bill_no: string | null;
  num_cartons: number | null;
  cold_chain: number | null;
  dosage_form?: string | null;
  category?: string | null;
  supplier_gstin?: string | null;
  added_by: number | null;
  created_at: string;
  updated_at: string;
  status: 'expired' | 'critical' | 'warning' | 'safe';
  days_remaining: number | null;
  custom_fields?: Record<string, any>;
}

export interface AddMedicineInput {
  name: string;
  strength?: string | null;
  batchNumber: string;
  packSize?: string | null;
  company: string;
  genericName?: string | null;
  manufacturerId?: number | null;
  quantity: number;
  looseQuantity?: number;
  mrp?: number | null;
  purchasePrice: number | null;
  ptr?: number | null;
  pts?: number | null;
  retailerMarginPercent?: number | null;
  sellingPrice: number | null;
  purchaseGstPercent?: number | null;
  saleGstPercent?: number | null;
  hsnCode?: string | null;
  scheduleType?: string | null;
  barcode?: string | null;
  rackLocation?: string | null;
  lowStockAlert?: number | null;
  maxStockLimit?: number | null;
  minMarginPercent?: number | null;
  mfgDate: string | null;
  expiryDate: string | null;
  expiryReturnable?: boolean | null;
  supplierId?: number | null;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  poNumber?: string | null;
  orderDate?: string | null;
  paymentTerms?: string | null;
  dueDate?: string | null;
  dispatchLocation?: string | null;
  itemCode?: string | null;
  schemeQty?: number | null;
  freeQty?: number | null;
  schemeBonusCode?: string | null;
  discountPercent?: number | null;
  taxableAmount?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  ewayBillNo?: string | null;
  numCartons?: number | null;
  coldChain?: number | null;
  prescriptionDoc?: string | null;
}

export interface SaleItem {
  batchId: number;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  looseQuantity?: number;
  expiryDate: string | null;
  purchasePrice: number | null;
  sellingPrice: number | null;
  discountPercent?: number;
  taxableValue?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  netAmount?: number;
}

export interface SaleRecord {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  customer_gstin: string | null;
  doctor_name: string | null;
  doctor_reg_no: string | null;
  prescription_type: string | null;
  medicine_name: string;
  quantity: number;
  total_amount: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  net_payable: number;
  payment_mode: string;
  counter_id: string | null;
  pharmacist_id: number | null;
  pharmacist_name: string | null;
  sale_date: string;
  processed_by: number;
  processed_by_name?: string;
  bill_number: string;
}

export interface PurchaseRecord {
  id: string;
  supplier_id: number;
  supplier_name: string;
  supplier_address: string | null;
  supplier_gstin: string | null;
  supplier_dl_no: string | null;
  invoice_no: string;
  invoice_date: string;
  po_number: string | null;
  order_date: string | null;
  payment_terms: string | null;
  due_date: string | null;
  dispatch_location: string | null;
  eway_bill_no: string | null;
  transporter_name: string | null;
  vehicle_number: string | null;
  num_cartons: number | null;
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_amount: number;
  processed_by: number;
  created_at: string;
}

export interface DashboardStats {
  totalMedicines: number;
  totalStock: number;
  totalValue: number;
  totalStockValue: number;
  totalRetailValue: number;
  expired: number;
  critical: number;
  lowStockItems: number;
  totalSalesToday: number;
  totalSalesMonth: number;
  totalPurchasesMonth: number;
  // Live Sales Ticker
  todayRevenue: number;
  todayItems: number;
  yesterdayRevenue: number;
  yesterdayItems: number;
  todayTransactions: number;
  recentSales: Array<{ customer: string; medicine: string; amount: number; qty: number; date: string }>;
}

export interface NavigationItem {
  icon: string;
  label: string;
  index: number;
  path: string;
  roles?: ('admin' | 'sales' | 'purchase_mgr' | 'pharmacist')[];
}

export interface BackupInfo {
  name: string;
  path: string;
  size: number;
  created: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  { icon: '📊', label: 'Dashboard', index: 0, path: 'dashboard', roles: ['admin', 'sales', 'purchase_mgr', 'pharmacist'] },
  { icon: '📦', label: 'Stock', index: 1, path: 'stock', roles: ['admin', 'sales', 'purchase_mgr', 'pharmacist'] },
  { icon: '➕', label: 'Add Stock', index: 2, path: 'add-stock', roles: ['admin', 'purchase_mgr'] },
  { icon: '🛒', label: 'Purchases', index: 3, path: 'purchases', roles: ['admin', 'purchase_mgr'] },
  { icon: '💰', label: 'Sales', index: 4, path: 'sales', roles: ['admin', 'sales', 'pharmacist'] },
  { icon: '📈', label: 'Reports', index: 5, path: 'reports', roles: ['admin', 'sales', 'purchase_mgr'] },
  { icon: '📷', label: 'Scan Invoice', index: 6, path: 'scan-invoice', roles: ['admin', 'purchase_mgr'] },
  { icon: '👥', label: 'User Mgmt', index: 7, path: 'users', roles: ['admin'] },
  { icon: '🔒', label: 'Backup', index: 8, path: 'backup', roles: ['admin'] },
  { icon: '⚙️', label: 'Settings', index: 9, path: 'settings', roles: ['admin'] },
  { icon: '🏢', label: 'Suppliers', index: 10, path: 'suppliers', roles: ['admin', 'purchase_mgr'] },
  { icon: '🏭', label: 'Manufacturers', index: 11, path: 'manufacturers', roles: ['admin', 'purchase_mgr'] },
  { icon: '💊', label: 'Generic Med.', index: 12, path: 'generic-medicines', roles: ['admin', 'purchase_mgr'] },
  { icon: '👤', label: 'Customers', index: 13, path: 'customers', roles: ['admin', 'sales'] },
  { icon: '🔄', label: 'Purchase Ret.', index: 14, path: 'purchase-returns', roles: ['admin', 'purchase_mgr'] },
  { icon: '↩️', label: 'Sales Returns', index: 15, path: 'sales-returns', roles: ['admin', 'sales'] },
  { icon: '🏠', label: 'Warehouses', index: 16, path: 'warehouses', roles: ['admin'] },
  { icon: '🚚', label: 'Stock Transf.', index: 17, path: 'stock-transfers', roles: ['admin'] },
  { icon: '💸', label: 'Expenses', index: 18, path: 'expenses', roles: ['admin'] },
  { icon: '🏷️', label: 'Pricing', index: 19, path: 'pricing', roles: ['admin'] },
  { icon: '🎯', label: 'Discounts', index: 20, path: 'discounts', roles: ['admin'] },
  { icon: '🧾', label: 'GST/HSN', index: 21, path: 'gst-hsn', roles: ['admin'] },
  { icon: '🤖', label: 'AI Insights', index: 22, path: 'ai-insights', roles: ['admin'] },
  { icon: '📁', label: 'Documents', index: 23, path: 'documents', roles: ['admin'] },
  { icon: '📅', label: 'Reminders', index: 24, path: 'reminders', roles: ['admin'] },
  { icon: '🔔', label: 'Notifications', index: 25, path: 'notifications', roles: ['admin'] },
  { icon: '📋', label: 'Sales History', index: 26, path: 'sales-history', roles: ['admin', 'sales', 'pharmacist'] },
  { icon: '🏗️', label: 'Data Import', index: 27, path: 'data-import', roles: ['admin', 'purchase_mgr'] },
  { icon: '🧠', label: 'AI Learning', index: 28, path: 'ai-learning', roles: ['admin'] },
  { icon: '📥', label: 'Import History', index: 29, path: 'import-history', roles: ['admin', 'purchase_mgr'] },
  { icon: '🗑️', label: 'Recycle Bin', index: 30, path: 'recycle-bin', roles: ['admin', 'purchase_mgr'] },
];

export interface Notification {
  id: number;
  user_id: number | null;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  is_read: number;
  action_url: string | null;
  created_at: string;
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'view_dashboard', 'view_stock', 'add_stock', 'edit_stock', 'delete_stock',
    'view_purchases', 'add_purchases', 'view_sales', 'make_sales',
    'view_reports', 'export_data', 'scan_invoices', 'manage_users',
    'change_settings', 'deactivate_license', 'view_backup',
  ],
  sales: [
    'view_dashboard', 'view_stock', 'view_sales', 'make_sales',
    'view_reports',
  ],
  purchase_mgr: [
    'view_dashboard', 'view_stock', 'add_stock', 'edit_stock',
    'view_purchases', 'add_purchases', 'view_reports', 'scan_invoices',
  ],
  pharmacist: [
    'view_dashboard', 'view_stock', 'view_sales', 'make_sales',
    'view_reports',
  ],
};