import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import Logo from '../lib/Logo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { LogIn, Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';

const DEMO_CREDENTIALS = [
  { role: 'Admin', username: 'admin', password: 'admin@123' },
  { role: 'Sales', username: 'sales', password: 'sales@123' },
  { role: 'Purchase', username: 'purchase', password: 'purchase@123' },
];

export default function LoginScreen() {
  const { t } = useTranslation();
  const { setUser } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-[#060e1a] via-[#0A1628] to-[#0F2B4A]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: '48px 48px' }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/6 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-500/8 rounded-full blur-[100px] -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="relative z-10 w-full flex min-h-screen">
        {/* Left: Brand Panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-12 relative">
          <div className="relative space-y-8 max-w-lg">
            <Logo size="lg" variant="white" className="mb-2" />

            <div className="space-y-4">
              <h2 className="text-3xl font-semibold text-white leading-tight tracking-tight">
                Intelligent Pharmacy<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-emerald-400">
                  Management System
                </span>
              </h2>
              <p className="text-navy-300/60 text-sm leading-relaxed max-w-md">
                Complete medicine distribution, inventory tracking, sales management,
                and expiry monitoring — all in one platform.
              </p>
            </div>

            <div className="space-y-2.5 pt-4">
              {[
                'Stock & Inventory Management',
                'Real-time Expiry Tracking',
                'Sales & Purchase Analytics',
                'Multi-user Role Management',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                  <span className="text-navy-300/70 text-sm">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Login Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="glass-enterprise rounded-2xl p-8 lg:p-10 animate-fade-in-up">
              {/* Mobile Logo */}
              <div className="lg:hidden flex justify-center mb-8">
                <Logo size="md" />
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-foreground tracking-tight">Welcome Back</h2>
                <p className="text-muted-foreground text-sm mt-1.5">Sign in to manage your pharmacy</p>
              </div>

              {/* Quick Access */}
              <div className="mb-8">
                <p className="text-[11px] text-muted-foreground text-center uppercase tracking-widest font-semibold mb-3">
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
                          ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                          : cred.role === 'Sales'
                          ? 'bg-success/10 border-success/20 text-success hover:bg-success/20'
                          : 'bg-warning/10 border-warning/20 text-warning hover:bg-warning/20'
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
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground font-medium">
                    or sign in with credentials
                  </span>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label htmlFor="login-username" className="block text-[13px] font-semibold text-foreground mb-1.5">
                    Username
                  </label>
                  <Input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    icon={<User className="w-4 h-4" />}
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-[13px] font-semibold text-foreground mb-1.5">
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    icon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-destructive text-sm">{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  loading={isLoading}
                  size="xl"
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>© 2024 Anphacy</span>
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
