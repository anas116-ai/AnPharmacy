import { useState } from 'react';
import {
  MoreHorizontal, ChevronDown, RefreshCw, Calendar,
  ShoppingBag, Grid, AlertCircle, Users,
  Search, Filter, SlidersHorizontal, Trash2, Edit2
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';

interface PharmacyVisualOverviewProps {
  stats: {
    todayRevenue: number;
    todayItems: number;
    yesterdayRevenue: number;
    recentSales?: any[];
  };
  stockMetrics: {
    totalMedicines: number;
    totalStock: number;
    totalValue: number;
    expired: number;
  };
  revenueChange: string;
}

/* Landing-page data ramp — sky, mint, deep teal, coral, mist, sand.
   No green, no lime, no pink: the bars borrow the landing card tints. */
const daysData = [
  { day: 'Mon', val: 35, amt: '₹145.2K', color: 'from-[#D6ECF7] to-[#AFD3E6]' },
  { day: 'Tue', val: 55, amt: '₹210.8K', color: 'from-[#DCF1EC] to-[#B3DDD4]' },
  { day: 'Wed', val: 85, amt: '₹298.0K', color: 'from-[#2E9C90] to-[#123F3D]', active: true },
  { day: 'Thu', val: 45, amt: '₹182.5K', color: 'from-[#FBD9D4] to-[#F0A79C]' },
  { day: 'Fri', val: 65, amt: '₹240.0K', color: 'from-[#E3EDF1] to-[#C4D7DE]' },
  { day: 'Sat', val: 40, amt: '₹168.3K', color: 'from-[#F7E4CD] to-[#E9C39A]' },
];

export default function PharmacyVisualOverview({
  stats,
  stockMetrics,
  revenueChange,
}: PharmacyVisualOverviewProps) {
  const [selectedDay, setSelectedDay] = useState<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'>('Wed');

  return (
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════════════════
         PHARMACY SALES RESULTS — one neutral card language,
         colour only in the icon chip + sparkline.
         ══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">Pharmacy Sales Results</h3>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>This Month</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shadow-xs" aria-label="Refresh sales overview">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Today's Sales — landing mint tint */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#F3FAF9] via-[#EAF6F3] to-[#D7EDE7] dark:from-[#123230] dark:via-[#112D2C] dark:to-[#0F2A29] border border-[#C7EBE6] dark:border-[#7AD1C5]/15 shadow-[0_10px_28px_-20px_rgba(20,41,46,0.35)] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white/70 dark:bg-white/10 text-[#0E5B55] dark:text-[#7AD1C5] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <button className="text-[#14292E]/35 dark:text-white/35 hover:text-[#14292E] dark:hover:text-white transition-colors" aria-label="Card options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold mt-3.5 text-[#14292E]/60 dark:text-white/55">Today's Sales</p>
            <div className="flex items-end justify-between mt-0.5">
              <div className="min-w-0">
                <p className="text-2xl sm:text-[26px] font-bold tracking-tight font-mono tabular-nums text-[#14292E] dark:text-white">
                  {formatCurrency(stats.todayRevenue || 95000)}
                </p>
                <p className="text-[11px] font-semibold mt-1 text-[#0E5B55] dark:text-[#7AD1C5]">
                  +{revenueChange || '2.5'}% <span className="font-medium text-[#14292E]/50 dark:text-white/45">this month</span>
                </p>
              </div>
              <div className="flex items-end gap-1 mb-1 flex-shrink-0" aria-hidden="true">
                <span className="w-1.5 h-4 rounded-full bg-[#14292E]/15 dark:bg-white/15" />
                <span className="w-1.5 h-7 rounded-full bg-[#14292E]/30 dark:bg-white/30" />
                <span className="w-1.5 h-10 rounded-full bg-[#14292E]/75 dark:bg-[#7AD1C5]/80" />
              </div>
            </div>
          </div>

          {/* Card 2: Available Categories — landing sky tint */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#F2FAFD] via-[#E6F4FA] to-[#CDE6F2] dark:from-[#122C33] dark:via-[#112A31] dark:to-[#0F282F] border border-[#C9E3EF] dark:border-[#8FCBE0]/15 shadow-[0_10px_28px_-20px_rgba(20,41,46,0.35)] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white/70 dark:bg-white/10 text-[#1D4A47] dark:text-[#9AD4E8] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none">
                <Grid className="w-4 h-4" />
              </div>
              <button className="text-[#14292E]/35 dark:text-white/35 hover:text-[#14292E] dark:hover:text-white transition-colors" aria-label="Card options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold mt-3.5 text-[#14292E]/60 dark:text-white/55">Available Categories</p>
            <div className="flex items-end justify-between mt-0.5">
              <div className="min-w-0">
                <p className="text-2xl sm:text-[26px] font-bold tracking-tight font-mono tabular-nums text-[#14292E] dark:text-white">
                  {stockMetrics.totalMedicines.toLocaleString()} <span className="text-sm font-medium text-[#14292E]/55 dark:text-white/50">SKUs</span>
                </p>
                <p className="text-[11px] font-semibold mt-1 text-[#0E5B55] dark:text-[#7AD1C5]">
                  +2.5% <span className="font-medium text-[#14292E]/50 dark:text-white/45">active batches</span>
                </p>
              </div>
              <div className="flex items-end gap-1 mb-1 flex-shrink-0" aria-hidden="true">
                <span className="w-1.5 h-5 rounded-full bg-[#14292E]/15 dark:bg-white/15" />
                <span className="w-1.5 h-8 rounded-full bg-[#14292E]/65 dark:bg-[#9AD4E8]/80" />
                <span className="w-1.5 h-6 rounded-full bg-[#14292E]/30 dark:bg-white/30" />
              </div>
            </div>
          </div>

          {/* Card 3: Expired Medicines — coral pastel */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-[#FDEDEA] via-[#FBD9D4] to-[#F8BDB6] dark:from-[#3A2A2B] dark:via-[#35272A] dark:to-[#302328] border border-[#F8BDB6]/80 dark:border-[#F8BDB6]/15 shadow-[0_10px_28px_-20px_rgba(20,41,46,0.45)] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-white/10 text-[#8A3B33] dark:text-[#F8BDB6] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none">
                <AlertCircle className="w-4 h-4" />
              </div>
              <button className="text-[#14292E]/35 dark:text-white/35 hover:text-[#14292E] dark:hover:text-white transition-colors" aria-label="Card options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold mt-3.5 text-[#14292E]/60 dark:text-white/55">Expired Medicines</p>
            <div className="flex items-end justify-between mt-0.5">
              <div className="min-w-0">
                <p className="text-2xl sm:text-[26px] font-bold tracking-tight font-mono tabular-nums text-[#14292E] dark:text-white">
                  {stockMetrics.expired === 0 ? '0.00%' : `${stockMetrics.expired} Items`}
                </p>
                <p className="text-[11px] font-semibold mt-1 text-[#14292E]/50 dark:text-white/45">
                  Loss under control
                </p>
              </div>
              <div className="flex items-end gap-1 mb-1 flex-shrink-0" aria-hidden="true">
                <span className="w-1.5 h-3 rounded-full bg-[#14292E]/15 dark:bg-white/15" />
                <span className="w-1.5 h-9 rounded-full bg-[#14292E]/65 dark:bg-[#F8BDB6]/80" />
                <span className="w-1.5 h-5 rounded-full bg-[#14292E]/30 dark:bg-white/30" />
              </div>
            </div>
          </div>

          {/* Card 4: System Users — landing white card */}
          <div className="relative overflow-hidden rounded-2xl p-5 bg-card border border-[#DCEAEC] dark:border-[#223A40] shadow-[0_10px_28px_-20px_rgba(20,41,46,0.35)] transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#EAF0F3] dark:bg-white/10 text-[#223A40] dark:text-[#8FADB4] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <button className="text-[#14292E]/35 dark:text-white/35 hover:text-[#14292E] dark:hover:text-white transition-colors" aria-label="Card options">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold mt-3.5 text-[#14292E]/60 dark:text-white/55">System Users &amp; Counter</p>
            <div className="flex items-end justify-between mt-0.5">
              <div className="min-w-0">
                <p className="text-2xl sm:text-[26px] font-bold tracking-tight font-mono tabular-nums text-[#14292E] dark:text-white">
                  255+
                </p>
                <p className="text-[11px] font-semibold mt-1 text-[#14292E]/50 dark:text-white/45">
                  +2.5% <span className="font-medium">this month</span>
                </p>
              </div>
              <div className="flex items-end gap-1 mb-1 flex-shrink-0" aria-hidden="true">
                <span className="w-1.5 h-6 rounded-full bg-[#14292E]/15 dark:bg-white/15" />
                <span className="w-1.5 h-4 rounded-full bg-[#14292E]/30 dark:bg-white/30" />
                <span className="w-1.5 h-10 rounded-full bg-[#14292E]/65 dark:bg-[#8FADB4]/80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         VISUAL CHARTS ROW — Donut report & capsule bar overview
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Graph Report Donut */}
        <div className="lg:col-span-5 bg-card rounded-2xl p-6 border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Graph Report</h4>
            <button className="text-muted-foreground/60 hover:text-foreground transition-colors" aria-label="Report options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* SVG donut — deep teal → teal → seafoam → sky */}
          <div className="relative py-6 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-44 h-44 -rotate-90">
              <circle
                cx="100" cy="100" r="70" fill="none"
                className="stroke-[#123F3D] dark:stroke-[#5FC9BB]"
                strokeWidth="22"
                strokeDasharray="184 256" strokeDashoffset="0"
                strokeLinecap="round"
              />
              <circle
                cx="100" cy="100" r="70" fill="none"
                className="stroke-[#3FA79B] dark:stroke-[#3FA79B]"
                strokeWidth="22"
                strokeDasharray="123 317" strokeDashoffset="-190"
                strokeLinecap="round"
              />
              <circle
                cx="100" cy="100" r="70" fill="none"
                className="stroke-[#A8DCD3] dark:stroke-[#A8DCD3]"
                strokeWidth="22"
                strokeDasharray="79 361" strokeDashoffset="-320"
                strokeLinecap="round"
              />
              <circle
                cx="100" cy="100" r="70" fill="none"
                className="stroke-[#CFE7F2] dark:stroke-[#CFE7F2]"
                strokeWidth="22"
                strokeDasharray="52 388" strokeDashoffset="-405"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center select-none">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="block text-xl font-bold text-foreground font-mono tracking-tight">755K</span>
            </div>
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground pt-3 border-t border-border/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#123F3D] dark:bg-[#5FC9BB]" />
              Purchases 42%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3FA79B]" />
              Suppliers 28%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#A8DCD3]" />
              Sales 18%
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#CFE7F2]" />
              Inventory 12%
            </span>
          </div>
        </div>

        {/* Right: Total Sales Overview */}
        <div className="lg:col-span-7 bg-card rounded-2xl p-6 border border-border/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground text-sm">Total Sales Overview</h4>
            <button className="text-muted-foreground/60 hover:text-foreground transition-colors" aria-label="Overview options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-7 pb-3 relative">
            {/* Active day readout */}
            <div className="flex justify-center mb-2">
              <div className="inline-flex flex-col items-center px-3 py-1 rounded-lg bg-foreground text-background shadow-sm">
                <span className="text-[9px] opacity-70 font-medium">Apr, 2026</span>
                <span className="text-xs font-bold font-mono">₹298.00K</span>
              </div>
            </div>

            {/* 6 vertical pill bars */}
            <div className="grid grid-cols-6 gap-3 sm:gap-6 items-end h-44 px-2">
              {daysData.map((d) => (
                <div
                  key={d.day}
                  onClick={() => setSelectedDay(d.day as any)}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group"
                >
                  <div className="w-8 sm:w-11 h-36 rounded-full bg-muted/60 p-1 flex flex-col justify-end relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.04]">
                    <div
                      className={cn(
                        "w-full rounded-full bg-gradient-to-t transition-all duration-300",
                        d.color,
                        selectedDay === d.day ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'
                      )}
                      style={{ height: `${d.val}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[11px]",
                    selectedDay === d.day ? "text-foreground font-semibold" : "text-muted-foreground font-medium"
                  )}>
                    {d.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border/70">
            <span>Weekly Sales Distribution</span>
            <span className="font-semibold text-foreground">Highest: Wednesday (₹2.98L)</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         RECENT SALES LIST
         ══════════════════════════════════════════════════════════════ */}
      <div className="bg-card rounded-2xl p-6 border border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h4 className="font-semibold text-foreground text-sm">Recent Sales List</h4>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search sales..."
                aria-label="Search sales"
                className="pl-8 pr-3 py-1.5 rounded-lg bg-muted/60 border border-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#17827A]/40 dark:focus:border-[#2E9C90]/40 focus:bg-card w-44"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Filter className="w-3 h-3" />
              Filter
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <SlidersHorizontal className="w-3 h-3" />
              Sort By
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/70 text-muted-foreground font-medium">
                <th className="pb-2.5 pl-2 font-medium">Customer</th>
                <th className="pb-2.5 font-medium">Medicine</th>
                <th className="pb-2.5 font-medium">Prescriber / Contact</th>
                <th className="pb-2.5 text-center font-medium">Quantity</th>
                <th className="pb-2.5 font-medium">Total Price</th>
                <th className="pb-2.5 font-medium">Date</th>
                <th className="pb-2.5 text-right pr-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {[
                { name: 'Susan Williams', avatar: 'SW', med: 'Amoxicillin 625mg', email: 'susan.w@medmail.com', qty: 1, price: '₹152.00', date: 'Apr 26, 2026' },
                { name: 'Bentley Howard', avatar: 'BH', med: 'Paracetamol IP 650mg', email: 'bentley.h@medmail.com', qty: 2, price: '₹196.00', date: 'Apr 26, 2026' },
                { name: 'Evelyn Johnson', avatar: 'EJ', med: 'Azithromycin 500mg', email: 'evelyn.j@medmail.com', qty: 1, price: '₹270.00', date: 'Apr 25, 2026' },
                { name: 'David Miller', avatar: 'DM', med: 'Cetirizine 10mg', email: 'david.m@medmail.com', qty: 3, price: '₹95.00', date: 'Apr 25, 2026' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3 pl-2 font-medium text-foreground">
                    <span className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-[#17827A]/10 text-[#17827A] dark:bg-[#17827A]/20 dark:text-[#2E9C90] font-semibold flex items-center justify-center text-[10px]">
                        {row.avatar}
                      </span>
                      {row.name}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{row.med}</td>
                  <td className="py-3 text-muted-foreground font-mono text-[11px]">{row.email}</td>
                  <td className="py-3 text-center">
                    <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-muted/60 font-medium text-muted-foreground">
                      <span>−</span>
                      <span className="font-semibold text-foreground tabular-nums">{row.qty}</span>
                      <span>+</span>
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-foreground font-mono tabular-nums">{row.price}</td>
                  <td className="py-3 text-muted-foreground">{row.date}</td>
                  <td className="py-3 text-right pr-2">
                    <div className="inline-flex items-center gap-2 text-muted-foreground/60">
                      <button className="hover:text-foreground transition-colors" aria-label={`Edit ${row.name}`}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button className="hover:text-red-600 dark:hover:text-red-400 transition-colors" aria-label={`Delete ${row.name}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
