const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Desktop platform flag + window controls
  isDesktop: true,
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (callback) => ipcRenderer.on('window:maximized', (event, maximized) => callback(maximized)),
  showNativeNotification: (data) => ipcRenderer.invoke('notify:show', data),
  onMenuAction: (callback) => ipcRenderer.on('menu:action', (event, action) => callback(action)),

  // Database
  dbInit: () => ipcRenderer.invoke('db:init'),

  // Auth
  login: (data) => ipcRenderer.invoke('auth:login', data),

  // Users
  listUsers: () => ipcRenderer.invoke('users:list'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  toggleUserActive: (data) => ipcRenderer.invoke('users:toggleActive', data),
  deleteUser: (data) => ipcRenderer.invoke('users:delete', data),

  // Suppliers
  listSuppliers: () => ipcRenderer.invoke('suppliers:list'),
  createSupplier: (data) => ipcRenderer.invoke('suppliers:create', data),
  updateSupplier: (data) => ipcRenderer.invoke('suppliers:update', data),
  deleteSupplier: (data) => ipcRenderer.invoke('suppliers:delete', data),
  getSupplierMedicines: (data) => ipcRenderer.invoke('suppliers:getMedicines', data),
  getSupplierLedger: (data) => ipcRenderer.invoke('suppliers:getLedger', data),
  addSupplierPayment: (data) => ipcRenderer.invoke('suppliers:addPayment', data),

  // License
  getLicenseStatus: () => ipcRenderer.invoke('license:getStatus'),
  activateLicense: (data) => ipcRenderer.invoke('license:activate', data),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),

  // Stock
  listStock: () => ipcRenderer.invoke('stock:list'),
  addStock: (data) => ipcRenderer.invoke('stock:add', data),
  getBatches: (data) => ipcRenderer.invoke('stock:getBatches', data),
  saveAllStock: (data) => ipcRenderer.invoke('stock:saveAll', data),

  // Recycle Bin
  deleteToBin: (data) => ipcRenderer.invoke('stock:deleteToBin', data),
  getDeletedStock: () => ipcRenderer.invoke('stock:getDeleted'),
  restoreFromBin: (data) => ipcRenderer.invoke('stock:restoreFromBin', data),
  permanentDeleteStock: (data) => ipcRenderer.invoke('stock:permanentDelete', data),

  // Sales
  processSale: (data) => ipcRenderer.invoke('sales:process', data),
  listSales: () => ipcRenderer.invoke('sales:list'),

  // Purchases
  listPurchases: () => ipcRenderer.invoke('purchases:list'),

  // Reports
  getStockReport: () => ipcRenderer.invoke('reports:stock'),
  getExpiryReport: () => ipcRenderer.invoke('reports:expiry'),
  getExpiryTierReport: () => ipcRenderer.invoke('reports:expiryTiers'),
  getProfitReport: () => ipcRenderer.invoke('reports:profit'),
  getSaleMarginReport: (days) => ipcRenderer.invoke('reports:saleMargin', { days }),
  getReceivables: () => ipcRenderer.invoke('reports:receivables'),
  getPayables: () => ipcRenderer.invoke('reports:payables'),
  getGst1Report: (month) => ipcRenderer.invoke('reports:gst1', { month }),
  createPurchase: (data) => ipcRenderer.invoke('purchases:create', data),
  updatePurchaseReturnStatus: (data) => ipcRenderer.invoke('purchaseReturns:updateStatus', data),
  getSalesReport: () => ipcRenderer.invoke('reports:sales'),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:stats'),

  // Backup
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: (data) => ipcRenderer.invoke('backup:restore', data),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  getAutoBackupSettings: () => ipcRenderer.invoke('backup:getAutoBackupSettings'),
  setAutoBackupSettings: (data) => ipcRenderer.invoke('backup:setAutoBackupSettings', data),
  autoCreateBackup: () => ipcRenderer.invoke('backup:autoCreate'),
  onAutoBackupCompleted: (callback) => ipcRenderer.on('auto-backup:completed', (event, result) => callback(result)),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: () => ipcRenderer.invoke('dialog:saveFile'),
  openImageDialog: () => ipcRenderer.invoke('dialog:openImage'),
  openPdfDialog: () => ipcRenderer.invoke('dialog:openPdf'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  logError: (data) => ipcRenderer.invoke('app:logError', data),

  // Manufacturers
  listManufacturers: () => ipcRenderer.invoke('manufacturers:list'),
  createManufacturer: (data) => ipcRenderer.invoke('manufacturers:create', data),
  updateManufacturer: (data) => ipcRenderer.invoke('manufacturers:update', data),
  deleteManufacturer: (data) => ipcRenderer.invoke('manufacturers:delete', data),

  // Generic Medicines
  listGenericMedicines: () => ipcRenderer.invoke('generic:list'),
  createGenericMedicine: (data) => ipcRenderer.invoke('generic:create', data),
  updateGenericMedicine: (data) => ipcRenderer.invoke('generic:update', data),
  deleteGenericMedicine: (data) => ipcRenderer.invoke('generic:delete', data),

  // Customers
  listCustomers: () => ipcRenderer.invoke('customers:list'),
  createCustomer: (data) => ipcRenderer.invoke('customers:create', data),
  updateCustomer: (data) => ipcRenderer.invoke('customers:update', data),
  deleteCustomer: (data) => ipcRenderer.invoke('customers:delete', data),
  getCustomerLedger: (data) => ipcRenderer.invoke('customers:getLedger', data),
  addCustomerLedger: (data) => ipcRenderer.invoke('customers:addLedger', data),

  // Purchase Returns
  listPurchaseReturns: () => ipcRenderer.invoke('purchaseReturns:list'),
  createPurchaseReturn: (data) => ipcRenderer.invoke('purchaseReturns:create', data),

  // Sales Returns
  listSalesReturns: () => ipcRenderer.invoke('salesReturns:list'),
  createSalesReturn: (data) => ipcRenderer.invoke('salesReturns:create', data),

  // Warehouses
  listWarehouses: () => ipcRenderer.invoke('warehouses:list'),
  createWarehouse: (data) => ipcRenderer.invoke('warehouses:create', data),
  updateWarehouse: (data) => ipcRenderer.invoke('warehouses:update', data),
  deleteWarehouse: (data) => ipcRenderer.invoke('warehouses:delete', data),

  // Stock Transfers
  listStockTransfers: () => ipcRenderer.invoke('stockTransfers:list'),
  createStockTransfer: (data) => ipcRenderer.invoke('stockTransfers:create', data),
  receiveStockTransfer: (data) => ipcRenderer.invoke('stockTransfers:receive', data),

  // Expenses
  listExpenses: () => ipcRenderer.invoke('expenses:list'),
  createExpense: (data) => ipcRenderer.invoke('expenses:create', data),
  updateExpense: (data) => ipcRenderer.invoke('expenses:update', data),
  deleteExpense: (data) => ipcRenderer.invoke('expenses:delete', data),

  // Price Rules
  listPriceRules: () => ipcRenderer.invoke('priceRules:list'),
  createPriceRule: (data) => ipcRenderer.invoke('priceRules:create', data),
  deletePriceRule: (data) => ipcRenderer.invoke('priceRules:delete', data),

  // Discount Schemes
  listDiscountSchemes: () => ipcRenderer.invoke('discountSchemes:list'),
  createDiscountScheme: (data) => ipcRenderer.invoke('discountSchemes:create', data),
  updateDiscountScheme: (data) => ipcRenderer.invoke('discountSchemes:update', data),
  deleteDiscountScheme: (data) => ipcRenderer.invoke('discountSchemes:delete', data),

  // HSN Codes
  listHSNCodes: () => ipcRenderer.invoke('hsn:list'),
  createHSNCode: (data) => ipcRenderer.invoke('hsn:create', data),
  updateHSNCode: (data) => ipcRenderer.invoke('hsn:update', data),
  deleteHSNCode: (data) => ipcRenderer.invoke('hsn:delete', data),
  assignMedicineHSN: (data) => ipcRenderer.invoke('medicineHSN:assign', data),
  getMedicineHSN: (data) => ipcRenderer.invoke('medicineHSN:get', data),

  // Notifications
  listNotifications: (userId) => ipcRenderer.invoke('notifications:list', { userId }),
  createNotification: (data) => ipcRenderer.invoke('notifications:create', data),
  markNotificationRead: (id) => ipcRenderer.invoke('notifications:markRead', { id }),
  markAllNotificationsRead: (userId) => ipcRenderer.invoke('notifications:markAllRead', { userId }),

  // Reminders
  listReminders: () => ipcRenderer.invoke('reminders:list'),
  createReminder: (data) => ipcRenderer.invoke('reminders:create', data),
  updateReminder: (data) => ipcRenderer.invoke('reminders:update', data),
  deleteReminder: (id) => ipcRenderer.invoke('reminders:delete', { id }),

  // Documents
  listDocuments: () => ipcRenderer.invoke('documents:list'),
  uploadDocument: (data) => ipcRenderer.invoke('documents:upload', data),
  deleteDocument: (id) => ipcRenderer.invoke('documents:delete', { id }),

  // Audit
  logAudit: (data) => ipcRenderer.invoke('audit:log', data),

  // AI Insights
  getAIInsights: () => ipcRenderer.invoke('ai:getInsights'),
  markInsightActioned: (id) => ipcRenderer.invoke('ai:markInsightActioned', { id }),
  generateAIReport: (reportType) => ipcRenderer.invoke('ai:generateReport', { reportType }),

  // Import History
  getImportHistory: () => ipcRenderer.invoke('importHistory:list'),
  logImport: (data) => ipcRenderer.invoke('importHistory:log', data),
  deleteImportLog: (id) => ipcRenderer.invoke('importHistory:delete', { id }),
  clearImportLogs: () => ipcRenderer.invoke('importHistory:clearAll'),

  // Supplier Analytics
  getSupplierAnalytics: () => ipcRenderer.invoke('suppliers:getAnalytics'),

  // Pharmacy / Company Profile
  getCompanyProfile: () => ipcRenderer.invoke('company:getProfile'),
  saveCompanyProfile: (data) => ipcRenderer.invoke('company:saveProfile', data),
});
