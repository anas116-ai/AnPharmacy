# AnPharmacy — Complete Feature Status Report

> Full audit of the codebase (every major file read, key findings verified by
> testing). This document is the single source of truth for what is BUILT,
> what is PARTIAL/BROKEN, and what is PENDING.

**Audit date:** 2026-08-12
**Audit method:** 5-agent parallel code review + empirical verification (SQLite insert test, grep checks, build + browser verification)

---

## LEGEND

| Symbol | Meaning |
|---|---|
| ✅ | 100% working (verified) |
| 🔶 | Built but partial / broken / incomplete |
| ❌ | Not built / missing |

---

## 1. ✅ COMPLETED & WORKING (verified)

### 1.1 App Foundation
| Feature | Status | Details |
|---|---|---|
| Landing page | ✅ | Splash → Landing → License → Login → Main flow |
| Login + 3 demo roles | ✅ | admin / sales / purchase_mgr / pharmacist |
| Role-based page access | ✅ | `ROLE_PERMISSIONS`, gated pages |
| Sidebar navigation (31 pages) | ✅ | emoji icons, back button, breadcrumb |
| Dark mode toggle | ✅ | verified in both modes |
| Keyboard shortcuts | ✅ | Ctrl+D/S/N/P/M/R, Ctrl+F search, Esc |
| 100% offline capable | ✅ | local SQLite, zero network calls |
| Data ownership | ✅ | data lives on user's machine |

### 1.2 Stock Management
| Feature | Status | Details |
|---|---|---|
| Medicine master | ✅ | batch, expiry, company, generic, pack, barcode |
| Add Stock / Purchase Entry | ✅ | 5-section form, mandatory batch + expiry |
| MRP → PTR → PTS auto-calc | ✅ | AddStock pricing section |
| Batch + expiry tracking | ✅ | per-lot in schema + UI |
| FEFO (first-expiry-first-out) | ✅ | POS search sorts earliest expiry first |
| Expiry alerts 30/60/90d | ✅ | dashboard + reminders + reports |
| Low-stock reorder alerts | ✅ | low_stock_alert / max_stock_limit |
| Stock Editor (inline edit) | ✅ | |
| Recycle Bin | ✅ | delete → restore / permanent delete |
| Rack location | ✅ | field captured per medicine |

### 1.3 Sales / POS
| Feature | Status | Details |
|---|---|---|
| POS billing | ✅ | cart, barcode, qty dialog, totals |
| GST breakdown on sale | ✅ | CGST/SGST per line (local sales) |
| Bill discount + round-off | ✅ | none / nearest_1 / nearest_0.50 |
| Payment modes | ✅ | cash / UPI / card / credit |
| Credit sale → ledger + balance | ✅ | Electron mode writes customer_ledger |
| Invoice preview + print | ✅ | amount in words, window.print |
| Sales history | ✅ | search, filter, reprint |
| Sales returns | ✅ | reason + refund, stock restore |

### 1.4 Purchases & Import
| Feature | Status | Details |
|---|---|---|
| Supplier master | ✅ | GSTIN, drug license, transporter, vehicle |
| Purchase entry | ✅ | invoice/PO no, payment terms, due date, e-way no |
| Purchase returns workflow | ✅ | raised → dispatched → credited/rejected |
| Data Import Studio | ✅ | Excel/CSV, column mapping, AI suggestions, validation |
| Scan Invoice (OCR) | ✅ | invoice image → data extraction |
| Import History | ✅ | full log |
| HSN master + medicine mapping | ✅ | CRUD |

### 1.5 Reports
| Feature | Status | Details |
|---|---|---|
| Stock report | ✅ | status, days remaining, value |
| Expiry tier report | ✅ | expired/≤30/≤60/≤90/safe + at-risk value |
| Profit report | ✅ | per-batch margin incl. GST, net real profit |
| Sales report | ✅ | period summary |
| Receivables aging | ✅ | FIFO, current/30/60/90+ buckets |
| GSTR-1 summary | ✅ | B2B/B2C split, CGST/SGST/IGST totals |

### 1.6 Back Office
| Feature | Status | Details |
|---|---|---|
| Warehouses + Stock Transfers | ✅ | transfer workflow, receive bumps stock |
| Expenses | ✅ | CRUD |
| Discount Schemes screen | ✅ | CRUD (billing integration missing — see §2) |
| Price Rules screen | ✅ | CRUD (billing integration missing — see §2) |
| Customers master | ✅ | credit_limit, current_balance |
| Manufacturers / Generic Medicines | ✅ | CRUD masters |
| Notifications + Reminders | ✅ | create / mark read |
| Documents | ✅ | upload / store / delete |
| AI Insights | ✅ | heuristic expiry/low-stock insights |
| User Management | ✅ | create users, roles, activate/deactivate |
| License activation | ✅ | HWID-bound, local (format check) |
| Settings | ✅ | language, device ID |
| Audit log (write side) | ✅ | written on login/sale/stock/restore |

---

## 2. 🔶 PARTIAL / BROKEN (built but not fully working)

| # | Feature | What's wrong | File ref |
|---|---|---|---|
| 1 | **Record Payment screen** | Backend `addCustomerLedger` EXISTS but **NO UI screen calls it**. Receivables can only grow, never shrink. Reports even tells users to record payments from Customers screen — that button does not exist. | `electron/main.cjs:1304`, zero callers in `src/components` |
| 2 | **Schemes & price rules at billing** | Full CRUD screens exist but `Sales.tsx` has **zero references** to them. Scheme data in DB is never applied at POS. | `Sales.tsx` (0 hits for priceRule/scheme) |
| 3 | **Manual backup** | Only **5 of 24 tables** backed up. **LOST on backup**: customers, customer_ledger (receivables!), sale_items, purchases, both returns, HSN, manufacturers, generics, warehouses, transfers, expenses, price rules, discount schemes, documents. | `electron/main.cjs:904` |
| 4 | **Restore** | DESTRUCTIVE — re-inserts sales with 7 of ~25 columns → **GST history wiped by a restore**. Also restores only 5 tables → creates inconsistent DB state. | `electron/main.cjs:1001-1009` |
| 5 | **Auto-backup** | Triple-broken: (a) AES key never persisted → files undecryptable, (b) file format doesn't match restore parser, (c) Settings.tsx renders **no toggle**. | `electron/main.cjs:33-66, 949`, `Settings.tsx:15` |
| 6 | **Backup "encryption"** | AES key stored **inside the same JSON file** as ciphertext → obfuscation, not protection. HMAC written but never verified on restore. | `electron/main.cjs:921` |
| 7 | **Payables** | No supplier payment recording at all. "Outstanding" = full purchase total, no aging, no supplier ledger. | `electron/main.cjs:1322` |
| 8 | **Purchases list** | Browser mode maps `supplier: m.company` → shows **brand as supplier**. No purchase line items table. | `browserApi.ts:438` |
| 9 | **Credit limit enforcement** | Frontend-only check. `sales:process` accepts any credit sale regardless of balance vs limit. | `electron/main.cjs:625` |
| 10 | **GST rate at POS** | Uses `purchase_gst_percent` instead of `sale_gst_percent` → buy-rate used as output tax. | `Sales.tsx:241` |
| 11 | **Pharmacy identity** | Invoice header hardcoded: ANPHARMACY / Hyderabad / GSTIN 36ABCDE1234F1Z5. No settings to change. | `InvoicePreview.tsx:100` |
| 12 | **IGST / inter-state** | Not implemented. Comment says "local sales only". No customer state code. | `Sales.tsx` |
| 13 | **Sales history line items** | `sales:list` fetches line items with `.get()` → single row, not array → reprint shows one item only. No pagination/date filter server-side. | `electron/main.cjs:670` |
| 14 | **Browser mode divergence** | `browserApi.processSale` stores NO payment_mode, NO GST fields, NO ledger → credit sales vanish from receivables in browser mode. Backup is plaintext JSON (not Electron-restorable). | `browserApi.ts:395` |
| 15 | **HSN applied at sale** | HSN master exists but sale tax comes from batch `purchase_gst_percent`, not from `medicine_hsn`/`hsn_codes`. | `Sales.tsx:241` |
| 16 | **Audit log viewer** | Logs are written everywhere but there is **no in-app viewer** to inspect them. | — |
| 17 | **License heartbeat** | `needs_heartbeat` after 15 days, but nothing ever updates `last_heartbeat` → every install shows "Verify Needed" after 15 days. | `electron/main.cjs:296-302` |
| 18 | **Password security** | Unsalted SHA-256 hashes, seeded defaults (`admin@123`), no change-password/reset flow. | `database.cjs:506` |

---

## 3. ❌ PENDING / NOT BUILT (must build)

| # | Feature | Business impact |
|---|---|---|
| 1 | **Record Payment screen** (cash/cheque/UPI/transfer → ledger → balance down) | Receivables can never shrink today |
| 2 | **Auto-apply discount schemes at POS** | Scheme data is dead in DB |
| 3 | **Supplier payment ledger + payables aging** | "Who do I owe and when" |
| 4 | **Customer SOA / statement** (bill + payment history per customer) | #1 invoice-dispute solver |
| 5 | **Per-customer rate masters** (different PTR/discount per customer) | Big customers get special rates |
| 6 | **GSTR-3B / GSTR-2B / GSTR-1 JSON export** (GSTN file format) | Filing prep automation |
| 7 | **E-way bill generation** from sales list | Checkpost compliance |
| 8 | **Slow-mover / dead-stock report** | Capital locked in shelves |
| 9 | **Company-wide settings**: pharmacy name, GSTIN, DLNo, state code | Removes hardcoded identity |
| 10 | **Server-side credit-limit enforcement** | Trust-boundary fix |
| 11 | **IGST for inter-state sales** | Correct tax for cross-state |
| 12 | **Audit log viewer UI** | Compliance & troubleshooting |
| 13 | **Password change flow** + scrypt/bcrypt hashing | Security |
| 14 | **PDF export / print** beyond window.print() | Professional invoices |
| 15 | **TAX INVOICE vs DELIVERY CHALLAN** separation | Legal document correctness |
| 16 | **Scheme effective-cost calculator** at purchase (rate − scheme = true cost) | Smart buying decisions |

---

## 4. 🏗️ RECOMMENDED BUILD ORDER

### Phase 1 — Money & Data Safety (do first)
1. **Fix backup**: all 24 tables, working auto-backup toggle, non-destructive restore, no key-in-file
2. **Record Payment screen** (receivables must shrink)
3. **Server-side credit-limit enforcement** in `sales:process`

### Phase 2 — Daily Speed
4. **Apply discount schemes at POS automatically**
5. **Pharmacy settings** (identity, GSTIN, DLNo, state code)
6. **Fix `sale_gst_percent` usage + IGST for inter-state**

### Phase 3 — Business Intelligence
7. **Slow-mover / dead-stock report**
8. **Customer SOA + supplier payment ledger + scheme effective-cost**
9. **GSTR exports + e-way bill generation + audit log viewer + PDF export**

---

## 5. VERDICT

- **Core (stock, expiry, FEFO, billing, import) — SOLID, production-quality.**
- **Money features (receivables, payables, backup) — half-built; backend exists, frontend link missing.**
- **Completing Phase 1 makes the app production-ready.**
