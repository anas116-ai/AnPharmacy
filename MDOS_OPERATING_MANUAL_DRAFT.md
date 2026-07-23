# MDOS Operating Manual — AnPharmacy (Draft)

> Status: Draft Spec (Phase 1: A-first)

## 0) Operating Principles

### 0.1 Definition of “Done”
A screen/module is **not complete** until it passes **all review gates** against the **Acceptance Criteria** defined in this manual.

### 0.2 Anti-pattern policy (non-negotiable)
- Do **not** generate generic SaaS/ERP templates or layouts.
- Do **not** copy layouts, code, assets, or icons from reference sites.
- Do **not** treat the first generated draft as acceptable.
- Do **not** ship UI without accessibility and error/empty/loading states.

### 0.3 Manual philosophy
- “Perfect” is produced by: **Design System + Acceptance Criteria + Review Gates + Iteration**.
- Taste is subjective; gates make outcome measurable.

---

## 1) Product Vision & Business Model

### 1.1 Product intent
AnPharmacy is an **enterprise-grade offline-first** Medical Distribution Management System for pharmacy procurement, inventory/batch control, FEFO sales correctness, reporting, and encrypted backup/restore.

### 1.2 Personas
- Administrator
- Sales Representative
- Purchase Manager

### 1.3 Critical success factors (measurable)
- Sales correctness (FEFO & quantity integrity)
- Data integrity & recoverability (HMAC + safety backup)
- Operator speed (keyboard navigation + predictable UI)
- Trust & resilience (premium UX + error boundaries + safe failure)

---

## 2) Domain Model & Workflows Bible

### 2.1 Domain invariants
- **FEFO correctness**: earliest expiry batch is selected first where applicable.
- **Expiry status logic**: safe/warning/critical/expired must be consistent.
- **Quantity integrity**: sold quantity must not exceed available quantity.
- **Atomic operations**: stock updates and sales records stay consistent.

### 2.2 Workflows (high-level)
1. License activation/deactivation
2. Login + role gating
3. Add stock (batch, dates, pricing, supplier mapping)
4. Stock management (filter by expiry, details)
5. Sales (FEFO selection, multi-batch sale)
6. Purchases view (derived from stock additions)
7. Reports (stock/expiry/sales + export)
8. Backup & restore (encrypted + integrity verified)
9. Scan invoice (OCR → review → add to stock)
10. Suppliers CRUD
11. User management (admin only)

---

## 3) UI/UX Design Bible

### 3.1 Brand positioning
“Premium healthcare luxury”: calm, trustworthy, precise.

### 3.2 Token & theme rules
#### Color categories
- Primary / teal identity
- Success (safe)
- Warning (near expiry)
- Critical / error (expired)
- Glass backgrounds and borders

#### Typography rules
- Headings: clear hierarchy
- Body: readable density
- Mono: batch numbers and identifiers

### 3.3 Layout rules
- Use **bento grid** patterns for dashboard/KPIs.
- Consistent spacing scale (p-4/p-5/p-6)
- Max width constraints for desktop readability

### 3.4 Component composition rules
- Use only approved variants for Card/Button/Badge/Table/Dialog/Tabs/Input/Select/Toast.
- Tables must include consistent headers, hover states, and empty-state handling.

### 3.5 Motion rules
- Entrance animations: subtle and fast.
- Hover: minimal lift and shadow escalation.
- Reduce motion: provide non-blocking alternatives (no essential UI depends on motion).

---

## 4) Visual Identity: Logo & Icons Bible

### 4.1 Logo
- Placement rules in splash/login/header contexts.
- Color behavior in light/dark.

### 4.2 Icons
- Meaning mapping: warning vs critical must use correct icon family.
- Standard size and stroke weight.

---

## 5) Accessibility & Compliance Bible

### 5.1 Baseline targets
- Keyboard navigation complete for all interactive controls.
- Semantic HTML and ARIA labeling.
- Focus ring visibility.
- Color contrast: minimum AA.

### 5.2 Accessibility gates (must pass)
- Every input/select has a label.
- Modals/dialogs trap focus (or provide deterministic focus behavior).
- No color-only communication.

---

## 6) Architecture Bible

### 6.1 Electron separation
- Electron main process: IPC handlers, SQLite access, crypto operations.
- Preload: context-bridge allowlisted APIs.
- Renderer: React UI + Zustand state.

### 6.2 IPC contract rules
- Strict payload typing.
- Validate inputs server-side (main process).
- Permission checks enforced for any write action.

### 6.3 Folder/module structure rules
- UI screens: src/components/<Feature>.tsx
- Reusable UI: src/components/ui/*
- Domain logic: src/lib/*
- Stores: src/stores/*

---

## 7) Security Bible

### 7.1 Authentication & authorization
- Role-based access control.
- Admin-only writes.

### 7.2 Backup & restore security
- AES-256 encryption.
- HMAC verification.
- Safety backup before restore.
- Strict file extension and integrity checks.

---

## 8) Coding Standards Bible

### 8.1 TypeScript
- Strict typing for functions and IPC payloads.
- No silent `any`.

### 8.2 React
- Component boundaries respected.
- Hooks rules.
- Error boundaries placement.

### 8.3 Tailwind
- Token-first styling.
- No random inline colors.

---

## 9) Testing Bible

### 9.1 Unit tests
- FEFO logic
- Validation rules
- OCR parsing helpers

### 9.2 Integration tests
- IPC handler payload validation

### 9.3 Component/E2E tests
- Critical flows: login → add stock → sales → reports export smoke

---

## 10) Performance Bible

### 10.1 Targets
- No unnecessary re-renders.
- Memoize expensive computations.
- Keep UI responsive on large lists.

---

## 11) Acceptance Criteria & Review Gates (Loop Engine)

### 11.1 Acceptance Criteria template (per module)
For each module/screen, the following must be explicitly checked:

1) **UI Composition**
- Correct component variants used
- Correct spacing, radius, and token mapping

2) **UX Behavior**
- Empty/loading/error states exist
- Primary action clarity
- Dialog/flow transitions consistent

3) **Accessibility**
- Labels for all form controls
- Keyboard navigation
- Focus management
- Contrast and non-color-only status

4) **Business Correctness**
- Domain invariants preserved (FEFO, expiry, quantities)

5) **Security**
- Permission gating for write actions
- IPC arguments validated

6) **Performance**
- No heavy computations on each render

7) **Quality / Observability**
- Errors show toast + safe fallback
- Critical operations logged/audited where applicable

### 11.2 Review Gates sequence
- Gate 1: Build & Typecheck
- Gate 2: Lint/Format
- Gate 3: UI Consistency (tokens/components)
- Gate 4: UX Gate (states + interaction correctness)
- Gate 5: Accessibility Gate
- Gate 6: Business Workflow Gate
- Gate 7: Security Gate
- Gate 8: Performance Gate
- Gate 9: Refactor Gate

If any gate fails: **redesign + repeat until all pass**.

---

## 12) Self-Refinement Loop Contract

Each iteration must output:
- Changes made
- Gates passed/failed
- Evidence checklist results
- Remaining issues and next actions

Hard rule: never accept first draft.

---

## 13) Deployment Standards

### 13.1 Release checklist
- Production build passes
- Backup/restore smoke test
- License activation smoke test
- Role gating smoke test

---

## 14) Implementation Mapping (to repo)

This manual is intended to govern changes to:
- UI screens in src/components/*
- UI library components in src/components/ui/*
- Domain logic in src/lib/*
- Stores in src/stores/*
- Electron IPC/security in electron/*

---

## Appendix A) Gate Checklists (Printable)

(Template tables can be added later for Phase 2.)


