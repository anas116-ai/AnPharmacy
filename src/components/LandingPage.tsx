import { useEffect, useRef, useState } from 'react';
import Logo, { LogoMark } from '../lib/Logo';
import { Button } from './ui/button';
import {
  Package, ScanLine, BarChart3, Bell, Users, ShieldCheck,
  ArrowRight, Sparkles, IndianRupee, ChevronDown,
  AlertTriangle, Boxes, FileSpreadsheet,
  Quote, Menu, X, Pill, Star, CheckCircle2, Clock, Truck, CalendarClock,
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

/* Animated pharmacy & distribution scene — the hero centerpiece (pure CSS, no images) */
function ProductWindow() {
  return (
    <div className="relative" aria-hidden="true">
      {/* Rotating orbit rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-[340px] h-[340px] rounded-full border border-emerald-500/15 animate-spin-slow" />
        <div className="absolute w-[260px] h-[260px] rounded-full border border-teal-500/20 animate-spin-slow" style={{ animationDuration: '18s', animationDirection: 'reverse' }} />
        <div className="absolute w-[180px] h-[180px] rounded-full border border-emerald-400/25 animate-spin-slow" style={{ animationDuration: '12s' }} />
      </div>

      {/* Orbiting medicine capsules */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-0 h-0" style={{ ['--orbit-r' as any]: '160px', ['--orbit-dur' as any]: '14s' }}>
          <div className="animate-orbit" style={{ ['--orbit-r' as any]: '160px' }}>
            <span className="block w-10 h-14 rounded-xl bg-white shadow-lg shadow-emerald-900/15 ring-1 ring-emerald-900/10 flex items-center justify-center">
              <Pill className="w-5 h-5 text-emerald-600" />
            </span>
          </div>
        </div>
        <div className="absolute w-0 h-0" style={{ ['--orbit-r' as any]: '150px', ['--orbit-dur' as any]: '17s' }}>
          <div className="animate-orbit" style={{ ['--orbit-r' as any]: '150px', animationDirection: 'reverse' }}>
            <span className="block w-10 h-10 rounded-xl bg-white shadow-lg shadow-emerald-900/15 ring-1 ring-emerald-900/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-teal-600" />
            </span>
          </div>
        </div>
        <div className="absolute w-0 h-0" style={{ ['--orbit-r' as any]: '118px', ['--orbit-dur' as any]: '11s' }}>
          <div className="animate-orbit" style={{ ['--orbit-r' as any]: '118px' }}>
            <span className="block w-9 h-9 rounded-xl bg-white shadow-lg shadow-emerald-900/15 ring-1 ring-emerald-900/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </span>
          </div>
        </div>
        <div className="absolute w-0 h-0" style={{ ['--orbit-r' as any]: '130px', ['--orbit-dur' as any]: '19s' }}>
          <div className="animate-orbit" style={{ ['--orbit-r' as any]: '130px', animationDirection: 'reverse' }}>
            <span className="block w-9 h-9 rounded-xl bg-white shadow-lg shadow-emerald-900/15 ring-1 ring-emerald-900/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-sky-600" />
            </span>
          </div>
        </div>
        <div className="absolute w-0 h-0" style={{ ['--orbit-r' as any]: '100px', ['--orbit-dur' as any]: '9s' }}>
          <div className="animate-orbit" style={{ ['--orbit-r' as any]: '100px' }}>
            <span className="block w-8 h-8 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/30 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white" />
            </span>
          </div>
        </div>
      </div>

      {/* Center glass orb with pharmacy cross */}
      <div className="relative mx-auto w-[200px] h-[200px] rounded-[3rem] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-2xl shadow-emerald-600/30 ring-1 ring-white/30 flex items-center justify-center rotate-3">
        <div className="absolute inset-2 rounded-[2.4rem] bg-white/10" />
        <div className="absolute top-4 left-6 w-14 h-14 rounded-full bg-white/20 blur-xl" />
        <div className="relative flex flex-col items-center text-white">
          <Pill className="w-12 h-12" strokeWidth={1.5} />
          <span className="mt-3 text-xs font-bold tracking-widest font-display uppercase">Care in Motion</span>
        </div>
      </div>

      {/* Floating chips */}
      <div className="hidden lg:block absolute -left-16 top-6 animate-bob pointer-events-none" style={{ ['--bob-dur' as any]: '5s' }}>
        <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
          <div className="w-9 h-9 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-950">Expiry Alert</p>
            <p className="text-[10px] text-emerald-950/50">12 batches due in 30 days</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block absolute -right-12 bottom-8 animate-bob pointer-events-none" style={{ ['--bob-dur' as any]: '6.5s', animationDelay: '0.8s' }}>
        <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-950">Invoice scanned</p>
            <p className="text-[10px] text-emerald-950/50">42 items entered automatically</p>
          </div>
        </div>
      </div>

      {/* Bottom distribution flow */}
      <div className="mt-8 relative rounded-2xl bg-white/80 backdrop-blur-xl ring-1 ring-emerald-900/10 shadow-lg shadow-emerald-900/5 px-5 py-4">
        <div className="flex items-center justify-between">
          {[Package, Truck, Boxes, FileSpreadsheet].map((Icon, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                i === 0 ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' : 'bg-emerald-50 ring-1 ring-emerald-900/10 text-emerald-700'
              )}>
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className="text-[9px] font-medium text-emerald-950/60">{['Stock', 'Distribution', 'Warehouse', 'Excel Import'][i]}</span>
            </div>
          ))}
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
              {[['Features', 'features'], ['How it works', 'how'], ['Stories', 'testimonials'], ['FAQ', 'faq']].map(([label, id]) => (
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
                  <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.5rem] font-bold font-display leading-[1.15] text-emerald-950">
                    Your pharmacy,{' '}
                    <span className="text-emerald-600">reimagined</span>
                    <br className="hidden sm:block" />
                    <span className="block sm:inline">as pure clarity.</span>
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
              </div>

              {/* Right — product window */}
              <Reveal delay={300} className="relative">
                <div className="relative max-w-lg mx-auto lg:ml-auto">
                  {/* Glow behind window */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-emerald-200/60 via-teal-100/40 to-sky-200/60 rounded-[2rem] blur-3xl pointer-events-none" />

                  <div className="relative">
                    <ProductWindow />
                  </div>

                  {/* Floating chips */}
                  <div className="hidden lg:block absolute -left-14 top-12 animate-float pointer-events-none">
                    <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-950">Expiry Alert</p>
                        <p className="text-[10px] text-emerald-950/50">12 batches due in 30 days</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden lg:block absolute -right-10 bottom-10 animate-float pointer-events-none" style={{ animationDelay: '1.5s' }}>
                    <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-900/10">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                  <LogoMark className="w-5 h-5 text-slate-900" /> Features
                </span>
                <h2 className="mt-4 text-3xl sm:text-4xl font-bold font-display tracking-tight text-emerald-950">
                  Everything a modern pharmacy runs on
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
                    'group h-full rounded-2xl p-6 bg-white ring-1 ring-emerald-900/10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:ring-emerald-600/30 cursor-pointer',
                    span === 'lg:col-span-2' && 'lg:p-8'
                  )}>
                    <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform duration-300 group-hover:scale-110', tint)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-emerald-950 font-display">{title}</h3>
                    <p className={cn('mt-1.5 text-sm text-emerald-950/60 leading-relaxed', span === 'lg:col-span-2' && 'max-w-md')}>{desc}</p>
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
        <footer className="px-6 pb-10">
          <div className="mx-auto max-w-6xl pt-8 border-t border-emerald-900/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-emerald-950/50">
            <Logo size="sm" className="opacity-90" />
            <div className="flex items-center gap-6">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <Truck className="w-3.5 h-3.5" /> Made for pharmacists
              </span>
              <span className="font-mono text-xs">v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
