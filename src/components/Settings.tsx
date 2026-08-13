import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/useTheme';
import { useAppearanceStore, ACCENT_OPTIONS, FONT_OPTIONS, FONT_SIZE_OPTIONS, type AccentColor, type FontFamily, type FontSize } from '../stores/appearanceStore';
import {
  Settings as SettingsIcon, Shield, Database, RefreshCw, Info, LogOut, Copy, CheckCircle,
  Monitor, HardDrive, ExternalLink, BadgeCheck, Clock, Palette, Building2, Sun, Moon,
  LayoutGrid, Rows3, Save, Loader2, Phone, Mail, MapPin, User, Stethoscope, Type,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getStatusLabel, cn } from '../lib/utils';

type SettingsTab = 'appearance' | 'pharmacy' | 'data' | 'license' | 'about';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'pharmacy', label: 'Pharmacy Profile', icon: Building2 },
  { id: 'data', label: 'Data & Backup', icon: Database },
  { id: 'license', label: 'License', icon: Shield },
  { id: 'about', label: 'About', icon: Info },
];

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout, hasPermission, deviceId, licenseStatus, setLicenseStatus, setDeviceId } = useAuthStore();
  const { theme, toggle } = useTheme();
  const { accent, setAccent, density, setDensity, font, setFont, fontSize, setFontSize } = useAppearanceStore();
  const [tab, setTab] = useState<SettingsTab>('appearance');
  const [copied, setCopied] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [autoBackup, setAutoBackup] = useState<{ enabled: boolean; intervalHours: number; lastBackup: string | null }>({ enabled: false, intervalHours: 24, lastBackup: null });
  const [savingBackup, setSavingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Pharmacy profile form
  const [profile, setProfile] = useState({
    store_name: 'AnPharmacy',
    tagline: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    drug_license_no: '',
    owner_name: '',
    footer_note: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadLicenseStatus();
    loadAutoBackupSettings();
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    setProfileLoading(true);
    try {
      if (window.electronAPI?.getCompanyProfile) {
        const result = await window.electronAPI.getCompanyProfile();
        if (result.success && result.profile) {
          const p = result.profile;
          setProfile({
            store_name: p.store_name || 'AnPharmacy',
            tagline: p.tagline || '',
            phone: p.phone || '',
            email: p.email || '',
            address: p.address || '',
            gstin: p.gstin || '',
            drug_license_no: p.drug_license_no || '',
            owner_name: p.owner_name || '',
            footer_note: p.footer_note || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load pharmacy profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      if (window.electronAPI?.saveCompanyProfile) {
        const result = await window.electronAPI.saveCompanyProfile(profile);
        setProfileMessage(result.success
          ? { ok: true, text: 'Pharmacy profile saved successfully.' }
          : { ok: false, text: result.error || 'Failed to save profile.' });
      } else {
        setProfileMessage({ ok: true, text: 'Saved (browser mode — will persist in the desktop app).' });
      }
    } catch (err: any) {
      setProfileMessage({ ok: false, text: err.message || 'Failed to save profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onAutoBackupCompleted) {
      const handler = (result: any) => {
        setAutoBackup((prev) => ({ ...prev, lastBackup: new Date().toISOString() }));
        setBackupMessage(result.success ? `Automatic backup completed: ${result.path}` : `Automatic backup failed: ${result.error}`);
      };
      window.electronAPI.onAutoBackupCompleted(handler);
    }
  }, []);

  const loadAutoBackupSettings = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getAutoBackupSettings();
        if (result.success && result.settings) {
          setAutoBackup(result.settings);
        }
      }
    } catch (err) {
      console.error('Failed to load auto-backup settings:', err);
    }
  };

  const loadLicenseStatus = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getLicenseStatus();
        setLicenseStatus(result.status);
        setDeviceId(result.deviceId || '');
        setLicenseInfo(result.license);
      }
    } catch (err) {
      console.error('Failed to load license:', err);
    }
  };

  const handleDeactivate = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.deactivateLicense();
      }
      logout();
    } catch (err) {
      console.error('Failed to deactivate:', err);
    }
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshData = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.getDashboardStats();
      }
      window.location.reload();
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  };

  const getLicenseBadgeVariant = (): any => {
    switch (licenseStatus) {
      case 'active': return 'safe';
      case 'expired':
      case 'needs_heartbeat': return 'warning';
      case 'invalid':
      case 'not_activated': return 'destructive';
      default: return 'default';
    }
  };

  const getLicenseStatusColor = () => {
    switch (licenseStatus) {
      case 'active': return 'text-success';
      case 'expired': return 'text-orange-600';
      case 'invalid': return 'text-destructive';
      case 'needs_heartbeat': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };

  const inputCls = "w-full h-10 px-3.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10 transition-all";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl aurora-pill flex items-center justify-center shadow-lg shadow-accent/20">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground font-display tracking-tight">Settings</h2>
            <p className="text-xs text-muted-foreground">Tune the app, your pharmacy identity and data safety</p>
          </div>
        </div>
        {hasPermission('change_settings') && (
          <Button onClick={handleRefreshData} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap border',
              tab === id
                ? 'bg-accent text-accent-foreground border-accent shadow-md dark:bg-accent dark:text-accent-foreground dark:border-accent'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-accent/40'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── APPEARANCE ─── */}
      {tab === 'appearance' && (
        <div className="space-y-6">
          <Card variant="bordered">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent" />
                Accent Color
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Pick the signature color of AnPharmacy. It flows across buttons, links, charts and highlights instantly.
              </p>
              <div className="flex flex-wrap gap-3">
                {ACCENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAccent(opt.value)}
                    className={cn(
                      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer group',
                      accent === opt.value
                        ? 'border-accent/60 bg-accent/10 shadow-md'
                        : 'border-border bg-background hover:border-accent/40 hover:bg-accent/5'
                    )}
                    aria-pressed={accent === opt.value}
                  >
                    <span className={cn('w-5 h-5 rounded-full ring-offset-2 ring-offset-background transition-transform group-hover:scale-110', opt.swatch, accent === opt.value && cn('ring-2', opt.ring))} />
                    <span className="text-sm font-medium">{opt.label}</span>
                    {accent === opt.value && <CheckCircle className="w-4 h-4 text-accent" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="w-4 h-4 text-accent" />
                Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  onClick={() => theme === 'dark' && toggle()}
                  className={cn(
                    'flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left',
                    theme === 'light' ? 'border-accent/60 bg-accent/10 shadow-md' : 'border-border bg-background hover:border-accent/40'
                  )}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold">Light</p>
                    <p className="text-[11px] text-muted-foreground">Bright & clean for daytime counters</p>
                  </div>
                </button>
                <button
                  onClick={() => theme === 'light' && toggle()}
                  className={cn(
                    'flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left',
                    theme === 'dark' ? 'border-accent/60 bg-accent/10 shadow-md' : 'border-border bg-background hover:border-accent/40'
                  )}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold">Dark</p>
                    <p className="text-[11px] text-muted-foreground">Easy on the eyes, colors pop</p>
                  </div>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Tip: by default AnPharmacy follows your Windows theme. Use the toggle in the top bar anytime.
              </p>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="w-4 h-4 text-accent" />
                Typography
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Font family picker — each option renders in its own typeface */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose the typeface that feels right for your counter. It applies everywhere — menus, tables, forms, reports — and is saved for next launch.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {FONT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFont(opt.value as FontFamily)}
                      className={cn(
                        'px-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer',
                        font === opt.value
                          ? 'border-accent/60 bg-accent/10 shadow-md'
                          : 'border-border bg-background hover:border-accent/40 hover:bg-accent/5'
                      )}
                      aria-pressed={font === opt.value}
                    >
                      <span
                        className="block text-base font-semibold text-foreground leading-tight"
                        style={{ fontFamily: `'${opt.label}', 'Inter', sans-serif` }}
                      >
                        {opt.label}
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-1">Aa 123 ₹</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text size */}
              <div>
                <p className="text-xs text-muted-foreground mb-3">Text size</p>
                <div className="flex flex-wrap gap-2.5">
                  {FONT_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFontSize(opt.value as FontSize)}
                      className={cn(
                        'px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer',
                        fontSize === opt.value
                          ? 'border-accent/60 bg-accent/10 text-foreground shadow-md'
                          : 'border-border bg-background text-muted-foreground hover:border-accent/40'
                      )}
                      title={opt.hint}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-accent" />
                Interface Density
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                Compact packs more rows onto the screen for busy stock and sales lists; Comfortable gives rows more breathing room.
              </p>
              <div className="flex flex-wrap gap-3 max-w-lg">
                {([
                  { value: 'compact' as const, label: 'Compact', icon: LayoutGrid, hint: 'Maximum rows per screen' },
                  { value: 'default' as const, label: 'Default', icon: Rows3, hint: 'Balanced' },
                  { value: 'comfortable' as const, label: 'Comfortable', icon: Rows3, hint: 'Roomier rows' },
                ]).map(({ value, label, icon: Icon, hint }) => (
                  <button
                    key={value}
                    onClick={() => setDensity(value)}
                    className={cn(
                      'flex flex-col items-start gap-0.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer',
                      density === value
                        ? 'border-accent/60 bg-accent/10 text-foreground shadow-md'
                        : 'border-border bg-background text-muted-foreground hover:border-accent/40'
                    )}
                    title={hint}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    <span className="text-[10px] font-normal opacity-70">{hint}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── PHARMACY PROFILE ─── */}
      {tab === 'pharmacy' && (
        <Card variant="bordered">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              Pharmacy Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-5">
              These details are printed on invoices, receipts and reports. Keep them accurate for GST compliance.
            </p>
            {profileLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent" /> Store Name
                  </label>
                  <input className={inputCls} value={profile.store_name} onChange={(e) => setProfile({ ...profile, store_name: e.target.value })} placeholder="e.g. Sri Sai Medicals" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-semibold mb-1.5">Tagline</label>
                  <input className={inputCls} value={profile.tagline} onChange={(e) => setProfile({ ...profile, tagline: e.target.value })} placeholder="Short description for receipts" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent" /> Owner / Pharmacist
                  </label>
                  <input className={inputCls} value={profile.owner_name} onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })} placeholder="Owner or in-charge name" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-accent" /> Phone
                  </label>
                  <input className={inputCls} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 ..." />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-accent" /> Email
                  </label>
                  <input className={inputCls} type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="store@example.com" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-accent" /> Drug License No.
                  </label>
                  <input className={inputCls} value={profile.drug_license_no} onChange={(e) => setProfile({ ...profile, drug_license_no: e.target.value })} placeholder="20B / 21B number" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-1.5">GSTIN</label>
                  <input className={inputCls} value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-semibold mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-accent" /> Address
                  </label>
                  <textarea
                    className={cn(inputCls, 'h-20 pt-2.5 resize-none')}
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Shop address for invoices"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-semibold mb-1.5">Invoice Footer Note</label>
                  <textarea
                    className={cn(inputCls, 'h-16 pt-2.5 resize-none')}
                    value={profile.footer_note}
                    onChange={(e) => setProfile({ ...profile, footer_note: e.target.value })}
                    placeholder='e.g. "No return after 10 days without bill."'
                  />
                </div>
              </div>
            )}

            {profileMessage && (
              <div className={cn(
                'mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm animate-fade-in-up',
                profileMessage.ok ? 'bg-success-light text-success dark:bg-success-light' : 'bg-destructive/10 text-destructive'
              )}>
                {profileMessage.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <Info className="w-4 h-4 flex-shrink-0" />}
                {profileMessage.text}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving || profileLoading}
                loading={profileSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── DATA & BACKUP ─── */}
      {tab === 'data' && (
        <div className="space-y-6">
          <Card variant="bordered">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-accent" />
                {t('settings.data')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasPermission('view_backup') && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                      <HardDrive className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t('settings.backup')}</p>
                      <p className="text-xs text-muted-foreground">Create encrypted backup of all data</p>
                    </div>
                  </div>
                  <Button variant="outline-teal" size="sm" className="gap-1.5">
                    <ExternalLink className="w-4 h-4" />
                    Open Backup
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl hover:bg-muted transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-muted rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <RefreshCw className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('settings.refresh')}</p>
                    <p className="text-xs text-muted-foreground">Reload all data from database</p>
                  </div>
                </div>
                <Button onClick={handleRefreshData} variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Auto backup summary */}
          <Card variant="bordered">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Automatic Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Status: <span className={cn('font-semibold', autoBackup.enabled ? 'text-success' : 'text-muted-foreground')}>
                      {autoBackup.enabled ? `Enabled (every ${autoBackup.intervalHours}h)` : 'Disabled'}
                    </span>
                  </p>
                  {autoBackup.lastBackup && (
                    <p className="text-xs text-muted-foreground mt-1">Last automatic backup: {new Date(autoBackup.lastBackup).toLocaleString()}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={async () => {
                  setSavingBackup(true);
                  try {
                    if (window.electronAPI?.setAutoBackupSettings) {
                      const next = { ...autoBackup, enabled: !autoBackup.enabled, lastBackup: autoBackup.lastBackup };
                      const res = await window.electronAPI.setAutoBackupSettings(next);
                      if (res.success && res.settings) setAutoBackup(res.settings);
                    }
                  } finally {
                    setSavingBackup(false);
                  }
                }} disabled={savingBackup} className="gap-1.5">
                  <RefreshCw className={cn('w-3.5 h-3.5', savingBackup && 'animate-spin')} />
                  {autoBackup.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
              {backupMessage && (
                <p className="mt-3 text-xs text-success animate-fade-in-up">{backupMessage}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── LICENSE ─── */}
      {tab === 'license' && (
        <Card variant="bordered">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              {t('settings.license')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  licenseStatus === 'active' ? 'bg-success-light' : 'bg-muted'
                )}>
                  <BadgeCheck className={cn('w-5 h-5', licenseStatus === 'active' ? 'text-success' : 'text-muted-foreground/60')} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">License Status</p>
                  <p className={cn('text-sm font-bold', getLicenseStatusColor())}>
                    {getStatusLabel(licenseStatus || 'not_activated')}
                  </p>
                </div>
              </div>
              <Badge variant={getLicenseBadgeVariant()} size="md">
                {licenseStatus === 'active' ? 'Active' : licenseStatus === 'expired' ? 'Expired' : licenseStatus === 'invalid' ? 'Invalid' : licenseStatus === 'needs_heartbeat' ? 'Verify Needed' : 'Not Activated'}
              </Badge>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {t('license.deviceId')}
                </span>
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted/50 rounded-xl px-4 py-3 text-xs font-mono text-foreground/80 border border-border select-all">
                  {deviceId || 'Loading...'}
                </code>
                <button
                  onClick={handleCopyDeviceId}
                  className="px-3 py-2 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-all duration-200 cursor-pointer"
                  title="Copy Device ID"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {hasPermission('deactivate_license') && (
              <Button onClick={handleDeactivate} variant="destructive" size="sm" className="mt-2">
                {t('license.deactivate')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── ABOUT ─── */}
      {tab === 'about' && (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-accent" />
              {t('app.name')} — {t('settings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 aurora-pill rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                <SettingsIcon className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{t('app.name')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('app.tagline')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline-teal" size="sm">v1.0.0</Badge>
                  <Badge variant="secondary" size="sm">{t('settings.company')}</Badge>
                </div>
              </div>
            </div>
            {user && (
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br',
                  user.role === 'admin' ? 'from-accent via-teal-400 to-emerald-500' :
                  user.role === 'sales' ? 'from-sky-500 via-blue-500 to-indigo-500' : 'from-amber-500 via-orange-500 to-rose-500'
                )}>
                  {user.displayName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{user.username} · {user.role}</p>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center pt-2">
              <Button onClick={logout} variant="destructive" size="xl" className="gap-2 px-10">
                <LogOut className="w-5 h-5" />
                {t('common.logout')}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-6">
              © 2024 {t('settings.company')}. {t('settings.copyright')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
