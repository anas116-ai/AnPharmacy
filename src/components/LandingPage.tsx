import { useEffect, useRef, useState } from 'react';
import Logo, { LogoMark, Emblem } from '../lib/Logo';
import { Button } from './ui/button';
import {
  Package, ScanLine, BarChart3, Bell, Users, ShieldCheck,
  ArrowRight, IndianRupee, ChevronDown,
  AlertTriangle, Boxes, FileSpreadsheet, Layers, Receipt,
  Menu, X, CheckCircle2, CalendarClock,
  Building2, Activity, Sparkles
} from 'lucide-react';

/* Single restrained brand tint — every badge/tile shares one hue so the page reads
   as deep teal + mint + one accent instead of a multi-colour rotation. */
const BADGE_TINT = 'bg-white text-[#14292E] border-[#14292E]/15';
const TILE_TINT = 'bg-[#2E9C90]/25 border border-[#2E9C90]/60 text-[#14292E]';

const FEATURES = [
  {
    icon: Package,
    badge: 'Live Telemetry',
    title: 'Stock & Inventory Control',
    desc: 'Live batch numbers, automated expiry tracking, and instant reorder intelligence with millisecond search.',
    span: 'lg:col-span-2'
  },
  {
    icon: ScanLine,
    badge: 'Optical OCR',
    title: 'OCR Invoice Intake',
    desc: 'Capture purchase bills instantly — optical text mapping auto-populates batches, MRP, and GST.'
  },
  {
    icon: BarChart3,
    badge: 'Velocity Metrics',
    title: 'Distribution Analytics',
    desc: 'Gross margin tracking, category velocity, and daily revenue reports rendered into clear decisions.'
  },
  {
    icon: CalendarClock,
    badge: 'FEFO Thresholds',
    title: 'Proactive Expiry Radar',
    desc: 'Automatic 30, 60, and 90-day alert thresholds ensure zero inventory is written off in the dark.'
  },
  {
    icon: Users,
    badge: 'Role Isolation',
    title: 'Governance & Roles',
    desc: 'Role-based access separating Administrator, Sales Representative, and Purchase Manager duties.'
  },
  {
    icon: ShieldCheck,
    badge: '100% Offline',
    title: 'Air-Gapped Privacy',
    desc: 'Zero cloud dependency. Your entire database lives locally on your hardware, encrypted with AES-256.'
  },
  {
    icon: Boxes,
    badge: 'Multi-Hub',
    title: 'Multi-Warehouse Mesh',
    desc: 'Seamlessly balance, transfer, and reconcile stock across multiple retail and storage hubs.'
  },
  {
    icon: FileSpreadsheet,
    badge: 'Auto-Mapping',
    title: 'Bulk Distributor Import',
    desc: 'Drop in wholesale spreadsheets — columns are verified, validated, and ingested in seconds.',
    span: 'lg:col-span-2'
  },
];

const TOUR = [
  { icon: BarChart3, page: 'Dashboard', tagline: 'Your Operations, Clearly In View.', desc: 'High-altitude telemetry across stock valuation, fast-moving lines, and pending deliveries.', span: 'lg:col-span-2' },
  { icon: Receipt, page: 'Purchases', tagline: 'From Invoice to Inventory.', desc: 'Verify batch numbers, GST rates, and manufacturer pricing before committing to stock.' },
  { icon: Boxes, page: 'Inventory', tagline: 'Precision Batch Accounting.', desc: 'Real-time location, shelf, and warehouse visibility for every pharmaceutical SKU.' },
  { icon: CalendarClock, page: 'Expiry Radar', tagline: 'FEFO-Driven Safety.', desc: 'First Expired, First Out algorithms automatically route batches to eliminate dead loss.' },
  { icon: IndianRupee, page: 'Billing & POS', tagline: 'Fast, Compliant Counter Sales.', desc: 'Print GST tax invoices and adjust batch ledgers the exact millisecond a sale concludes.' },
];

const STEPS = [
  { n: '01', icon: FileSpreadsheet, badge: 'Inbound Ingestion', title: 'Automated Purchase Ingestion', desc: 'Upload distributor CSVs or scan printed tax invoices. AnPharmacy maps products, batches, and taxes automatically.' },
  { n: '02', icon: Activity, badge: 'Clinical Governance', title: 'FEFO Dispensing & Allocation', desc: 'Every billing transaction automatically depletes the earliest-expiring batch first, maximizing operating margins.' },
  { n: '03', icon: CalendarClock, badge: 'Audit Compliance', title: 'Deterministic Ledger Accounting', desc: 'Receive proactive replenishment alerts, manage supplier ledger balances, and generate one-click GST reports.' },
];

const FAQS = [
  { q: 'Does AnPharmacy operate completely offline?', a: 'Yes. AnPharmacy is engineered as an offline-first enterprise application with an embedded SQLite engine. Your data resides strictly on your physical machine, with zero latency and no internet requirement at the counter.' },
  { q: 'Can we import data from existing wholesale distributor bills?', a: 'Yes. You can upload standard distributor Excel/CSV files or use the OCR intake scanner to ingest printed supplier invoices with automatic column mapping for Batch, Expiry, MRP, and HSN.' },
  { q: 'How does the FEFO algorithm protect pharmacy margins?', a: 'FEFO (First Expired, First Out) prioritizes dispensing batches closest to their expiration date while maintaining full efficacy, completely eliminating expired inventory losses.' },
  { q: 'Is there a limit on users or transaction records?', a: 'No. AnPharmacy supports unlimited local transactions, unlimited products, and granular role permissions for administrators, pharmacists, and purchase officers.' },
];

const SYSTEM_CAPABILITIES = [
  { value: '100% Offline', label: 'Air-gapped local database' },
  { value: '< 15ms', label: 'Sub-millisecond query latency' },
  { value: 'AES-256', label: 'Hardware-bound encryption' },
  { value: 'FEFO Driven', label: 'Certified batch allocation' },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700 ease-out', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function cn(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(' ');
}

interface LandingPageProps {
  onStart: () => void;
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, target]) => (
          <li key={label}>
            <a
              href={`#${target}`}
              onClick={(e) => {
                e.preventDefault();
                if (target === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
                else document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-sm text-slate-500 hover:text-[#14292E] transition-colors cursor-pointer"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Luxury Pharmaceutical Operations Command Center Preview
 * Restrained palette: deep-teal / mint tints with a single semantic alert tint.
 */
function CommandCenterPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden p-5 text-slate-800">
      {/* Precision Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#14292E] flex items-center justify-center text-white shadow-xs">
            <LogoMark className="w-4 h-4 text-[#2E9C90]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 leading-tight">Pharmacy Sales Results</p>
            <p className="text-[10px] text-slate-500">Live Executive Overview</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-[#14292E] animate-pulse" />
          This Month
        </div>
      </div>

      {/* KPI cards — two brand tints, one semantic alert tint, one neutral */}
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        {/* Mint */}
        <div className="rounded-2xl p-3.5 bg-[#EAF6F3] text-[#0E3331] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-80">Todays Sales</span>
            <span className="text-[9px] font-bold bg-[#0E3331]/10 px-1.5 py-0.5 rounded-full">+2.5%</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-lg font-black tracking-tight font-mono">$ 95.00</p>
            <div className="flex items-end gap-1">
              <span className="w-1.5 h-2.5 rounded-full bg-[#0E3331]/30" />
              <span className="w-1.5 h-4 rounded-full bg-[#0E3331]/50" />
              <span className="w-1.5 h-6 rounded-full bg-[#0E3331]" />
            </div>
          </div>
        </div>

        {/* Sky */}
        <div className="rounded-2xl p-3.5 bg-[#E6F4FA] text-[#1D4A47] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-80">Available Categories</span>
            <span className="text-[9px] font-bold bg-[#0E3331]/10 px-1.5 py-0.5 rounded-full">+2.5%</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-lg font-black tracking-tight font-mono">1.457%</p>
            <div className="flex items-end gap-1">
              <span className="w-1.5 h-3 rounded-full bg-[#0E3331]/30" />
              <span className="w-1.5 h-6 rounded-full bg-[#0E3331]" />
              <span className="w-1.5 h-4 rounded-full bg-[#0E3331]/50" />
            </div>
          </div>
        </div>

        {/* Coral — the one semantic alert tint */}
        <div className="rounded-2xl p-3.5 bg-[#F8BDB6] text-[#2F4A47] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold opacity-80">Expired Medicines</span>
            <span className="text-[9px] font-bold bg-[#2F4A47]/10 px-1.5 py-0.5 rounded-full">+2.5%</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-lg font-black tracking-tight font-mono">0.00%</p>
            <div className="flex items-end gap-1">
              <span className="w-1.5 h-5 rounded-full bg-[#2F4A47]" />
              <span className="w-1.5 h-3 rounded-full bg-[#2F4A47]/40" />
              <span className="w-1.5 h-2 rounded-full bg-[#2F4A47]/20" />
            </div>
          </div>
        </div>

        {/* Neutral — no decorative hue where the metric is informational */}
        <div className="rounded-2xl p-3.5 bg-white border border-slate-200 text-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500">System Users</span>
            <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-600">+2.5%</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-lg font-black tracking-tight font-mono">255K</p>
            <div className="flex items-end gap-1">
              <span className="w-1.5 h-2 rounded-full bg-slate-200" />
              <span className="w-1.5 h-4 rounded-full bg-slate-300" />
              <span className="w-1.5 h-6 rounded-full bg-slate-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Visual: Donut + Capsule Bars */}
      <div className="grid grid-cols-5 gap-3 mt-4 items-center bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
        {/* Left: Donut Chart - Proportionately refined compact size */}
        <div className="col-span-2 flex flex-col items-center">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="36" fill="none" stroke="#14292E" strokeWidth="12" strokeDasharray="95 131" strokeLinecap="round" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="#123F3D" strokeWidth="12" strokeDasharray="63 163" strokeDashoffset="-98" strokeLinecap="round" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="#2E9C90" strokeWidth="12" strokeDasharray="40 186" strokeDashoffset="-165" strokeLinecap="round" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="#D7EDE7" strokeWidth="12" strokeDasharray="28 198" strokeDashoffset="-208" strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <span className="block text-[7px] font-semibold text-slate-400">Total</span>
              <span className="block text-[11px] font-bold text-slate-900 font-mono">755K</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-600 mt-1">Graph Report</span>
        </div>

        {/* Right: Capsule Bars with $298.00K tooltip */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-700">Total Sales Overview</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#14292E] text-white">
              Wed $298.00K
            </span>
          </div>
          <div className="flex items-end justify-between h-16 px-1 pt-1">
            {[
              { d: 'Mon', h: 'h-8', bg: 'bg-[#14292E]/25' },
              { d: 'Tue', h: 'h-11', bg: 'bg-[#14292E]/40' },
              { d: 'Wed', h: 'h-15', bg: 'bg-[#14292E] ring-2 ring-[#14292E]/20' },
              { d: 'Thu', h: 'h-9', bg: 'bg-[#14292E]/35' },
              { d: 'Fri', h: 'h-12', bg: 'bg-[#14292E]/45' },
              { d: 'Sat', h: 'h-7', bg: 'bg-[#14292E]/20' },
            ].map(({ d, h, bg }) => (
              <div key={d} className="flex flex-col items-center gap-1">
                <div className={cn("w-3 rounded-full transition-all", h, bg)} />
                <span className="text-[9px] font-bold text-slate-500">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-[#17827A]/20 selection:text-[#123F3D]">
      {/* Top Header - Seamless & Transparent on #EDF5F6 */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-12 py-4 transition-all">
        <div className="mx-auto max-w-[1400px] w-full flex items-center justify-between">
          <Logo size="sm" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <a href="#features" className="hover:text-[#14292E] transition-colors cursor-pointer">Capabilities</a>
            <a href="#tour" className="hover:text-[#14292E] transition-colors cursor-pointer">Operations</a>
            <a href="#how" className="hover:text-[#14292E] transition-colors cursor-pointer">Architecture</a>
            <a href="#faq" className="hover:text-[#14292E] transition-colors cursor-pointer">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              onClick={onStart}
              size="sm"
              className="bg-[#14292E] hover:bg-[#223A40] text-white font-medium shadow-sm transition-all cursor-pointer rounded-xl px-5 h-9"
            >
              Sign In
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 text-[#2E9C90]" />
            </Button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-xl border border-slate-300 bg-white/80 text-slate-700 cursor-pointer"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="mx-auto max-w-[1400px] mt-2 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1 md:hidden shadow-lg">
            {[['Capabilities', 'features'], ['Operations', 'tour'], ['Architecture', 'how'], ['FAQ', 'faq']].map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                {label}
              </a>
            ))}
            <Button onClick={onStart} size="sm" className="bg-[#14292E] hover:bg-[#223A40] text-white mt-1 cursor-pointer">Sign In</Button>
          </div>
        )}
      </header>

      {/* Hero Section with Clean Editorial Typography & Command Center Preview */}
      <section className="relative pt-14 pb-20 px-6 lg:px-12 lg:pt-20 lg:pb-28 overflow-hidden bg-white">
        {/* Subtle Ambient Radial Lighting */}
        

        <div className="relative mx-auto max-w-[1400px] w-full z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Copy */}
            <div className="text-center lg:text-left">
              <Reveal>
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[#123F3D] text-xs font-bold mb-6 shadow-xs">
                  <LogoMark className="w-4 h-4 text-[#17827A]" />
                  <span>Enterprise Medicine Distribution &amp; Operations</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#17827A] animate-pulse" />
                </div>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight text-slate-900 leading-[1.14]">
                  Intelligent Distribution &amp; Management for{' '}
                  <span className="bg-gradient-to-r from-[#123F3D] via-[#17827A] to-[#2E9C90] bg-clip-text text-transparent block sm:inline">
                    Modern Pharmacy.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  Deterministic batch governance, automated FEFO allocation, and compliant GST billing.
                  Engineered as a zero-cloud, 100% offline desktop application with instant local search and zero subscription lock-in.
                </p>
              </Reveal>

              <Reveal delay={300}>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                  <Button
                    onClick={onStart}
                    size="xl"
                    className="w-full sm:w-auto bg-[#14292E] hover:bg-[#223A40] text-white border border-[#223A40] shadow-lg shadow-[#14292E]/20 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl cursor-pointer text-sm font-semibold h-12 px-8 rounded-xl"
                  >
                    Launch System Console
                    <ArrowRight className="w-4 h-4 ml-2 text-[#2E9C90]" />
                  </Button>
                  <button
                    onClick={() => goTo('features')}
                    className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
                  >
                    Explore System Architecture
                  </button>
                </div>
              </Reveal>

              <Reveal delay={400}>
                <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 justify-center lg:justify-start border-t border-slate-200/80 pt-6">
                  {[
                    { icon: Layers, label: 'Batch-level traceability' },
                    { icon: Receipt, label: 'Instant GST invoicing' },
                    { icon: ScanLine, label: 'Optical bill intake' },
                    { icon: Boxes, label: 'Multi-warehouse sync' },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Icon className="w-4 h-4 text-[#14292E]" />
                      {label}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Right — Clean Executive Command Center Interface Preview */}
            <Reveal delay={250}>
              <CommandCenterPreview />
            </Reveal>
          </div>

          {/* Capabilities Strip */}
          <Reveal delay={300}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm">
              {SYSTEM_CAPABILITIES.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-slate-500 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Problem vs Solution Architecture */}
      <section className="px-6 lg:px-12 py-16 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-[1400px] w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Reveal>
              <div className="rounded-2xl p-7 border border-slate-200 bg-slate-50/70 h-full">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A3B33]">Traditional Fragility</p>
                <h3 className="mt-3 text-xl font-bold text-slate-900">Manual billing & unmonitored expiries</h3>
                <ul className="mt-5 space-y-3 text-sm text-slate-600">
                  {[
                    'Paper distributor invoices hand-typed with transcription errors',
                    'Near-expiry batches discovered only after dead stock write-off',
                    'Stock counts that drift away from physical shelf quantities',
                    'Weekend inventory audits lost in manual ledger reconciliation',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D98C82] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="rounded-2xl p-7 border border-[#2E9C90]/60 bg-[#2E9C90]/15 h-full">
                <p className="text-xs font-bold uppercase tracking-wider text-[#0E3331]">The AnPharmacy Standard</p>
                <h3 className="mt-3 text-xl font-bold text-slate-900">Deterministic governance & control</h3>
                <ul className="mt-5 space-y-3 text-sm text-slate-700">
                  {[
                    'Wholesale purchase bills scanned and ingested into stock in seconds',
                    'Deterministic FEFO logic guarantees the earliest expiry is billed first',
                    'Immediate multi-warehouse inventory updates upon transaction commit',
                    'Export-ready GST sales and purchase returns generated in one click',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#14292E] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-6 lg:px-12 py-20">
        <div className="mx-auto max-w-[1400px] w-full">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 text-[#14292E] text-xs font-bold uppercase tracking-wider">
                <LogoMark className="w-4 h-4" /> System Capabilities
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight">
                Architected For Absolute Pharmaceutical Integrity
              </h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Everything required to administer a multi-tiered pharmaceutical distribution network.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, span, badge }, i) => (
              <Reveal key={title} delay={i * 50} className={cn(span)}>
                <div className={cn(
                  'h-full rounded-2xl p-6 bg-white border border-slate-200/90 shadow-xs hover:border-[#14292E]/30 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer',
                  span === 'lg:col-span-2' && 'lg:p-8'
                )}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-2", TILE_TINT)}>
                        <Icon className="w-5 h-5 text-[#14292E]" />
                      </div>
                      {badge && (
                        <span className={cn("text-[10px] font-bold font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border", BADGE_TINT)}>
                          {badge}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-900 group-hover:text-[#14292E] transition-colors">{title}</h3>
                    <p className={cn('mt-2 text-sm text-slate-600 leading-relaxed', span === 'lg:col-span-2' && 'max-w-md')}>{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workspace Operational Tour */}
      <section id="tour" className="px-6 lg:px-12 py-20 bg-slate-100/60 border-t border-slate-200">
        <div className="mx-auto max-w-[1400px] w-full">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-[#14292E] text-xs font-bold uppercase tracking-wider">Core Workspaces</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight">One Connected Operations Suite</h2>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">A single, unified rhythm across counter sales, warehousing, and finance.</p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOUR.map(({ icon: Icon, page, tagline, desc, span }, i) => (
              <Reveal key={page} delay={i * 50} className={span}>
                <div className="h-full rounded-2xl p-7 bg-white border border-slate-200 shadow-xs hover:shadow-xl hover:-translate-y-1.5 hover:border-slate-300 transition-all duration-300 group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#2E9C90]/30 border border-[#2E9C90]/70 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Icon className="w-5 h-5 text-[#0E3331]" />
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest font-mono px-2 py-0.5 rounded-md border", BADGE_TINT)}>
                      {page}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900 leading-snug group-hover:text-[#14292E] transition-colors">{tagline}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture / How It Works */}
      <section id="how" className="px-6 lg:px-12 py-20 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-[1400px] w-full">
          <Reveal>
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-[#14292E] text-xs font-bold uppercase tracking-wider">Operating Protocol</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight">Structured In Three Steps</h2>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ n, icon: Icon, title, desc, badge }, i) => (
              <Reveal key={n} delay={i * 70}>
                <div className="h-full rounded-2xl p-7 bg-slate-50/70 border border-slate-200/90 hover:border-[#14292E]/40 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between group cursor-pointer">
                  <span className="absolute -top-3 right-4 text-[4.5rem] font-bold font-mono text-slate-200/60 select-none pointer-events-none group-hover:text-[#D7EDE7]/40 transition-colors duration-300">{n}</span>
                  <div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="w-11 h-11 rounded-xl bg-[#14292E] text-[#D7EDE7] flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110">
                        <Icon className="w-5 h-5 text-[#D7EDE7]" />
                      </div>
                      <span className={cn("text-xs font-bold font-mono px-3 py-1 rounded-full border", BADGE_TINT)}>
                        {badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 relative z-10">{title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed relative z-10">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 lg:px-12 py-20 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="text-center">
              <span className="text-[#14292E] text-xs font-bold uppercase tracking-wider">Frequently Answered</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight">Operating Principles & Verification</h2>
            </div>
          </Reveal>
          <div className="mt-10 space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <Reveal key={q} delay={i * 40}>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-sm font-semibold text-slate-900">{q}</span>
                    <ChevronDown className={cn('w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200', openFaq === i && 'rotate-180')} />
                  </button>
                  <div className={cn('grid transition-all duration-200 ease-out', openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Next-Gen Operations CTA Box — Luxury Midnight Obsidian Architecture */}
      <section id="cta" className="px-6 lg:px-12 py-20 bg-white">
        <Reveal>
          <div className="mx-auto max-w-5xl bg-gradient-to-br from-[#0E2429] via-[#0E2429] to-[#071417] rounded-3xl p-10 sm:p-14 text-center border border-slate-800 shadow-2xl relative overflow-hidden group">
            {/* Ambient Lighting */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#2E9C90]/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#D7EDE7]/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D7EDE7] text-[#0E3331] text-xs font-bold border border-[#2E9C90] mb-4 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0E3331]" /> Next-Gen Pharmaceutical Operations & Clinical Intelligence
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Operate your pharmacy with absolute certainty.
              </h2>
              <p className="mt-4 text-slate-300 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                Seamlessly unite batch-level FEFO governance, wholesale OCR intake, multi-counter cash shifts, and instant GST invoicing in one ultra-fast, 100% offline suite.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Button
                  onClick={onStart}
                  size="xl"
                  className="w-full sm:w-auto bg-[#D7EDE7] hover:bg-[#2E9C90] text-[#14292E] font-bold shadow-xl shadow-black/40 cursor-pointer h-12 px-8 rounded-xl text-sm transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                >
                  Enter The Workspace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={() => goTo('faq')}
                  className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white border border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  Technical Documentation
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 pt-16 pb-12 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-[1400px] w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
            <div>
              <Logo size="md" />
              <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-sm">
                Enterprise medical distribution, inventory management, and pharmaceutical billing operating platform.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#0E3331] bg-[#2E9C90]/30 border border-[#2E9C90]/70 rounded-full px-3 py-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Air-gapped · Offline Local Storage
              </div>
            </div>
            <FooterCol
              title="System Modules"
              links={[['Inventory Ledger', 'features'], ['FEFO Allocation', 'tour'], ['OCR Bill Intake', 'features'], ['Counter Sales POS', 'tour']]}
            />
            <FooterCol
              title="Workspaces"
              links={[['Stock Transfers', 'tour'], ['Supplier Ledgers', 'features'], ['Expiry Radar', 'tour']]}
            />
            <FooterCol
              title="Security & Compliance"
              links={[['Local SQLite Spec', 'faq'], ['AES-256 Storage', 'faq'], ['Audit Logs', 'faq']]}
            />
          </div>

          <div className="mt-12 pt-6 border-t border-slate-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} AnPharmacy. All rights reserved.</span>
            <span className="font-mono text-[11px] text-slate-500">Enterprise Build v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

