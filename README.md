# AnPharmacy - Medical Distribution Management System

![Version](https://img.shields.io/badge/version-1.0.0-teal)
![License](https://img.shields.io/badge/license-ISC-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-blue)

**AnPharmacy** is a premium, offline-first pharmacy management and distribution system built as an Electron desktop application. It streamlines the complete lifecycle of pharmaceutical inventory — from manufacturer procurement and batch tracking to distributor sales and expiry monitoring.

## Features

### Core Functionality
- **License Management**: Hardware-bound license activation with expiry tracking
- **User Authentication**: Secure role-based access (Admin, Sales, Purchase Manager)
- **Inventory Management**: Complete stock tracking with batch numbers, expiry dates, and pricing
- **Sales Processing**: FEFO (First Expired First Out) algorithm for optimal batch selection
- **Supplier Management**: Full supplier database with contact details and medicine linking
- **Reports & Analytics**: Stock, expiry, and sales reports with Excel export
- **Backup & Restore**: AES-256 encrypted backups with HMAC integrity verification
- **Invoice Scanning**: OCR-powered invoice scanning using Tesseract.js (image + PDF support)
- **Data Import**: Bulk CSV import for medicines with validation
- **Barcode/QR Generation**: Batch and medicine QR code generation

### Premium UI/UX
- **Glassmorphism Design**: Modern glass-effect UI with blur and transparency
- **Dark Mode**: System-preference-aware dark/light theme toggle
- **Micro-interactions**: Smooth hover states, transitions, and animations
- **Toast Notifications**: Real-time feedback for user actions
- **Keyboard Shortcuts**: Global navigation shortcuts for power users
- **Print-friendly Reports**: Optimized layouts for printing and PDF export
- **Responsive Layout**: Adapts to different screen sizes

### Advanced Features
- **Error Boundaries**: Graceful error handling with React error boundaries
- **Real-time Validation**: Comprehensive input validation with instant feedback
- **Advanced Filtering**: Date range filters and advanced search capabilities
- **CSV Import/Export**: Bulk data operations with preview and validation
- **Keyboard Shortcuts**: Productivity shortcuts with help modal
- **FEFO Algorithm**: Intelligent batch selection for sales
- **Encrypted Backups**: Industry-standard AES-256 encryption

## Technology Stack

### Frontend
- **Framework**: React 19.2 + TypeScript 7.0
- **Build Tool**: Vite 8.1
- **Desktop**: Electron 43.1
- **Styling**: Tailwind CSS 3.4 + custom animations
- **State Management**: Zustand 5.0
- **i18n**: react-i18next
- **Charts**: Chart.js + react-chartjs-2
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge, class-variance-authority

### Backend
- **Database**: SQLite via better-sqlite3
- **Encryption**: crypto-js (AES-256)
- **OCR**: tesseract.js
- **PDF Processing**: pdfjs-dist

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/anpharmacy/anpharmacy.git
cd anpharmacy
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

This will start both the Vite development server and Electron.

### Build for Production

Build for Windows:
```bash
npm run dist:win
```

Build for Mac:
```bash
npm run dist:mac
```

Build for Linux:
```bash
npm run dist:linux
```

Build for all platforms:
```bash
npm run dist
```

## Usage

### First Run

1. Launch the application
2. Enter your license key to activate the software
3. Log in with default credentials:
   - Username: `admin`
   - Password: `admin@123`

### Default Users

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | admin@123 | Administrator | Full access |
| sales | sales@123 | Sales Representative | Dashboard, Stock, Sales, Reports |
| purchase | purchase@123 | Purchase Manager | Dashboard, Stock, Purchases, Reports |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + D` | Go to Dashboard |
| `Ctrl + S` | Go to Stock Management |
| `Ctrl + N` | Add New Stock |
| `Ctrl + P` | Go to Purchases |
| `Ctrl + M` | Go to Sales |
| `Ctrl + R` | Go to Reports |
| `Ctrl + F` | Focus Search |
| `Esc` | Close Modal/Dialog |
| `Ctrl + Shift + /` | Show Keyboard Shortcuts Help |

**Default Login Credentials:**
- Admin: `admin` / `admin@123`
- Sales: `sales` / `sales@123`
- Purchase: `purchase` / `purchase@123`

## Project Structure

```
C:\Project\Anphacy\
├── electron/
│   ├── main.cjs           # Electron main process + IPC handlers
│   ├── preload.cjs        # Context bridge (electronAPI)
│   └── database.cjs       # SQLite schema + seed data
├── public/
│   └── icon.png           # App icon
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
│   │   ├── ErrorBoundary.tsx
│   │   ├── KeyboardShortcutsHelp.tsx
│   │   ├── DataImportDialog.tsx
│   │   └── charts/
│   │       ├── ExpiryPieChart.tsx
│   │       ├── SalesTrendChart.tsx
│   │       └── StockBarChart.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useToast.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── lib/
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── fefo.ts
│   │   ├── validation.ts
│   │   ├── csvParser.ts
│   │   ├── barcodeGenerator.ts
│   │   ├── ocrParser.ts
│   │   └── i18n/
│   │       ├── index.ts
│   │       └── en.json
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── stockStore.ts
│   │   ├── settingsStore.ts
│   │   └── supplierStore.ts
│   ├── styles/
│   │   └── print.css       # Print-friendly styles
│   └── index.css           # Global styles
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── postcss.config.js
└── PLAN.md                 # Comprehensive development plan
```

## Database Schema

### Tables
- **medicines**: Core inventory (id, name, batch_number, supplier_id, company, quantity, prices, dates)
- **sales**: Transaction log (id, customer_name, medicine_name, quantity, amount, sale_date)
- **license_info**: License state (license_key, hwid, expiry_date, status)
- **audit_log**: Compliance trail (user_id, action, details, timestamp)
- **users**: Authentication (username, password_hash, display_name, role, is_active)
- **suppliers**: Supplier management (name, contact_person, phone, email, address, gstin)

## Configuration

### License Activation
AnPharmacy requires a valid license key for activation. The license is hardware-bound and includes expiration tracking. Contact your administrator for a license key.

### User Roles
- **Administrator**: Full system control, user management, license management
- **Sales Representative**: Process sales, view stock and reports
- **Purchase Manager**: Add/manage stock, view purchases and reports

## Development

### Scripts

- `npm run dev` - Start development server + Electron
- `npm run dev:vite` - Start Vite dev server only
- `npm run dev:electron` - Start Electron only
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run dist` - Build and package for all platforms
- `npm run dist:win` - Build and package for Windows
- `npm run dist:mac` - Build and package for Mac
- `npm run dist:linux` - Build and package for Linux
- `npm run pack` - Package without building

### Adding New Translations

1. Edit `src/lib/i18n/en.json`
2. Add new translation keys
3. Use `t('key.name')` in components

### Database Migrations

Database schema changes should be made in `electron/database.cjs`. The database is initialized on first run.

## Security

- **Password Hashing**: SHA-256 hashing for user passwords
- **Data Encryption**: AES-256 encryption for backups
- **License Protection**: Hardware-bound activation with HMAC verification
- **SQL Injection Prevention**: Parameterized queries throughout
- **Input Validation**: Comprehensive validation for all user inputs
- **Context Isolation**: Electron security best practices

## Performance

- **Offline-first**: All data stored locally in SQLite
- **Lazy Loading**: Code splitting for optimal bundle size
- **Memoization**: React.memo and useMemo for expensive computations
- **Indexed Queries**: Optimized database queries with indexes
- **Bundle Size**: Initial bundle optimized to under 1MB

## Troubleshooting

### Common Issues

1. **Build fails with TypeScript errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check TypeScript version compatibility

2. **Electron app won't start**:
   - Ensure Vite dev server is running on port 5173
   - Check if another instance is already running
   - Review console logs for errors

3. **Database errors**:
   - Delete `anpharmacy.db` to reset database (WARNING: data loss)
   - Reinstall dependencies: `npm install`

4. **License activation fails**:
   - Verify license key format
   - Check internet connection (for validation)
   - Contact administrator for key issues

## Support

For support and bug reports:
- Email: support@anpharmacy.com
- Documentation: https://docs.anpharmacy.com
- Issues: https://github.com/anpharmacy/anpharmacy/issues

## Roadmap

### Version 1.1 (Q3 2026)
- [ ] Multi-language support (Hindi, Spanish, French)
- [ ] Advanced analytics and forecasting
- [ ] Email export for reports
- [ ] Automatic backup scheduling
- [ ] Expiry alert notifications

### Version 1.2 (Q4 2026)
- [ ] Barcode scanning support
- [ ] Multi-currency support
- [ ] Cloud sync option
- [ ] Mobile companion app
- [ ] REST API for integrations

### Version 2.0 (Q1 2027)
- [ ] AI-powered demand forecasting
- [ ] Automated reordering
- [ ] Supplier portal
- [ ] Advanced inventory analytics
- [ ] Multi-location support

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Charts by [Chart.js](https://www.chartjs.org/)
- OCR by [Tesseract.js](https://tesseract.projectnaptha.com/)

## About Us

**AnPharmacy Solutions** is dedicated to revolutionizing pharmaceutical distribution management with cutting-edge technology and premium user experiences.

- Website: https://anpharmacy.com
- Email: hello@anpharmacy.com
- Phone: +1 (555) 123-4567

---

**© 2024 AnPharmacy Solutions. All rights reserved.**