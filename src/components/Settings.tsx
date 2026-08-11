import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { Settings as SettingsIcon, Shield, Database, RefreshCw, Info, LogOut, Copy, CheckCircle, Monitor, HardDrive, ExternalLink, BadgeCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getStatusLabel, cn } from '../lib/utils';

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout, hasPermission, deviceId, licenseStatus, setLicenseStatus, setDeviceId } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [autoBackup, setAutoBackup] = useState<{ enabled: boolean; intervalHours: number; lastBackup: string | null }>({ enabled: false, intervalHours: 24, lastBackup: null });
  const [savingBackup, setSavingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLicenseStatus();
    loadAutoBackupSettings();
  }, []);

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* App Info */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-accent" />
            {t('app.name')} - {t('settings.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
              <SettingsIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground dark:text-foreground">{t('app.name')}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mt-0.5">{t('app.tagline')}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline-teal" size="sm">v1.0.0</Badge>
                <Badge variant="secondary" size="sm">{t('settings.company')}</Badge>
              </div>
            </div>
          </div>
          {/* User Info */}
          {user && (
            <div className="mt-4 pt-4 border-t border-border dark:border-border flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br',
                user.role === 'admin' ? 'from-accent to-accent/80' :
                user.role === 'sales' ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600'
              )}>
                {user.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground dark:text-foreground">{user.displayName}</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">@{user.username} · {user.role}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Info */}
      <Card variant="bordered">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            {t('settings.license')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted/60/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                licenseStatus === 'active' ? 'bg-success-light dark:bg-success-light' : 'bg-muted dark:bg-muted/60'
              )}>
                <BadgeCheck className={cn('w-5 h-5', licenseStatus === 'active' ? 'text-success dark:text-success' : 'text-muted-foreground/60 dark:text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80 dark:text-muted-foreground/70">License Status</p>
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
            <label className="text-xs text-muted-foreground dark:text-muted-foreground/60 block mb-1.5">
              <span className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                {t('license.deviceId')}
              </span>
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-muted/50 dark:bg-muted/60 rounded-xl px-4 py-3 text-xs font-mono text-foreground/80 dark:text-muted-foreground/70 border border-border dark:border-border select-all">
                {deviceId || 'Loading...'}
              </code>
              <button
                onClick={handleCopyDeviceId}
                className="px-3 py-2 bg-muted/50 dark:bg-muted/60 border border-border dark:border-border rounded-xl hover:bg-muted dark:hover:bg-slate-600 hover:border-border dark:hover:border-slate-500 transition-all duration-200"
                title="Copy Device ID"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground dark:text-muted-foreground/60" />}
              </button>
            </div>
          </div>

          {hasPermission('deactivate_license') && (
            <Button
              onClick={handleDeactivate}
              variant="destructive"
              size="sm"
              className="mt-2"
            >
              {t('license.deactivate')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card variant="bordered">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            {t('settings.data')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasPermission('view_backup') && (
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted/60/50 rounded-2xl hover:bg-muted/50 dark:hover:bg-slate-700 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-accent/10 dark:bg-accent/40 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HardDrive className="w-5 h-5 text-accent dark:text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/80 dark:text-muted-foreground/70">{t('settings.backup')}</p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Create encrypted backup of all data</p>
                </div>
              </div>
              <Button variant="outline-teal" size="sm" className="gap-1.5">
                <ExternalLink className="w-4 h-4" />
                Open Backup
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted/60/50 rounded-2xl hover:bg-muted/50 dark:hover:bg-slate-700 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-muted dark:bg-slate-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <RefreshCw className="w-5 h-5 text-muted-foreground dark:text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground/80 dark:text-muted-foreground/70">{t('settings.refresh')}</p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">Reload all data from database</p>
              </div>
            </div>
            <Button onClick={handleRefreshData} variant="outline" size="sm" className="gap-1.5">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={logout}
          variant="destructive"
          size="xl"
          className="gap-2 px-10"
        >
          <LogOut className="w-5 h-5" />
          {t('common.logout')}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground/60 dark:text-muted-foreground pb-8">
        © 2024 {t('settings.company')}. {t('settings.copyright')}
      </p>
    </div>
  );
}
