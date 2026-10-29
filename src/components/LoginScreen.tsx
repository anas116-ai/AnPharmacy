import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import Logo from '../lib/Logo';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import {
  LogIn, Eye, EyeOff, User, Lock, AlertCircle,
  Package, Bell, BarChart3, ShieldCheck, Users, ScanLine,
  CheckCircle2, ArrowRight, ArrowLeft
} from 'lucide-react';

const DEMO_CREDENTIALS = [
  { role: 'Admin', username: 'admin', password: 'admin@123' },
  { role: 'Sales', username: 'sales', password: 'sales@123' },
  { role: 'Purchase', username: 'purchase', password: 'purchase@123' },
];

const HERO_FEATURES = [
  { icon: Package, label: 'Stock & Inventory', desc: 'Live batch, expiry & FEFO control' },
  { icon: ScanLine, label: 'OCR Invoice Intake', desc: 'Instant optical purchase ingestion' },
  { icon: BarChart3, label: 'Distribution Analytics', desc: 'Real-time margins & velocity metrics' },
  { icon: Bell, label: 'Proactive Expiry Radar', desc: 'Automatic 30/60/90-day alert thresholds' },
  { icon: Users, label: 'Role-Based Governance', desc: 'Strict separation of counter & admin privileges' },
  { icon: ShieldCheck, label: 'Air-Gapped Privacy', desc: '100% offline, AES-256 local storage' },
];

const STATS = [
  { value: '100% Offline', label: 'Local SQLite engine' },
  { value: '< 15ms', label: 'Sub-millisecond query' },
  { value: 'Air-Gapped', label: 'Zero-cloud telemetry' },
];

interface LoginScreenProps {
  onBack?: () => void;
}

export default function LoginScreen({ onBack }: LoginScreenProps) {
  const { t } = useTranslation();
  const { setUser } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [focusedField, setFocusedField] = useState<'username' | 'password' | null>(null);

  const fieldCls = (field: 'username' | 'password') => cn(
    'w-full h-11 pl-10 rounded-xl bg-[#F6FAFB] border text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none transition-all duration-200',
    error
      ? 'border-red-400 ring-4 ring-red-100'
      : focusedField === field
        ? 'border-[#14292E] ring-4 ring-[#2E9C90]/40 bg-white'
        : 'border-slate-300 hover:border-slate-400'
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
          setUser(result.user, rememberSession);
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
          setUser(
            { id: user.id, username: username.toLowerCase(), displayName: user.displayName, role: user.role },
            rememberSession
          );
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
    <div className="min-h-screen flex relative overflow-hidden bg-[#EDF5F6] text-slate-900 font-sans selection:bg-[#2E9C90]/40 selection:text-[#14292E]">
      {/* Subtle Ambient Radial Lighting */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[640px] h-[640px] bg-[#2E9C90]/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 -left-40 w-[560px] h-[560px] bg-[#D7EDE7]/25 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full flex min-h-screen">
        {/* Left: Brand Hero Panel */}
        <div className="hidden lg:flex lg:w-[54%] flex-col justify-between px-16 py-12 relative border-r border-slate-200/80 bg-white/40 backdrop-blur-sm">
          {/* Top Bar with Logo and Back Button */}
          <div className="flex items-center justify-between">
            <Logo size="lg" />
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#14292E] hover:border-[#14292E]/30 shadow-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </button>
            )}
          </div>

          <div className="space-y-10 max-w-lg my-auto py-8">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D7EDE7] border border-[#2E9C90] text-[#0E3331] text-xs font-bold shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0E3331]" />
                Enterprise Medicine Distribution Platform
              </span>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-[1.14] tracking-tight">
                Run your pharmacy with{' '}
                <span className="text-[#14292E]">
                  absolute precision.
                </span>
              </h2>
              <p className="text-slate-600 text-[15px] leading-relaxed max-w-md">
                Live batch tracking, automated FEFO allocation, supplier invoice scanning, and instant GST invoices —
                in an air-gapped, zero-latency desktop architecture.
              </p>
            </div>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3">
              {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all duration-200">
                  <div className="w-9 h-9 rounded-xl bg-[#EDF5F6] border border-slate-200 flex items-center justify-center flex-shrink-0 text-[#14292E]">
                    <Icon className="w-4 h-4 text-[#14292E]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 leading-tight">{label}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-10 pt-6 border-t border-slate-200">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-xl font-bold text-slate-900 font-mono tracking-tight">{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Panel */}
        <div className="w-full lg:w-[46%] flex items-center justify-center p-6 lg:p-12 relative">
          {/* Mobile Back Button */}
          {onBack && (
            <div className="lg:hidden absolute top-6 left-6">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#14292E] shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>
          )}

          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <Logo size="md" />
            </div>

            <div className="bg-white rounded-3xl p-8 lg:p-10 border border-slate-200/90 shadow-xl shadow-slate-200/60">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1 w-8 rounded-full bg-[#14292E]" />
                  <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Authentication</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Sign In</h2>
                <p className="text-slate-500 text-sm mt-1">Every Medicine. Under Control.</p>
              </div>

              {/* Quick Access */}
              <div className="mb-8">
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                  Quick Access Profiles
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.username}
                      type="button"
                      onClick={() => handleQuickLogin(cred.username)}
                      className={cn(
                        'py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer',
                        'bg-white border-slate-200 text-[#14292E] hover:border-[#14292E]/30 hover:shadow-sm active:scale-[0.97]'
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
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-500 font-medium">
                    or enter user credentials
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="login-username" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                  <label htmlFor="login-password" className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[13px]">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#14292E] border-slate-300"
                    />
                    Remember session
                  </label>
                  <button type="button" className="text-slate-600 hover:text-[#14292E] font-medium transition-colors cursor-pointer">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2" role="alert">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  loading={isLoading}
                  size="xl"
                  className="w-full bg-[#14292E] hover:bg-[#223A40] text-white border border-[#223A40] shadow-md shadow-[#14292E]/20 transition-all disabled:opacity-60 font-semibold cursor-pointer h-11 rounded-xl text-sm"
                >
                  <LogIn className="w-4 h-4 mr-2 text-[#2E9C90]" />
                  {isLoading ? 'Signing in…' : 'Sign In'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-[#14292E]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Local Air-Gapped Security
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">v1.0.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
