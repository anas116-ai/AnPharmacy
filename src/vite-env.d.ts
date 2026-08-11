/// <reference types="vite/client" />

import { User, Medicine, Notification, SaleItem, AddMedicineInput, DashboardStats, Supplier } from './lib/types';

interface ElectronAPI {
  dbInit: () => Promise<{ success: boolean; error?: string }>;
  login: (data: { username: string; password: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  listUsers: () => Promise<{ success: boolean; users?: any[]; error?: string }>;
  createUser: (data: { username: string; password: string; displayName: string; role: string }) => Promise<{ success: boolean; error?: string }>;
  toggleUserActive: (data: { id: number; isActive: boolean }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  getLicenseStatus: () => Promise<{ status: string; deviceId?: string; license?: any; error?: string }>;
  activateLicense: (data: { licenseKey: string }) => Promise<{ success: boolean; error?: string }>;
  deactivateLicense: () => Promise<{ success: boolean; error?: string }>;
  listStock: () => Promise<{ success: boolean; medicines?: Medicine[]; error?: string }>;
  addStock: (data: { medicine: AddMedicineInput; userId: number }) => Promise<{ success: boolean; id?: number; error?: string }>;
  saveAllStock: (data: { medicines: any[] }) => Promise<{ success: boolean; count?: number; error?: string }>;
  getBatches: (data: { medicineName: string }) => Promise<{ success: boolean; batches?: Medicine[]; error?: string }>;
  processSale: (data: { customerName: string; customerId?: number | null; customerPhone?: string | null; customerAddress?: string | null; customerGstin?: string | null; doctorName?: string | null; doctorRegNo?: string | null; prescriptionType?: string | null; medicineName: string; totalAmount: number; discountAmount?: number; taxableAmount?: number; cgstAmount?: number; sgstAmount?: number; igstAmount?: number; netPayable?: number; paymentMode?: string; counterId?: string | null; pharmacistId?: number | null; pharmacistName?: string | null; items: SaleItem[]; userId: number }) => Promise<{ success: boolean; saleId?: string; billNumber?: string; error?: string }>;
  listSales: () => Promise<{ success: boolean; sales?: any[]; error?: string }>;
  listPurchases: () => Promise<{ success: boolean; purchases?: any[]; error?: string }>;
  getStockReport: () => Promise<{ success: boolean; medicines?: any[]; stats?: any; error?: string }>;
  getExpiryReport: () => Promise<{ success: boolean; categories?: any; total?: number; error?: string }>;
  getExpiryTierReport: () => Promise<{ success: boolean; tiers?: any; stats?: any; error?: string }>;
  getProfitReport: () => Promise<{ success: boolean; rows?: any[]; stats?: any; error?: string }>;
  getSaleMarginReport: (days?: number) => Promise<{ success: boolean; rows?: any[]; stats?: any; error?: string }>;
  getReceivables: () => Promise<{ success: boolean; customers?: any[]; buckets?: any; totalOutstanding?: number; error?: string }>;
  getPayables: () => Promise<{ success: boolean; suppliers?: any[]; totalPayable?: number; count?: number; error?: string }>;
  getGst1Report: (month?: string) => Promise<{ success: boolean; summary?: any; error?: string }>;
  createPurchase: (data: { supplierName?: string; supplierGstin?: string; invoiceNo?: string; invoiceDate?: string; totalAmount?: number; items?: any[] }) => Promise<{ success: boolean; id?: string; supplierId?: number | null; totalQty?: number; error?: string }>;
  getSalesReport: () => Promise<{ success: boolean; sales?: any[]; stats?: any; error?: string }>;
  getDashboardStats: () => Promise<{ success: boolean; stats?: any; medicines?: any[]; error?: string }>;
  getImportHistory: () => Promise<{ success: boolean; imports?: any[]; error?: string }>;
  logImport: (data: { fileName: string; totalRows: number; validRows: number; invalidRows: number; errors: number; importedBy: string; newColumns?: string[] }) => Promise<{ success: boolean; error?: string }>;
  deleteImportLog: (data: { id: string }) => Promise<{ success: boolean; error?: string }>;
  clearImportLogs: () => Promise<{ success: boolean; error?: string }>;
  getSupplierAnalytics: () => Promise<{ success: boolean; analytics?: any[]; error?: string }>;
  createBackup: () => Promise<{ success: boolean; path?: string; key?: string; error?: string }>;
  restoreBackup: (data: { filePath: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  listBackups: () => Promise<{ success: boolean; backups?: any[]; error?: string }>;
  getAutoBackupSettings: () => Promise<{ success: boolean; settings?: { enabled: boolean; intervalHours: number; lastBackup: string | null }; error?: string }>;
  setAutoBackupSettings: (data: { enabled: boolean; intervalHours: number; lastBackup?: string | null }) => Promise<{ success: boolean; settings?: any; error?: string }>;
  autoCreateBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
  onAutoBackupCompleted: (callback: (result: { success: boolean; path?: string; error?: string }) => void) => void;
  openFileDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  saveFileDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  openImageDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  openPdfDialog: () => Promise<{ canceled: boolean; filePath?: string }>;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  logError: (data: { message: string; stack?: string; componentStack?: string }) => Promise<{ success: boolean }>;
  createSupplier: (data: any) => Promise<{ success: boolean; supplier?: any; error?: string }>;
  updateSupplier: (data: any) => Promise<{ success: boolean; supplier?: any; error?: string }>;
  deleteSupplier: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  listSuppliers: () => Promise<{ success: boolean; suppliers?: any[]; error?: string }>;
  getSupplierMedicines: (data: { supplierId: number }) => Promise<{ success: boolean; medicines?: any[]; error?: string }>;

  // Notifications
  listNotifications: (data: { user_id: number }) => Promise<{ success: boolean; notifications?: Notification[]; error?: string }>;
  markNotificationRead: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  markAllNotificationsRead: (data: { user_id: number }) => Promise<{ success: boolean; error?: string }>;
  createNotification: (data: { user_id: number; title: string; message: string; type: 'info' | 'warning' | 'critical' | 'success'; action_url?: string | null }) => Promise<{ success: boolean; notification?: Notification; error?: string }>;

  // Manufacturers
  listManufacturers: () => Promise<{ success: boolean; manufacturers?: any[]; error?: string }>;
  createManufacturer: (data: any) => Promise<{ success: boolean; manufacturer?: any; error?: string }>;
  updateManufacturer: (data: any) => Promise<{ success: boolean; manufacturer?: any; error?: string }>;
  deleteManufacturer: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // Generic Medicines
  listGenericMedicines: () => Promise<{ success: boolean; medicines?: any[]; error?: string }>;
  createGenericMedicine: (data: any) => Promise<{ success: boolean; medicine?: any; error?: string }>;
  updateGenericMedicine: (data: any) => Promise<{ success: boolean; medicine?: any; error?: string }>;
  deleteGenericMedicine: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // Customers
  listCustomers: () => Promise<{ success: boolean; customers?: any[]; error?: string }>;
  createCustomer: (data: any) => Promise<{ success: boolean; customer?: any; error?: string }>;
  updateCustomer: (data: any) => Promise<{ success: boolean; customer?: any; error?: string }>;
  deleteCustomer: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  getCustomerLedger: (data: { customerId: number }) => Promise<{ success: boolean; ledger?: any[]; error?: string }>;
  addCustomerLedger: (data: any) => Promise<{ success: boolean; ledger?: any; error?: string }>;

  // Purchase Returns
  listPurchaseReturns: () => Promise<{ success: boolean; returns?: any[]; error?: string }>;
  createPurchaseReturn: (data: any) => Promise<{ success: boolean; return?: any; error?: string }>;
  updatePurchaseReturnStatus: (data: { id: string; status: string; rejectReason?: string }) => Promise<{ success: boolean; error?: string }>;

  // Sales Returns
  listSalesReturns: () => Promise<{ success: boolean; returns?: any[]; error?: string }>;
  createSalesReturn: (data: any) => Promise<{ success: boolean; return?: any; error?: string }>;

  // Warehouses
  listWarehouses: () => Promise<{ success: boolean; warehouses?: any[]; error?: string }>;
  createWarehouse: (data: any) => Promise<{ success: boolean; warehouse?: any; error?: string }>;
  updateWarehouse: (data: any) => Promise<{ success: boolean; warehouse?: any; error?: string }>;
  deleteWarehouse: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // Stock Transfers
  listStockTransfers: () => Promise<{ success: boolean; transfers?: any[]; error?: string }>;
  createStockTransfer: (data: any) => Promise<{ success: boolean; transfer?: any; error?: string }>;
  receiveStockTransfer: (data: { id: number }) => Promise<{ success: boolean; transfer?: any; error?: string }>;

  // Expenses
  listExpenses: () => Promise<{ success: boolean; expenses?: any[]; error?: string }>;
  createExpense: (data: any) => Promise<{ success: boolean; expense?: any; error?: string }>;
  updateExpense: (data: any) => Promise<{ success: boolean; expense?: any; error?: string }>;
  deleteExpense: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // Price Rules
  listPriceRules: () => Promise<{ success: boolean; rules?: any[]; error?: string }>;
  createPriceRule: (data: any) => Promise<{ success: boolean; rule?: any; error?: string }>;
  deletePriceRule: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // Discount Schemes
  listDiscountSchemes: () => Promise<{ success: boolean; schemes?: any[]; error?: string }>;
  createDiscountScheme: (data: any) => Promise<{ success: boolean; scheme?: any; error?: string }>;
  updateDiscountScheme: (data: any) => Promise<{ success: boolean; scheme?: any; error?: string }>;
  deleteDiscountScheme: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // HSN Codes
  listHSNCodes: () => Promise<{ success: boolean; hsnCodes?: any[]; error?: string }>;
  createHSNCode: (data: any) => Promise<{ success: boolean; code?: any; error?: string }>;
  updateHSNCode: (data: any) => Promise<{ success: boolean; code?: any; error?: string }>;
  deleteHSNCode: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  assignMedicineHSN: (data: { medicineId: number; hsnCodeId: number }) => Promise<{ success: boolean; error?: string }>;
  getMedicineHSN: (data: { medicineId: number }) => Promise<{ success: boolean; hsn?: any; error?: string }>;

  // Recycle Bin
  deleteToBin: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  getDeletedStock: () => Promise<{ success: boolean; deletedItems?: any[]; error?: string }>;
  restoreFromBin: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;
  permanentDeleteStock: (data: { id: number }) => Promise<{ success: boolean; error?: string }>;

  // Reminders
  listReminders: () => Promise<{ success: boolean; reminders?: any[]; error?: string }>;
  createReminder: (data: any) => Promise<{ success: boolean; reminder?: any; error?: string }>;
  updateReminder: (data: any) => Promise<{ success: boolean; reminder?: any; error?: string }>;
  deleteReminder: (id: number) => Promise<{ success: boolean; error?: string }>;

  // Documents
  listDocuments: () => Promise<{ success: boolean; documents?: any[]; error?: string }>;
  uploadDocument: (data: any) => Promise<{ success: boolean; document?: any; error?: string }>;
  deleteDocument: (id: number) => Promise<{ success: boolean; error?: string }>;

  // Audit
  logAudit: (data: { userId: number; action: string; details: string }) => Promise<{ success: boolean }>;

  // AI Insights
  getAIInsights: () => Promise<{ success: boolean; insights?: any[]; error?: string }>;
  markInsightActioned: (id: number) => Promise<{ success: boolean; error?: string }>;
  generateAIReport: (reportType: string) => Promise<{ success: boolean; report?: any; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
