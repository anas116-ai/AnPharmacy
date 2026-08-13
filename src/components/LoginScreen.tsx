import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import Logo from '../lib/Logo';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import {
  LogIn, Eye, EyeOff, User, Lock, AlertCircle,
  Package, Bell, BarChart3, ShieldCheck, Users, ScanLine,
  CheckCircle2, ArrowRight, Sparkles, Pill, Syringe, Stethoscope,
} from 'lucide-react';

const FLOATING_MEDICINES = [
  { icon: Pill, top: '12%', left: '8%', size: 'w-14 h-14', dur: '9s', delay: '0s', tint: 'from-[#D4148C]/25 to-[#FF5A8D]/10 border-[#FF5A8D]/30' },
  { icon: Syringe, top: '30%', left: '68%', size: 'w-12 h-12', dur: '11s', delay: '1.2s', tint: 'from-fuchsia-500/25 to-pink-500/10 border-fuchsia-400/30' },
  { icon: Stethoscope, top: '62%', left: '12%', size: 'w-14 h-14', dur: '10s', delay: '0.6s', tint: 'from-rose-500/25 to-fuchsia-500/10 border-rose-400/30' },
  { icon: Package, top: '72%', left: '80%', size: 'w-14 h-14', dur: '12s', delay: '2s', tint: 'from-[#990066]/25 to-[#D4148C]/10 border-[#D4148C]/30' },
  { icon: Pill, top: '45%', left: '38%', size: 'w-11 h-11', dur: '8s', delay: '1.8s', tint: 'from-pink-500/25 to-rose-500/10 border-pink-400/30' },
  { icon: Syringe, top: '16%', left: '82%', size: 'w-12 h-12', dur: '13s', delay: '0.3s', tint: 'from-[#FF5A8D]/25 to-[#D4148C]/10 border-[#FF5A8D]/30' },
  { icon: Stethoscope, top: '78%', left: '26%', size: 'w-14 h-14', dur: '9.5s', delay: '2.4s', tint: 'from-fuchsia-600/25 to-pink-500/10 border-fuchsia-400/30' },
  { icon: Package, top: '8%', left: '48%', size: 'w-12 h-12', dur: '10.5s', delay: '1s', tint: 'from-rose-500/20 to-fuchsia-500/10 border-rose-400/30' },
  { icon: Pill, top: '52%', left: '92%', size: 'w-14 h-14', dur: '12.5s', delay: '0.9s', tint: 'from-[#D4148C]/25 to-[#990066]/10 border-[#D4148C]/30' },
  { icon: Syringe, top: '8%', left: '24%', size: 'w-11 h-11', dur: '8.5s', delay: '1.5s', tint: 'from-pink-500/25 to-[#FF5A8D]/10 border-pink-400/30' },
  { icon: Stethoscope, top: '58%', left: '56%', size: 'w-12 h-12', dur: '11.5s', delay: '2.8s', tint: 'from-[#990066]/20 to-[#D4148C]/10 border-[#D4148C]/25' },
  { icon: Package, top: '26%', left: '30%', size: 'w-14 h-14', dur: '13.5s', delay: '0.2s', tint: 'from-rose-500/20 to-pink-500/10 border-rose-400/25' },
];

const DEMO_CREDENTIALS = [
  { role: 'Admin', username: 'admin', password: 'admin@123' },
  { role: 'Sales', username: 'sales', password: 'sales@123' },
  { role: 'Purchase', username: 'purchase', password: 'purchase@123' },
];

const HERO_FEATURES = [
  { icon: Package, label: 'Stock & Inventory', desc: 'Live batch, expiry & stock control' },
  { icon: ScanLine, label: 'Invoice Scanning', desc: 'AI-powered purchase entry' },
  { icon: BarChart3, label: 'Sales Analytics', desc: 'Revenue & margin insights' },
  { icon: Bell, label: 'Expiry Alerts', desc: 'Never miss a near-expiry batch' },
  { icon: Users, label: 'Multi-user Roles', desc: 'Admin, sales & purchase access' },
  { icon: ShieldCheck, label: 'Data Safety', desc: 'Local-first, encrypted storage' },
];

const STATS = [
  { value: '1M+', label: 'Medicines tracked' },
  { value: '100%', label: 'Offline capable' },
  { value: '24/7', label: 'Local-first data' },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const { setUser } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);

  const fieldCls = (field: 'username' | 'password') => cn(
    'w-full h-11 pl-10 rounded-xl bg-slate-950/70 border text-white text-sm placeholder:text-slate-500 focus:outline-none transition-all duration-200',
    error
      ? 'border-red-400/60'
      : focusedField === field
        ? 'border-emerald-400/60 ring-4 ring-emerald-500/15 bg-slate-900/80'
        : 'border-white/15 hover:border-white/30'
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.login({ username, password });
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          setError(result.error || t('login.error'));
        }
      } else {
        const demoUsers: Record<string, { id: number; displayName: string; role: 'admin' | 'sales' | 'purchase_mgr'; password: string }> = {
          admin: { id: 1, displayName: 'Administrator', role: 'admin', password: 'admin@123' },
          sales: { id: 2, displayName: 'Sales Representative', role: 'sales', password: 'sales@123' },
          purchase: { id: 3, displayName: 'Purchase Manager', role: 'purchase_mgr', password: 'purchase@123' },
        };
        const user = demoUsers[username.toLowerCase()];
        if (user && password === user.password) {
          setUser({ id: user.id, username: username.toLowerCase(), displayName: user.displayName, role: user.role });
        } else {
          setError(t('login.error'));
        }
      }
    } catch (err: any) {
      setError(err.message || t('login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    setUsername(role);
    const pw = DEMO_CREDENTIALS.find(c => c.username === role)?.password || '';
    setPassword(pw);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-950">
      {/* Ambient background — aurora mesh + drifting color field */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Flowing aurora gradient field — always dark, regardless of system theme */}
        <div className="absolute inset-0 aurora-mesh-dark aurora-animated" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`, backgroundSize: '56px 56px' }}
        />
        {/* Breathing color orbs */}
        <div className="absolute -top-40 -right-40 w-[640px] h-[640px] bg-[#D4148C]/15 rounded-full blur-[140px] animate-aurora-breathe" />
        <div className="absolute bottom-0 -left-40 w-[560px] h-[560px] bg-[#FF5A8D]/16 rounded-full blur-[140px] animate-aurora-breathe" style={{ ['--breathe-dur' as any]: '11s' }} />
        <div className="absolute top-1/2 left-1/4 w-[420px] h-[420px] bg-[#990066]/12 rounded-full blur-[120px] animate-aurora-breathe" style={{ ['--breathe-dur' as any]: '13s' }} />
        <div className="absolute top-10 left-[45%] w-[300px] h-[300px] bg-fuchsia-500/10 rounded-full blur-[110px] animate-aurora-breathe" style={{ ['--breathe-dur' as any]: '15s' }} />

        {/* Animated floating medicines — drifting up like a gentle distribution flow */}
        <div className="absolute inset-0 overflow-hidden">
          {FLOATING_MEDICINES.map(({ icon: Icon, top, left, size, dur, delay, tint }, i) => (
            <div
              key={i}
              className="absolute animate-float-up"
              style={{ top, left, animationDuration: dur, animationDelay: delay }}
            >
              <span className={cn(
                'block rounded-2xl bg-gradient-to-br ring-1 shadow-lg shadow-black/30 flex items-center justify-center backdrop-blur-sm',
                size, tint
              )}>
                <Icon className="w-6 h-6 text-white/80" />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full flex min-h-screen">
        {/* Left: Brand Hero Panel */}
        <div className="hidden lg:flex lg:w-[54%] flex-col justify-between px-16 py-12 relative">
          <Logo size="lg" variant="white" className="mb-2" />

          <div className="space-y-10 max-w-lg">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                Complete medicine distribution platform
              </span>
              <h2 className="text-4xl font-semibold text-white leading-[1.1] tracking-tight font-display">
                Run your pharmacy<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF5A8D] via-[#D4148C] to-[#990066]">
                  like a well-oiled machine.
                </span>
              </h2>
              <p className="text-slate-400 text-[15px] leading-relaxed max-w-md">
                Stock, purchases, sales, expiry alerts and GST-ready reports —
                everything your pharmacy needs, in one fast local-first app.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3">
              {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-emerald-400/20 transition-all duration-200">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4148C]/20 to-[#FF5A8D]/10 border border-[#FF5A8D]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white leading-tight">{label}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-10 pt-6 border-t border-white/[0.06]">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-xl font-semibold text-white font-display tracking-tight">{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Panel */}
        <div className="w-full lg:w-[46%] flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <Logo size="md" />
            </div>

            <div className="aurora-border-card bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-8 lg:p-10 border border-white/15 shadow-2xl shadow-black/50 animate-fade-in-up">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-emerald-300 mb-2">
                  <div className="h-px w-8 bg-emerald-400/40" />
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-emerald-300/80">Sign in</span>
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight font-display">Welcome to AnPharmacy</h2>
                <p className="text-slate-500 text-sm mt-1.5">Every Medicine. Under Control.</p>
              </div>

              {/* Quick Access */}
              <div className="mb-8">
                <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest font-semibold mb-3">
                  Quick Access
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.username}
                      onClick={() => handleQuickLogin(cred.username)}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border',
                        'hover:shadow-md active:scale-[0.97]',
                        cred.role === 'Admin'
                          ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/20'
                          : cred.role === 'Sales'
                          ? 'bg-sky-500/10 border-sky-400/25 text-sky-300 hover:bg-sky-500/20'
                          : 'bg-amber-500/10 border-amber-400/25 text-amber-300 hover:bg-amber-500/20'
                      )}
                    >
                      {cred.role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900/80 px-3 text-slate-500 font-medium backdrop-blur-sm">
                    or sign in with credentials
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="login-username" className="block text-[13px] font-semibold text-slate-200 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your username"
                      autoComplete="username"
                      aria-invalid={!!error}
                      className={cn(fieldCls('username'), 'pr-4')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-[13px] font-semibold text-slate-200 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={!!error}
                      className={cn(fieldCls('password'), 'pr-11')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[13px]">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-emerald-500 bg-slate-900 border-white/20" />
                    Remember me
                  </label>
                  <button type="button" className="text-emerald-300 hover:text-emerald-200 font-medium transition-colors cursor-pointer">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/15 border border-red-400/40 rounded-xl px-4 py-3 flex items-center gap-2 animate-fade-in" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-red-200 text-sm">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  loading={isLoading}
                  size="xl"
                  className="w-full bg-gradient-to-r from-[#990066] via-[#D4148C] to-[#FF5A8D] hover:from-[#B3007A] hover:to-[#FF7AA8] text-white shadow-lg shadow-[#D4148C]/30 hover:shadow-[#D4148C]/40 transition-all disabled:opacity-60"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  {isLoading ? 'Signing in…' : 'Sign In'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Secure local-first access
                  </span>
                  <span className="font-mono text-[11px]">v1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

