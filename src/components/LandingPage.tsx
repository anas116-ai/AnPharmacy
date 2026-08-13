import { useEffect, useRef, useState } from 'react';
import Logo, { LogoMark } from '../lib/Logo';
import { Button } from './ui/button';
import {
  Package, ScanLine, BarChart3, Bell, Users, ShieldCheck,
  ArrowRight, Sparkles, IndianRupee, ChevronDown,
  AlertTriangle, Boxes, FileSpreadsheet, Layers, Receipt,
  Menu, X, Pill, Star, CheckCircle2, CalendarClock,
  Infinity,
} from 'lucide-react';

const FEATURES = [
  { icon: Package, title: 'Stock & Inventory', desc: 'Live batch, expiry and reorder control with one-tap precision.', tint: 'from-emerald-500/15 to-teal-500/5 text-emerald-700', span: 'lg:col-span-2' },
  { icon: ScanLine, title: 'AI Invoice Scanning', desc: 'Point your camera at a purchase bill — data enters itself.', tint: 'from-sky-500/15 to-blue-500/5 text-sky-700' },
  { icon: BarChart3, title: 'Sales Analytics', desc: 'Revenue, margins and trends rendered into clear decisions.', tint: 'from-amber-500/15 to-orange-500/5 text-amber-700' },
  { icon: Bell, title: 'Expiry Alerts', desc: 'Proactive alerts so no batch ever expires in the dark.', tint: 'from-rose-500/15 to-pink-500/5 text-rose-700' },
  { icon: Users, title: 'Multi-user Roles', desc: 'Admin, sales and purchase access — tightly governed.', tint: 'from-violet-500/15 to-purple-500/5 text-violet-700' },
  { icon: ShieldCheck, title: 'Local-first Safety', desc: 'Your data lives on your machine. Encrypted. Offline-ready.', tint: 'from-emerald-500/15 to-teal-500/5 text-emerald-700' },
  { icon: Boxes, title: 'Multi-warehouse', desc: 'Track transfers across warehouses with full audit trail.', tint: 'from-cyan-500/15 to-sky-500/5 text-cyan-700' },
  { icon: FileSpreadsheet, title: 'Excel-ready import', desc: 'Drop in your distributor sheet — mapped and imported in minutes.', tint: 'from-lime-500/15 to-green-500/5 text-lime-700', span: 'lg:col-span-2' },
];

const TOUR = [
  { icon: BarChart3, page: 'Dashboard', tagline: 'Your Business, Clearly in View.', desc: 'Monitor stock, expiry, sales and daily operations from one place.', span: 'lg:col-span-2' },
  { icon: Receipt, page: 'Purchases', tagline: 'From Invoice to Inventory.', desc: 'Review every detail before updating your stock.' },
  { icon: Boxes, page: 'Inventory', tagline: 'Know What You Have. Know Where It Is.', desc: 'Live batch and location visibility across every warehouse.' },
  { icon: CalendarClock, page: 'Expiry', tagline: 'Stay Ahead of Every Expiry.', desc: 'Proactive alerts keep every batch from expiring in the dark.' },
  { icon: IndianRupee, page: 'Sales', tagline: 'Every Sale. Automatically Accounted For.', desc: 'Stock, margins and reports update the moment you bill.' },
];

const STEPS = [
  { n: '01', icon: FileSpreadsheet, title: 'Import your stock', desc: 'Upload your distributor spreadsheet or scan an invoice. AnPharmacy maps it automatically.' },
  { n: '02', icon: IndianRupee, title: 'Sell & track live', desc: 'Sales adjust stock instantly. Batch, expiry and margins stay in view.' },
  { n: '03', icon: CalendarClock, title: 'Restock with confidence', desc: 'Smart reorder alerts keep every shelf full and nothing expired.' },
];

const TESTIMONIALS = [
  { quote: 'The invoice scanning alone saves us two hours every day. Stock is finally under control.', name: 'Ramesh Kumar', role: 'Owner, Sri Sai Medicals', initials: 'RK' },
  { quote: 'Expiry alerts paid for the app in the first month. We stopped writing off dead stock.', name: 'Anita Deshpande', role: 'Manager, LifePlus Pharmacy', initials: 'AD' },
  { quote: 'Simple enough for my staff, powerful enough for GST reports. It just works.', name: 'Mohammed Farhan', role: 'Director, Al-Karim Distributors', initials: 'MF' },
];

const FAQS = [
  { q: 'Does AnPharmacy work offline?', a: 'Yes — it is local-first. Your data is stored on your own machine and the app runs fully offline. No internet required at the counter.' },
  { q: 'Can I import stock from my existing Excel files?', a: 'Absolutely. Upload your distributor spreadsheet and the smart mapper will recognize columns like brand, batch, expiry and MRP automatically.' },
  { q: 'Is my data safe?', a: 'Your data never leaves your machine. It is stored in an encrypted local database with automatic backup support.' },
  { q: 'How many users can I add?', a: 'Unlimited. Create admin, sales and purchase manager roles with fine-grained permissions for each staff member.' },
];

const STATS = [
  { value: '1M+', label: 'Medicines tracked' },
  { value: '100%', label: 'Offline capable' },
  { value: '10x', label: 'Faster entry' },
  { value: '24/7', label: 'Your data, yours' },
];

/* Subtle floating molecular field — calm, low-opacity, respects reduced motion */
function MolecularField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0, h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    interface Node { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: Node[] = [];

    const build = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(48, Math.floor((w * h) / 26000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.8,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 130) {
            ctx.strokeStyle = `rgba(16,185,129,${(1 - d / 130) * 0.12})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (!reduceMotion) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < -20) a.x = w + 20;
          if (a.x > w + 20) a.x = -20;
          if (a.y < -20) a.y = h + 20;
          if (a.y > h + 20) a.y = -20;
        }
        ctx.fillStyle = 'rgba(16,185,129,0.35)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    if (!reduceMotion) draw();
    else {
      // Static frame only
      ctx.clearRect(0, 0, w, h);
      for (const a of nodes) {
        ctx.fillStyle = 'rgba(16,185,129,0.35)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const onResize = () => { build(); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40"
      aria-hidden="true"
    />
  );
}

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
      { threshold: 0.12 }
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
      className={cn('transition-all duration-700 ease-out', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8', className)}
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
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-950/70">{title}</p>
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
              className="text-sm text-emerald-950/55 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Conceptual pharmacy-distribution scene — an infinity flow of medicine
   circulating Supplier → Warehouse → Pharmacy → Patient (pure SVG/CSS, no images) */
function FlowNode({ className, icon: Icon, label }: { className?: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className={cn('absolute flex flex-col items-center gap-1.5 z-10', className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white ring-1 ring-emerald-900/10 shadow-lg shadow-emerald-900/10 text-emerald-600">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[10px] font-semibold text-slate-600 bg-white/85 rounded-full px-2 py-0.5 ring-1 ring-emerald-900/10 whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

function ProductWindow() {
  const pills = [
    { begin: '0s', color: '#D946EF' },
    { begin: '2.3s', color: '#F472B6' },
    { begin: '4.6s', color: '#FB7185' },
  ];
  const FLOW =
    'M190,160 C150,120 110,120 110,160 C110,200 150,200 190,160 C230,120 270,120 270,160 C270,200 230,200 190,160 Z';

  return (
    <div className="relative" aria-hidden="true">
      <div className="relative mx-auto w-full max-w-[460px] aspect-[380/320]">
        {/* Flow track + traveling pills */}
        <svg viewBox="0 0 380 320" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="380" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A21CAF" />
              <stop offset="40%" stopColor="#D946EF" />
              <stop offset="75%" stopColor="#F472B6" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
            <filter id="flowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          <path d={FLOW} fill="none" stroke="url(#flowGrad)" strokeWidth="11" strokeOpacity="0.16" filter="url(#flowGlow)" />
          <path
            id="flowPath"
            d={FLOW}
            fill="none"
            stroke="url(#flowGrad)"
            strokeWidth="2.5"
            strokeOpacity="0.55"
            strokeDasharray="5 9"
            strokeLinecap="round"
          />

          {pills.map((p, i) => (
            <g key={i}>
              <rect x="-9" y="-5" width="18" height="10" rx="5" fill="#fff" stroke={p.color} strokeWidth="2" />
              <animateMotion dur="7s" begin={p.begin} repeatCount="indefinite" rotate="auto" calcMode="linear">
                <mpath href="#flowPath" />
              </animateMotion>
            </g>
          ))}
        </svg>

        {/* Central distribution engine */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-rose-400/30 blur-xl animate-aurora-breathe" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white ring-1 ring-fuchsia-200 shadow-lg shadow-fuchsia-500/20">
              <Infinity className="h-8 w-8 text-fuchsia-500" />
            </span>
          </div>
        </div>

        {/* Distribution nodes */}
        <FlowNode className="left-[2%] top-[6%]" icon={Package} label="Supplier" />
        <FlowNode className="right-[2%] top-[6%]" icon={Boxes} label="Warehouse" />
        <FlowNode className="left-[2%] bottom-[6%]" icon={Pill} label="Pharmacy" />
        <FlowNode className="right-[2%] bottom-[6%]" icon={Users} label="Patient" />

        {/* Floating status chips */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden md:block animate-bob" style={{ ['--bob-dur' as any]: '5s' }}>
          <div className="rounded-xl bg-white px-3.5 py-2.5 flex items-center gap-2.5 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 ring-1 ring-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-900">Expiry Alert</p>
              <p className="text-[9px] text-slate-500">12 batches · 30 days</p>
            </div>
          </div>
        </div>

        <div className="absolute -right-2 bottom-2 hidden md:block animate-bob" style={{ ['--bob-dur' as any]: '6.5s', animationDelay: '0.8s' }}>
          <div className="rounded-xl bg-white px-3.5 py-2.5 flex items-center gap-2.5 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-900">Invoice scanned</p>
              <p className="text-[9px] text-slate-500">42 items auto-entered</p>
            </div>
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
    <div className="relative min-h-screen bg-[#F0FDF4] text-slate-800">
      {/* Ambient soft field */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[720px] h-[720px] bg-emerald-200/40 rounded-full blur-[160px]" />
        <div className="absolute bottom-0 -left-40 w-[640px] h-[640px] bg-sky-200/40 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 left-1/2 w-[500px] h-[500px] bg-teal-100/50 rounded-full blur-[140px]" />
      </div>

      {/* Molecular network (subtle) */}
      <div className="absolute inset-0 pointer-events-none">
        <MolecularField />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="sticky top-0 z-40 px-4 pt-4">
          <div className="mx-auto max-w-6xl bg-white/80 backdrop-blur-xl border border-emerald-900/10 rounded-2xl px-5 py-3 flex items-center justify-between shadow-sm">
            <Logo size="sm" />
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-emerald-950/70">
              <a href="#features" className="hover:text-emerald-700 transition-colors cursor-pointer">Features</a>
              <a href="#tour" className="hover:text-emerald-700 transition-colors cursor-pointer">Workspace</a>
              <a href="#how" className="hover:text-emerald-700 transition-colors cursor-pointer">How it works</a>
              <a href="#testimonials" className="hover:text-emerald-700 transition-colors cursor-pointer">Stories</a>
              <a href="#faq" className="hover:text-emerald-700 transition-colors cursor-pointer">FAQ</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button
                onClick={onStart}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Sign In
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-lg border border-emerald-900/10 bg-white text-emerald-900 cursor-pointer"
                aria-label="Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="mx-auto max-w-6xl mt-2 bg-white border border-emerald-900/10 rounded-2xl p-4 flex flex-col gap-1 md:hidden shadow-lg">
              {[['Features', 'features'], ['Workspace', 'tour'], ['How it works', 'how'], ['Stories', 'testimonials'], ['FAQ', 'faq']].map(([label, id]) => (
                <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-emerald-950/70 hover:bg-emerald-50 cursor-pointer">
                  {label}
                </a>
              ))}
              <Button onClick={onStart} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white mt-1 cursor-pointer">Sign In</Button>
            </div>
          )}
        </header>

        {/* HERO */}
        <section className="relative pt-16 pb-20 px-6 lg:pt-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-12 items-center">
              {/* Left copy */}
              <div className="text-center lg:text-left">
                <Reveal>
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/10 text-emerald-700 text-xs font-semibold ring-1 ring-emerald-600/20">
                    <Pill className="w-3.5 h-3.5" />
                    The intelligent pharmacy platform
                  </span>
                </Reveal>

                 <Reveal delay={100}>
                   <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.5rem] font-bold font-hero leading-[1.12] text-emerald-950">
                     Manage your pharmacy distribution with{' '}
                     <span className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">complete visibility.</span>
                   </h1>
                 </Reveal>

                <Reveal delay={200}>
                  <p className="mt-6 text-lg text-emerald-950/60 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                    Stock, purchases, sales and expiry alerts — orchestrated in one
                    fast, local-first, beautifully simple workspace built for pharmacists.
                  </p>
                </Reveal>

                <Reveal delay={300}>
                  <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    <Button
                      onClick={onStart}
                      size="xl"
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/25 cursor-pointer"
                    >
                      Enter the Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <button
                      onClick={() => goTo('features')}
                      className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-xl bg-white ring-1 ring-emerald-900/15 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      Explore Features
                    </button>
                  </div>
                </Reveal>

                <Reveal delay={400}>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-emerald-950/50">
                      Trusted by <span className="font-semibold text-emerald-700">5,000+ pharmacists</span> across India
                    </p>
                  </div>
                </Reveal>

                <Reveal delay={480}>
                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 justify-center lg:justify-start opacity-90">
                    {[
                      { icon: Layers, label: 'Batch-level tracking' },
                      { icon: Receipt, label: 'GST-ready billing' },
                      { icon: ScanLine, label: 'AI invoice scanning' },
                      { icon: Boxes, label: 'Multi-warehouse' },
                    ].map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-950/55">
                        <Icon className="w-3.5 h-3.5 text-emerald-600/70" />
                        {label}
                      </span>
                    ))}
                  </div>
                </Reveal>
              </div>

              {/* Right — product window */}
              <Reveal delay={300} className="relative">
                <div className="relative max-w-lg mx-auto lg:ml-auto">
                  {/* Glow behind window */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-teal-200/60 via-teal-100/40 to-teal-200/60 rounded-[2rem] blur-3xl pointer-events-none" />

                  <div className="relative">
                    <ProductWindow />
                  </div>

                  {/* Floating chips */}
                  <div className="hidden lg:block absolute -left-14 top-12 animate-float pointer-events-none">
                    <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-teal-900/10 ring-1 ring-teal-900/10">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-teal-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-950">Expiry Alert</p>
                        <p className="text-[10px] text-emerald-950/50">12 batches due in 30 days</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block absolute -right-10 bottom-10 animate-float pointer-events-none" style={{ animationDelay: '1.5s' }}>
                    <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-teal-900/10 ring-1 ring-teal-900/10">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-950">Invoice scanned</p>
                        <p className="text-[10px] text-emerald-950/50">42 items entered automatically</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Stats strip */}
            <Reveal delay={200}>
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 ring-1 ring-emerald-900/10 shadow-sm">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl sm:text-3xl font-bold font-display text-emerald-700">{value}</p>
                    <p className="mt-1 text-xs text-emerald-950/50">{label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="px-6 py-16 bg-white border-y border-emerald-900/10">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Reveal>
                <div className="rounded-2xl p-7 ring-1 ring-rose-200 bg-rose-50/60 h-full">
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">Without AnPharmacy</p>
                  <h3 className="mt-3 text-xl font-bold font-display text-rose-900">Paper, chaos & guesswork</h3>
                  <ul className="mt-5 space-y-3 text-sm text-rose-900/70">
                    {['Handwritten purchase bills stacked at the counter', 'Expiry dates discovered only after write-off', 'Stock counts that never match the shelf', 'GST reports that take a full weekend'].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="rounded-2xl p-7 ring-1 ring-emerald-200 bg-emerald-50/60 h-full">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">With AnPharmacy</p>
                  <h3 className="mt-3 text-xl font-bold font-display text-emerald-900">One calm command centre</h3>
                  <ul className="mt-5 space-y-3 text-sm text-emerald-900/70">
                    {['Invoices scanned and mapped in seconds', 'Expiry alerts long before the batch dies', 'Stock that updates the moment you sell', 'Reports ready for GST in one click'].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Features — asymmetric bento */}
        <section id="features" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-widest">
                  <LogoMark className="w-5 h-5" /> Features
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display tracking-tight text-emerald-950">
                  Everything Connected. Nothing Overlooked.
                </h2>
                <p className="mt-4 text-emerald-950/60">
                  From the counter to the warehouse — one connected workspace.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc, tint, span }, i) => (
                <Reveal key={title} delay={i * 60} className={cn(span)}>
                  <div className={cn(
                    'group relative h-full rounded-2xl p-6 bg-white ring-1 ring-emerald-900/10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 hover:ring-emerald-500/40 cursor-pointer overflow-hidden',
                    span === 'lg:col-span-2' && 'lg:p-8'
                  )}>
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#990066] via-[#D4148C] to-[#FF5A8D] opacity-80" />
                    <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-200/0 to-emerald-200/60 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className={cn('relative w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md', tint)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="relative mt-4 text-base font-semibold text-emerald-950 font-display">{title}</h3>
                    <p className={cn('relative mt-1.5 text-sm text-emerald-950/60 leading-relaxed', span === 'lg:col-span-2' && 'max-w-md')}>{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Workspace tour — one tagline per core screen */}
        <section id="tour" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-emerald-700 text-xs font-semibold uppercase tracking-widest">Inside the workspace</span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display tracking-tight text-emerald-950">One workspace. Every workflow.</h2>
                <p className="mt-4 text-emerald-950/60">Five screens, one rhythm — everything your pharmacy runs on.</p>
              </div>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOUR.map(({ icon: Icon, page, tagline, desc, span }, i) => (
                <Reveal key={page} delay={i * 60} className={span}>
                  <div className="group relative h-full rounded-2xl p-7 bg-gradient-to-br from-emerald-50/80 to-white ring-1 ring-emerald-900/10 shadow-sm hover:shadow-lg hover:shadow-emerald-900/10 hover:-translate-y-1 hover:ring-emerald-600/30 transition-all duration-300 cursor-pointer overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-300/20 to-teal-300/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-600/20">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-950/40">{page}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold font-display text-emerald-950 leading-snug">{tagline}</h3>
                    <p className="mt-2 text-sm text-emerald-950/60 leading-relaxed">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="px-6 py-20 bg-white border-y border-emerald-900/10">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-emerald-700 text-xs font-semibold uppercase tracking-widest">How it works</span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display tracking-tight text-emerald-950">Live in three steps</h2>
              </div>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
                <Reveal key={n} delay={i * 80}>
                  <div className="h-full rounded-2xl p-6 bg-white ring-1 ring-emerald-900/10 shadow-sm relative overflow-hidden">
                    <span className="absolute -top-4 right-4 text-[5rem] font-bold font-display text-emerald-900/5 leading-none select-none">{n}</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-emerald-950 font-display">{title}</h3>
                    <p className="mt-1.5 text-sm text-emerald-950/60 leading-relaxed">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-emerald-700 text-xs font-semibold uppercase tracking-widest">Stories</span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display tracking-tight text-emerald-950">Pharmacies that switched</h2>
              </div>
            </Reveal>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              {TESTIMONIALS.map(({ quote, name, role, initials }, i) => (
                <Reveal key={name} delay={i * 80}>
                  <figure className="h-full rounded-2xl p-6 bg-white ring-1 ring-emerald-900/10 shadow-sm flex flex-col">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <blockquote className="mt-4 text-sm text-emerald-950/70 leading-relaxed flex-1">"{quote}"</blockquote>
                    <figcaption className="mt-5 pt-4 border-t border-emerald-900/10 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-xs font-bold text-white">{initials}</div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">{name}</p>
                        <p className="text-xs text-emerald-950/50">{role}</p>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 py-20 bg-white border-y border-emerald-900/10">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="text-center">
                <span className="text-emerald-700 text-xs font-semibold uppercase tracking-widest">FAQ</span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display tracking-tight text-emerald-950">Questions, answered</h2>
              </div>
            </Reveal>
            <div className="mt-10 space-y-3">
              {FAQS.map(({ q, a }, i) => (
                <Reveal key={q} delay={i * 50}>
                  <div className="bg-white rounded-2xl ring-1 ring-emerald-900/10 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer"
                      aria-expanded={openFaq === i}
                    >
                      <span className="text-sm font-semibold text-emerald-950">{q}</span>
                      <ChevronDown className={cn('w-4 h-4 text-emerald-600 flex-shrink-0 transition-transform duration-200', openFaq === i && 'rotate-180')} />
                    </button>
                    <div className={cn('grid transition-all duration-300 ease-out', openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                      <div className="overflow-hidden">
                        <p className="px-6 pb-4 text-sm text-emerald-950/60 leading-relaxed">{a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="px-6 py-20">
          <Reveal>
            <div className="mx-auto max-w-4xl bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-white/10 rounded-full blur-[120px] pointer-events-none" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium ring-1 ring-white/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ready when you are
                </span>
                <h2 className="mt-5 text-3xl sm:text-4xl font-bold font-display tracking-tight text-white">
                  Your entire pharmacy, one login away.
                </h2>
                <p className="mt-4 text-emerald-50/90 max-w-xl mx-auto">
                  Join the counter that runs itself. Start managing stock, sales and expiry — today.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={onStart}
                    size="xl"
                    className="w-full sm:w-auto bg-white hover:bg-emerald-50 text-emerald-700 shadow-xl cursor-pointer"
                  >
                    Get Started — It's Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <button
                    onClick={() => goTo('faq')}
                    className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-6 rounded-xl bg-emerald-600/40 ring-1 ring-white/25 text-sm font-semibold text-white hover:bg-emerald-600/60 transition-colors cursor-pointer"
                  >
                    Read the FAQ
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Footer */}
        <footer className="px-6 pt-16 pb-10 bg-white border-t border-emerald-900/10 mt-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
              {/* Brand */}
              <div>
                <Logo size="md" />
                <p className="mt-4 text-sm text-emerald-950/55 leading-relaxed max-w-sm">
                  A connected workspace for pharmacy distribution, inventory and daily operations.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-600/10 ring-1 ring-emerald-600/20 rounded-full px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Local-first · Offline-ready
                </div>
              </div>
              <FooterCol
                title="Product"
                links={[['Features', 'features'], ['Inventory', 'tour'], ['Expiry', 'tour'], ['Sales', 'tour']]}
              />
              <FooterCol
                title="Company"
                links={[['About', 'cta'], ['Support', 'faq'], ['Contact', 'cta']]}
              />
              <FooterCol
                title="Legal"
                links={[['Privacy', 'top'], ['Terms', 'top']]}
              />
            </div>

            <div className="mt-12 pt-6 border-t border-emerald-900/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950/45">
              <span>© {new Date().getFullYear()} AnPharmacy — All rights reserved.</span>
              <span className="font-mono text-[11px]">v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
