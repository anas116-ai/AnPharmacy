# AnPharmacy — Project Plan

## 1. Project Overview

### 1.1 What is AnPharmacy?
AnPharmacy is a premium, offline-first pharmacy management and distribution system built as an Electron desktop application. It streamlines the complete lifecycle of pharmaceutical inventory — from manufacturer procurement and batch tracking to distributor sales and expiry monitoring. The system is designed for three primary user personas:

- **Manufacturers / Procurement Teams**: Manage incoming stock, batch numbers, purchase pricing, and supplier information.
- **Distributors / Warehouse Teams**: Oversee inventory levels, monitor expiry timelines (FEFO — First Expired First Out), and generate stock reports.
- **Sales Teams**: Process customer sales, auto-select optimal batches via FEFO logic, and track revenue.

### 1.2 Goals
- Provide a **reliable offline-first** experience with local SQLite persistence.
- Ensure **license-protected** distribution with hardware-bound activation.
- Deliver a **premium, healthcare-grade UI** that conveys trust, precision, and luxury.
- Enable **role-based access control** (Admin, Sales, Purchase Manager).
- Support **complete audit trails**, encrypted backups, and data integrity.

### 1.3 Target Users
| Role | Description | Key Permissions |
|------|-------------|----------------|
| Administrator | Full system control | All permissions |
| Sales Representative | Process sales, view reports | View dashboard, stock, sales, reports |
| Purchase Manager | Add/manage stock, view purchases | Dashboard, stock, purchases, reports |

---

## 2. Current Status

### 2.1 Project Skeleton (Completed)
- [x] Vite + React 19 + TypeScript project scaffolded
- [x] Electron main/preload/database processes wired
- [x] Path aliases (`@/`) configured in Vite and TS
- [x] Hot reload dev workflow (`npm run dev`)

### 2.2 Electron Setup (Completed)
- [x] `electron/main.cjs` — Main window, IPC routing, lifecycle
- [x] `electron/preload.cjs` — Context bridge exposing `window.electronAPI`
- [x] `electron/database.cjs` — SQLite schema + seed data via `better-sqlite3`
- [x] Context isolation + security best practices
- [x] Dev/prod URL switching

### 2.3 Database Schema (Completed)
| Table | Fields | Purpose |
|-------|--------|---------|
| `medicines` | id, name, batch_number, supplier_id, company, quantity, purchase_price, selling_price, mfg_date, expiry_date, added_by, timestamps | Core inventory |
| `sales` | id, customer_name, medicine_name, quantity, total_amount, sale_date, processed_by, timestamps | Transaction log |
| `license_info` | id, license_key, hwid, expiry_date, status, last_heartbeat, activated_on | License state |
| `audit_log` | id, user_id, action, details, timestamp | Compliance trail |
| `users` | id, username, password_hash, display_name, role, last_login, is_active, created_at | Auth |
| `suppliers` | id, name, contact_person, phone, email, address, gstin, notes, created_at | Supplier management |

### 2.4 Backend IPC Handlers (Completed)
- [x] Auth: login with SHA-256 password hashing
- [x] Users: CRUD (create, toggle active, delete)
- [x] License: status check, activate, deactivate
- [x] Stock: list, add, batch lookup
- [x] Sales: process sale (with FEFO), list
- [x] Purchases: derived from medicines table
- [x] Reports: stock report, expiry report, sales report
- [x] Dashboard: aggregated stats
- [x] Backup: AES-256 encrypted backup/restore with HMAC integrity + safety backup
- [x] Dialogs: open/save file dialogs
- [x] Suppliers: CRUD operations

### 2.5 Frontend Stores (Completed)
| Store | Purpose |
|-------|---------|
| `authStore` (Zustand) | User session, license status, permissions |
| `stockStore` (Zustand) | Medicines list, dashboard stats |
| `settingsStore` (Zustand) | Language preference |
| `supplierStore` (Zustand) | Suppliers list |

### 2.6 UI Component Library (Completed)
- [x] `Button` — CVA variants (default, destructive, outline, secondary, ghost, glass, success, warning)
- [x] `Card` — Variants: default, glass, gradient, bordered
- [x] `Badge` — Variants for statuses (expired, critical, warning, safe, glass)
- [x] `Table` — Premium table with hover states
- [x] `Dialog` — Backdrop + animated content
- [x] `Tabs` — Report switching
- [x] `Input` — Focus ring styles
- [x] `Select` — Styled select
- [x] `Toast` — Notification system with context provider

### 2.7 Screens Implemented (Completed)
| Screen | Status | Description |
|--------|--------|-------------|
| Splash Screen | ✅ | Animated loading with progress bar |
| License Activation | ✅ | Key entry, deactivation, HWID display |
| Login Screen | ✅ | Username/password auth with gradient design |
| Dashboard | ✅ | KPI cards, expiry distribution bar, filter chips, medicine list, charts |
| Stock Management | ✅ | Search, filter (all/near expiry/expired), detail modal |
| Add Stock | ✅ | Form with validation, batch/company/pricing |
| Sales | ✅ | FEFO batch selection, customer entry, transaction |
| Purchases | ✅ | Derived view from stock additions |
| Reports | ✅ | Stock, expiry, sales reports with Excel export |
| User Management | ✅ | Add, activate/deactivate, delete users |
| Backup & Restore | ✅ | Encrypted backup list, restore flow |
| Settings | ✅ | Language, license info, data management, logout |
| Scan Invoice | ✅ | OCR scanning with Tesseract.js, PDF support, sample data, edit/export |

### 2.8 Core Utilities (Completed)
- [x] `i18next` — English translations scaffolded
- [x] `fefo.ts` — First Expired First Out algorithm
- [x] `utils.ts` — Date/currency formatting, status helpers, CN utility
- [x] `ocrParser.ts` — OCR text parsing with confidence scoring
- [x] `types.ts` — TypeScript interfaces and navigation config
- [x] `useToast.ts` — Toast notification hook
- [x] `useTheme.ts` — Dark/light theme toggle hook
- [x] Global CSS — Premium animations, glassmorphism, sidebar, scrollbar, shimmer

### 2.9 Charts & Visualizations (Completed)
- [x] `ExpiryPieChart` — Doughnut chart for expiry distribution
- [x] `SalesTrendChart` — Line chart for sales trends
- [x] Chart.js integration with premium styling

### 2.10 Theme System (Completed)
- [x] Dark mode toggle with system preference detection
- [x] Persistent theme storage
- [x] Dark mode variants for all components

---

## 3. Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 19.2.7 | UI rendering |
| **Language** | TypeScript | 7.0.2 | Type safety |
| **Build Tool** | Vite | 8.1.5 | Dev server + bundling |
| **Desktop** | Electron | 43.1.1 | Native app wrapper |
| **Styling** | Tailwind CSS | 3.4.19 | Utility-first CSS |
| **Animation** | tailwindcss-animate | 1.0.7 | CSS animation utilities |
| **State Management** | Zustand | 5.0.14 | Client state |
| **Database** | better-sqlite3 | 12.11.1 | Local SQLite persistence |
| **i18n** | i18next + react-i18next | 26.3.6 / 17.0.10 | Internationalization |
| **Icons** | Lucide React | 1.25.0 | Icon system |
| **Utilities** | clsx + tailwind-merge | 2.1.1 / 3.6.0 | Class name merging |
| **Component Variants** | class-variance-authority | 0.7.1 | Button/badge variants |
| **Spreadsheet Export** | xlsx | 0.18.5 | Excel report generation |
| **Encryption** | crypto-js | 4.2.0 | Frontend encryption fallback |
| **UUID** | uuid | 14.0.1 | ID generation |
| **OCR** | tesseract.js | 5.0.3 | Optical character recognition |
| **Charts** | chart.js + react-chartjs-2 | 4.4.1 / 5.3.0 | Data visualization |
| **PDF** | pdfjs-dist | 5.2.1 | PDF processing |

---

## 4. Complete Feature List

### 4.1 Authentication & License
- [x] Splash screen with animated loading
- [x] License activation (key validation, HWID binding, expiry check)
- [x] Login with username/password (SHA-256 hashed)
- [x] Auto-login on subsequent launches (session persistence)
- [x] Role-based access control (Admin, Sales, Purchase Manager)
- [x] Permission enforcement per screen

### 4.2 Inventory Management (Stock)
- [x] Add stock with batch number, company, pricing, dates
- [x] List all medicines with expiry status
- [x] Search by name, batch, or company
- [x] Filter by expiry status (All, Near Expiry, Expired)
- [x] Expiry status calculation (expired/critical/warning/safe)
- [x] Days remaining calculation
- [x] Stock detail view
- [x] Supplier association

### 4.3 Sales & FEFO
- [x] Process sales with customer name
- [x] Auto-select batches using FEFO algorithm
- [x] Multi-batch sale support
- [x] Stock deduction per batch
- [x] Transaction atomicity
- [x] Sale history list

### 4.4 Purchases
- [x] Derived purchase view from stock additions
- [x] Supplier/company grouping
- [x] Purchase value calculation
- [x] Purchase history with user attribution

### 4.5 Reports & Analytics
- [x] Stock report (medicines, stats)
- [x] Expiry report (categorized: expired, critical, warning, safe)
- [x] Sales report (revenue, avg sale value)
- [x] Excel export (.xlsx)
- [x] Dashboard KPI cards
- [x] Expiry distribution visualization (bar chart)
- [x] Sales trend visualization (line chart)

### 4.6 User Management
- [x] Create users (admin only)
- [x] Toggle user active/inactive
- [x] Delete users (admin protection)
- [x] View last login timestamp
- [x] Role-based display

### 4.7 Supplier Management
- [x] Create suppliers with full contact details
- [x] Update supplier information
- [x] Delete suppliers (with medicine count check)
- [x] View medicines per supplier
- [x] Supplier list with search

### 4.8 Backup & Restore
- [x] AES-256 encrypted backup creation
- [x] HMAC integrity verification
- [x] Safety backup before restore
- [x] Backup list with size/date
- [x] Restore from .anpbackup files
- [x] File dialogs (open/save)

### 4.9 Invoice Scanning
- [x] Image upload (camera/gallery)
- [x] PDF upload support
- [x] Tesseract.js OCR integration
- [x] Sample data for testing
- [x] Confidence scoring
- [x] Edit parsed items
- [x] Add to stock from OCR results
- [x] Rescan and clear functionality

### 4.10 Settings & Configuration
- [x] Language selection (English scaffolded)
- [x] License information display
- [x] Data management actions
- [x] App version display
- [x] Logout

### 4.11 Premium UI/UX
- [x] Glassmorphism effects
- [x] Gradient KPI cards with hover animations
- [x] Animated sidebar with collapse/expand
- [x] Premium scrollbar styling
- [x] Shimmer loading skeletons
- [x] Page transition animations
- [x] Toast notifications
- [x] Micro-interactions (hover states, transitions)
- [x] Dark mode support with system preference detection
- [x] Chart.js visualizations with premium styling

---

## 5. Step-by-Step Development Plan

### Wave 1: Foundation (Completed)
**Goal:** Establish the project skeleton, Electron setup, database, and basic IPC layer.

1. Initialize Vite + React + TypeScript project
2. Configure Tailwind CSS with premium theme
3. Set up Electron (main, preload, database)
4. Design and implement SQLite schema
5. Build IPC bridge (electronAPI)
6. Implement auth + license backend handlers
7. Create Zustand stores (auth, stock, settings, supplier)
8. Build core UI components (Button, Card, Badge, Table, Dialog, Input, Select, Tabs, Toast)
9. Create splash, license, and login screens

### Wave 2: Core Features (Completed)
**Goal:** Implement all primary business logic and screens.

1. Build MainShell (sidebar + top bar + routing)
2. Implement Dashboard with KPI cards and expiry overview
3. Build Stock Management (list, search, filter, detail)
4. Build Add Stock form with validation
5. Implement Sales with FEFO algorithm
6. Build Purchases derived view
7. Build Reports (stock, expiry, sales) + Excel export
8. Build User Management
9. Build Supplier Management
10. Build Backup & Restore with encryption
11. Build Settings screen
12. Create Scan Invoice with OCR support

### Wave 3: Polish & Premium UX (Completed)
**Goal:** Elevate the UI to a luxury healthcare standard.

1. Refine all screen layouts with bento grid patterns
2. Add micro-interactions (hover, click, loading states)
3. Implement toast notification system
4. Add chart visualizations (expiry distribution, sales trends)
5. Dark mode support refinement
6. Loading skeletons for all data-fetching screens
7. Empty states with illustrations
8. Theme toggle with persistent storage
9. Premium scrollbar and glassmorphism effects

### Wave 4: Advanced Features (Complete)
**Goal:** Add professional-grade capabilities for enterprise use.

1. **Error Boundaries** — ✅ React error boundaries with logging
2. **Input Validation** — ✅ Comprehensive validation library + real-time
3. **Keyboard Shortcuts** — ✅ Global navigation shortcuts + help modal
4. **Print-friendly Report Layouts** — ✅ Full print stylesheet
5. **Advanced filtering** — ✅ Date ranges, search, filter logic
6. **Data import** — ✅ CSV parser + import dialog
7. **Barcode/QR code generation** — ✅ Batch and medicine codes
8. **Email export** — ⏳ PDF reports via email (requires email service)
9. **Automatic backup scheduling** — ⏳ Scheduled backups (requires node-schedule)
10. **Expiry alert notifications** — ⏳ Proactive alerts (requires notification system)
11. **Multi-currency support** — ⏳ Currency support (UI ready)
12. **Advanced analytics** — ⏳ Trends, forecasting (charts ready)

### Wave 5: Distribution & Deployment (Pending)
**Goal:** Package and distribute the application.

1. Configure electron-builder for Windows (NSIS installer)
2. Add app icon and splash branding
3. Implement auto-update mechanism
4. Create installer with license agreement
5. Code signing setup
6. Release pipeline documentation

### Wave 6: MDOS Blueprint Features (Pending)
**Goal:** Implement all modules from MDOS blueprint for complete pharmacy management.

#### User Roles & Access
1. Super Admin — Full access override
2. Manager — View & Manage permissions
3. Accounts — Accounts & Finance access
4. Store Keeper — Inventory & Stock access

#### Core Modules
5. Medicine Master — Complete medicine database
6. Generic Medicines — Generic name mapping
7. Manufacturers — Manufacturer master data
8. Customers — Customer management with ledger
9. Purchase Return — Return medicines to suppliers
10. Sales Return — Process customer returns
11. Batch Manager — Advanced batch management
12. Stock Transfer — Inter-warehouse stock movement
13. Expense Management — Track operational expenses
14. Warehouse Management — Multi-warehouse support
15. Price Management — Dynamic pricing rules
16. Discount Management — Discount schemes and approvals
17. GST & HSN Management — Tax compliance, HSN codes

#### Advanced Features
18. AI Business Insights — AI-powered recommendations
19. AI Chat Assistant — Voice commands and AI chat
20. Voice Assistant — Voice input for operations
21. Notifications — Smart alerts and reminders
22. Calendar & Reminders — Business calendar
23. Document Manager — Centralized document storage
24. AI Report Generator — Natural language report generation

#### Additional Features
25. Accounts & Finance — Complete accounting module
26. Reports & Analytics — Advanced analytics dashboard
27. Data Export Center — Universal export for all data

---

## 6. Progress Tracking Table

| # | Step | Wave | Status | Notes |
|---|------|------|--------|-------|
| 1 | Project initialization (Vite + React + TS) | 1 | ✅ Complete | |
| 2 | Tailwind CSS config with premium theme | 1 | ✅ Complete | Custom animations, glassmorphism, sidebar styles |
| 3 | Electron main process setup | 1 | ✅ Complete | Window management, lifecycle |
| 4 | Electron preload + context bridge | 1 | ✅ Complete | Secure IPC exposure |
| 5 | SQLite database schema | 1 | ✅ Complete | 6 tables, indexes, foreign keys |
| 6 | Seed data + default users | 1 | ✅ Complete | 3 roles, sample medicines, sample sales |
| 7 | IPC handlers (auth, users, license) | 1 | ✅ Complete | SHA-256 passwords, HWID license |
| 8 | IPC handlers (stock, sales, reports) | 1 | ✅ Complete | Transactions, FEFO backend |
| 9 | IPC handlers (backup/restore) | 1 | ✅ Complete | AES-256 + HMAC + safety backup |
| 10 | IPC handlers (suppliers) | 2 | ✅ Complete | CRUD operations |
| 11 | Zustand stores (auth, stock, settings, supplier) | 1 | ✅ Complete | |
| 12 | Core UI components library | 1 | ✅ Complete | 9 components with CVA variants |
| 13 | i18n scaffold (English) | 1 | ✅ Complete | i18next + react-i18next |
| 14 | Splash Screen | 1 | ✅ Complete | Animated logo + progress |
| 15 | License Activation Screen | 1 | ✅ Complete | Key validation, HWID display |
| 16 | Login Screen | 1 | ✅ Complete | Gradient background, role hints |
| 17 | MainShell (sidebar + routing) | 2 | ✅ Complete | Collapsible sidebar, role-based nav |
| 18 | Dashboard | 2 | ✅ Complete | 5 KPI cards, expiry bar, charts |
| 19 | Stock Management | 2 | ✅ Complete | Search, filter, status badges |
| 20 | Add Stock | 2 | ✅ Complete | Form with all fields |
| 21 | Sales with FEFO | 2 | ✅ Complete | Multi-batch selection |
| 22 | Purchases | 2 | ✅ Complete | Derived from medicines |
| 23 | Reports + Excel Export | 2 | ✅ Complete | 3 report types |
| 24 | User Management | 2 | ✅ Complete | CRUD + role enforcement |
| 25 | Supplier Management | 2 | ✅ Complete | Full CRUD with medicine linking |
| 26 | Backup & Restore | 2 | ✅ Complete | Encrypted .anpbackup format |
| 27 | Settings | 2 | ✅ Complete | Language, license, data, logout |
| 28 | Scan Invoice (OCR) | 2 | ✅ Complete | Tesseract.js, PDF, sample data |
| 29 | Toast notification system | 3 | ✅ Complete | Context-based, auto-dismiss |
| 30 | Chart visualizations | 3 | ✅ Complete | Chart.js with premium styling |
| 31 | Dark mode refinement | 3 | ✅ Complete | System preference detection, toggle |
| 32 | Loading skeletons | 3 | ✅ Complete | Shimmer effects for data loading |
| 33 | Premium animations | 3 | ✅ Complete | Page transitions, micro-interactions |
| 34 | Error boundaries | 4 | ✅ Complete | React error boundaries with logging |
| 35 | Input validation | 4 | ✅ Complete | Comprehensive validation library + real-time |
| 36 | Keyboard shortcuts | 4 | ✅ Complete | Global navigation shortcuts + help modal |
| 37 | Print-friendly reports | 4 | ✅ Complete | Full print stylesheet with page breaks |
| 38 | Advanced filtering | 4 | ✅ Complete | Date ranges, search, filter logic |
| 39 | Data import (CSV/Excel) | 4 | ✅ Complete | CSV parser + import dialog integrated |
| 40 | Barcode/QR code generation | 4 | ✅ Complete | Utility functions for QR/barcode generation |
| 41 | Email export | 4 | ⏳ Pending | PDF reports via email (requires email service) |
| 42 | Auto-backup scheduling | 4 | ⏳ Pending | Scheduled backups (requires node-schedule) |
| 43 | Expiry alerts | 4 | ⏳ Pending | Proactive notifications (requires system tray) |
| 44 | Multi-currency | 4 | ⏳ Pending | Currency support (UI ready, needs formatter) |
| 45 | Advanced analytics | 4 | ⏳ Pending | Trends, forecasting (charts ready) |
| 46 | Electron-builder packaging | 5 | ✅ Complete | Multi-platform config |
| 47 | Auto-update mechanism | 5 | ⏳ Pending | electron-updater |
| 48 | Code signing + release | 5 | ⏳ Pending | Production build pipeline |

---

## 7. UI/UX Design Direction

### 7.1 Design Philosophy
AnPharmacy adopts a **premium healthcare luxury** aesthetic — clean, trustworthy, and precise. The design draws inspiration from leading design systems (UI UX Pro Max, Open Design, Reflex) and modern web trends.

### 7.2 Color System

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#0d6b6b` (teal-900) | Brand identity, sidebar, active states |
| Primary Light | `#14b8a6` (teal-500) | Gradients, accents, buttons |
| Background | `from-slate-50 via-white to-teal-50` | Page background gradient |
| Card | White with subtle borders | Content containers |
| Text Primary | `#111827` (gray-900) | Headings, body |
| Text Secondary | `#6b7280` (gray-500) | Labels, metadata |
| Success | `#10b981` → `#059669` | Safe stock, confirmations |
| Warning | `#f59e0b` → `#d97706` | Near-expiry alerts |
| Critical | `#ef4444` → `#dc2626` | Expired, errors |
| Sidebar | `from-teal-900 via-teal-800 to-teal-950` | Navigation panel |

### 7.3 Typography
- **Primary Font:** Inter (with fallbacks: Segoe UI, system-ui)
- **Mono Font:** JetBrains Mono (for batch numbers, IDs)
- **Scale:** text-xs → text-2xl for headings
- **Weights:** font-medium for UI, font-bold for emphasis

### 7.4 Visual Effects

#### Glassmorphism
- Cards: `bg-white/80 backdrop-blur-xl border border-white/30`
- Dark panels: `bg-teal-800/80 backdrop-blur-xl`
- Dialogs: `backdrop-blur-sm` on overlay

#### Gradients
- Buttons: `bg-gradient-to-r from-teal-600 to-teal-500`
- KPI cards: Top accent bar with gradient
- Sidebar: `bg-gradient-to-b from-teal-900 via-teal-800 to-teal-950`

#### Shadows
- Soft: `0 2px 15px -3px rgba(0,0,0,0.07)`
- Medium: `0 4px 20px -2px rgba(0,0,0,0.08)`
- Strong: `0 8px 30px -4px rgba(0,0,0,0.1)`
- Glow teal: `0 0 20px rgba(13,107,107,0.15)`

### 7.5 Layout Patterns

#### Bento Grid
- KPI cards use a responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-5`
- Reports use tab-based bento layout
- Dashboard content max-width constrained: `max-w-7xl mx-auto`

#### Micro-interactions
- Hover: Cards lift `translateY(-4px)` with shadow escalation
- Buttons: Scale on hover `hover:scale-105`, shrink on active `active:scale-95`
- Sidebar items: Slide right `translateX(4px)` on hover
- Badges: Pulse animation for critical status
- Page transitions: Fade + slide up on navigation

### 7.6 Component Design Principles
1. **Consistent Border Radius:** `rounded-xl` (12px) for cards, `rounded-2xl` (16px) for elevated elements
2. **Consistent Spacing:** Padding scale based on `p-4`, `p-5`, `p-6`, `px-6`
3. **Focus States:** Ring with `ring-teal-500/50` for accessibility
4. **Status Indicators:** Colored dots with pulse for critical states
5. **Loading States:** Shimmer skeletons + animated spinners

### 7.7 Responsive Breakpoints
- Mobile: `< 768px` — Single column, collapsed sidebar
- Tablet: `768px - 1024px` — 2-column grids
- Desktop: `> 1024px` — Full layout, 5-column KPI grid
- Min window: `1024x700` (Electron constraint)

### 7.8 Animation Timeline
| Interaction | Duration | Easing |
|-------------|----------|--------|
| Page enter | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Card hover | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Button press | 200ms | ease |
| Sidebar collapse | 300ms | ease-in-out |
| Dialog enter | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast slide | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

---

## 8. Next Immediate Steps

### Priority 1: Production Readiness
1. **Error Boundaries** — Add React error boundaries for graceful failure handling.
2. **Input Validation** — Strengthen form validation across Add Stock, Sales, and User Management.
3. **Keyboard Shortcuts** — Add shortcuts for common actions (Ctrl+N for new stock, Ctrl+S for sales, etc.).
4. **Advanced Filtering** — Date range filters, advanced search capabilities.

### Priority 2: Enhanced Features
5. **Print-friendly Reports** — Optimize reports for printing and PDF export.
6. **Data Import** — CSV/Excel bulk import for medicines.
7. **Barcode/QR Code Generation** — For batches and medicines.
8. **Email Export** — PDF reports via email integration.

### Priority 3: Automation & Intelligence
9. **Automatic Backup Scheduling** — Scheduled backups with configurable intervals.
10. **Expiry Alert Notifications** — Proactive alerts for near-expiry medicines.
11. **Multi-currency Support** — Support for different currencies in pricing.
12. **Advanced Analytics** — Trends, forecasting, predictive analytics for stock management.

### Priority 4: Distribution
13. **Electron Builder Config** — Finalize NSIS installer, add app icon, configure auto-update.
14. **Code Signing** — Set up Windows code signing for production releases.
15. **Release Pipeline** — Documentation and CI/CD setup.

---

## 9. Implementation Roadmap

### Phase 1: Error Handling & Validation (Week 1)
**Goal:** Improve application stability and data quality.

1. Add error boundary component
2. Enhance form validation with real-time feedback
3. Implement proper error messages and user guidance
4. Add input sanitization

**Files to Create:**
- `src/components/ErrorBoundary.tsx`
- `src/lib/validation.ts`

**Files to Modify:**
- `src/components/AddStock.tsx` — Add validation
- `src/components/Sales.tsx` — Add validation
- `src/components/UserManagement.tsx` — Add validation
- `src/App.tsx` — Wrap with error boundary

### Phase 2: Keyboard Shortcuts & UX (Week 2)
**Goal:** Improve user productivity with keyboard navigation.

1. Implement global keyboard shortcuts
2. Add shortcut help modal
3. Implement focus management
4. Add keyboard navigation for tables

**Files to Create:**
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/KeyboardShortcutsHelp.tsx`

**Files to Modify:**
- `src/components/MainShell.tsx` — Add shortcut listener

### Phase 3: Advanced Reporting (Week 3)
**Goal:** Enhance reporting capabilities.

1. Add date range filters to reports
2. Implement print-friendly layouts
3. Add PDF export functionality
4. Create custom report builder

**Files to Modify:**
- `src/components/Reports.tsx` — Add date filters
- Create print styles in `src/index.css`

### Phase 4: Data Import/Export (Week 4)
**Goal:** Enable bulk data operations.

1. Implement CSV import for medicines
2. Add Excel export for all data tables
3. Create import validation and preview
4. Add data mapping configuration

**Files to Create:**
- `src/lib/csvParser.ts`
- `src/components/DataImport.tsx`

### Phase 5: Distribution Preparation (Week 5)
**Goal:** Prepare application for production deployment.

1. Configure electron-builder
2. Add app icons and branding
3. Implement auto-updater
4. Create installer scripts
5. Document release process

**Files to Modify:**
- `package.json` — Add build scripts
- Create `electron-builder.json`
- Update `electron/main.cjs` — Add auto-updater

---

## 10. Quality Standards

### 10.1 Code Quality
- **TypeScript:** Strict mode enabled, no `any` types unless necessary
- **ESLint:** Enforce consistent code style
- **Prettier:** Auto-formatting on save
- **Comments:** JSDoc for public functions and complex logic
- **Testing:** Unit tests for critical functions (FEFO, validation, OCR parser)

### 10.2 Performance
- **Bundle Size:** Keep initial bundle under 500KB
- **Lazy Loading:** Implement code splitting for routes
- **Memoization:** Use React.memo and useMemo for expensive computations
- **Database:** Indexed queries, connection pooling
- **Memory:** Clean up event listeners, avoid memory leaks

### 10.3 Security
- **Authentication:** SHA-256 password hashing
- **Authorization:** Role-based access control on all routes
- **Data Encryption:** AES-256 for backups
- **Input Validation:** Sanitize all user inputs
- **SQL Injection:** Use parameterized queries only
- **License:** Hardware-bound activation with expiry

### 10.4 Accessibility
- **WCAG 2.1:** AA compliance
- **Keyboard Navigation:** Full keyboard support
- **Screen Readers:** ARIA labels and semantic HTML
- **Color Contrast:** Minimum 4.5:1 ratio
- **Focus Indicators:** Visible focus states on all interactive elements

---

## 11. Testing Strategy

### 11.1 Manual Testing
- [ ] Feature testing for each module
- [ ] Cross-browser compatibility (Electron)
- [ ] Dark/light mode testing
- [ ] Responsive layout testing
- [ ] Print layout testing
- [ ] Keyboard shortcut testing

### 11.2 Automated Testing
- [ ] Unit tests for utility functions
- [ ] Integration tests for IPC handlers
- [ ] Component tests for critical UI
- [ ] E2E tests for main user flows

### 11.3 Performance Testing
- [ ] Database query performance
- [ ] Large dataset handling (1000+ medicines)
- [ ] Memory usage profiling
- [ ] Startup time optimization

---

## 12. Documentation

### 12.1 User Documentation
- [ ] User manual with screenshots
- [ ] Feature tutorials
- [ ] FAQ section
- [ ] Troubleshooting guide

### 12.2 Developer Documentation
- [ ] Architecture overview
- [ ] Setup instructions
- [ ] Contribution guidelines
- [ ] API documentation (IPC handlers)
- [ ] Database schema documentation

### 12.3 Deployment Documentation
- [ ] Build instructions
- [ ] Release process
- [ ] Update mechanism
- [ ] Code signing setup

---

## 13. Maintenance & Support

### 13.1 Bug Fixes
- **Priority 1:** Critical bugs affecting data integrity
- **Priority 2:** Major bugs affecting functionality
- **Priority 3:** Minor bugs and UI issues
- **Priority 4:** Enhancement requests

### 13.2 Updates
- **Security Updates:** Immediate response
- **Feature Updates:** Monthly releases
- **Bug Fixes:** Bi-weekly releases
- **Dependency Updates:** Quarterly reviews

### 13.3 Monitoring
- **Error Tracking:** Sentry integration (future)
- **Performance Monitoring:** Startup time, memory usage
- **User Feedback:** In-app feedback form
- **Analytics:** Feature usage tracking (privacy-respecting)

---

## Appendix: Design Inspiration & References

### 14.1 Design Systems & Libraries
- **UI UX Pro Max** — Premium component patterns
- **Open Design** — Open-source design system
- **Reflex** — Modern web framework patterns
- **CrewAI** — Agent interaction design
- **PraisonAI** — AI-powered UI patterns

### 14.2 Premium UI Examples
- **Ponytail** — Modern component styling
- **GStack** — Glassmorphism effects
- **Onyx** — Dark mode excellence
- **Spec Kit** — Design token systems

### 14.3 Technical References
- **Playwright** — E2E testing patterns
- **Scientific Agent Skills** — Data visualization
- **Routa** — Routing architecture
- **Agent Skills** — Modular design patterns

---

## Appendix: File Structure

```
C:\Project\Anphacy\
├── electron/
│   ├── main.cjs           # Electron main process + IPC handlers
│   ├── preload.cjs        # Context bridge (electronAPI)
│   └── database.cjs       # SQLite schema + seed data
├── public/
│   └── icon.png           # App icon (needs to be added)
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # App router (splash → license → login → main)
│   ├── index.css          # Global styles + animations
│   ├── vite-env.d.ts      # ElectronAPI type definitions
│   ├── components/
│   │   ├── ui/            # Reusable UI library
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── toast.tsx
│   │   ├── SplashScreen.tsx
│   │   ├── LicenseActivation.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── MainShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── StockManagement.tsx
│   │   ├── AddStock.tsx
│   │   ├── Sales.tsx
│   │   ├── Purchases.tsx
│   │   ├── Reports.tsx
│   │   ├── ScanInvoice.tsx
│   │   ├── UserManagement.tsx
│   │   ├── BackupRestore.tsx
│   │   ├── Settings.tsx
│   │   ├── Suppliers.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ErrorBoundary.tsx (pending)
│   │   ├── KeyboardShortcutsHelp.tsx (pending)
│   │   └── charts/
│   │       ├── ExpiryPieChart.tsx
│   │       └── SalesTrendChart.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useToast.ts
│   │   └── useKeyboardShortcuts.ts (pending)
│   ├── lib/
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── fefo.ts
│   │   ├── ocrParser.ts
│   │   ├── validation.ts (pending)
│   │   ├── csvParser.ts (pending)
│   │   └── i18n/
│   │       ├── index.ts
│   │       └── en.json
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── stockStore.ts
│   │   ├── settingsStore.ts
│   │   └── supplierStore.ts
│   └── index.css          # Global styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── postcss.config.js
└── index.html
```

---

## Progress Update Log

### Update 1: 2026-07-18
**Status:** Waves 1-3 Complete

**Completed:**
- ✅ Project foundation (Vite + React + TS + Electron)
- ✅ Database schema and IPC handlers
- ✅ All core business logic screens
- ✅ Premium UI with glassmorphism and animations
- ✅ OCR invoice scanning with Tesseract.js
- ✅ Chart.js visualizations
- ✓ Dark mode with persistent storage
- ✓ Toast notification system
- ✓ Supplier management module
- ✓ Loading skeletons and micro-interactions

**Next Steps:**
- Error boundaries
- Input validation
- Keyboard shortcuts
- Advanced filtering
- Print-friendly reports

**Current Issues:**
- None critical
- Minor: Need to add error boundaries for production safety

**Blockers:**
- None

---

*Document generated: 2026-07-18*  
*Project: AnPharmacy v1.0.0*  
*Current Phase: Wave 4 — Advanced Features*  
*Next Milestone: Error Boundaries & Enhanced Validation*  
*Maintainer: AnPharmacy Solutions*