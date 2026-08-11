import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Copy, CheckCircle, XCircle, Key, Monitor, Fingerprint } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface LicenseActivationProps {
  onActivated: () => void;
}

export default function LicenseActivation({ onActivated }: LicenseActivationProps) {
  const { t } = useTranslation();
  const [deviceId, setDeviceId] = useState('Loading...');
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDeviceId();
  }, []);

  const loadDeviceId = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getLicenseStatus();
        setDeviceId(result.deviceId || 'Unknown');
      } else {
        setDeviceId('DEV-TEST-' + Math.random().toString(36).substring(2, 10).toUpperCase());
      }
    } catch {
      setDeviceId('ERROR-LOADING-DEVICE-ID');
    }
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Please enter a license key');
      return;
    }

    setIsActivating(true);
    setError('');

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.activateLicense({ licenseKey: licenseKey.trim() });
        if (result.success) {
          setSuccess(true);
          setTimeout(() => onActivated(), 1500);
        } else {
          setError(result.error || t('license.error'));
        }
      } else {
        setSuccess(true);
        setTimeout(() => onActivated(), 1500);
      }
    } catch (err: any) {
      setError(err.message || t('license.error'));
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-700 to-cyan-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/100/5 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-background/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/20 animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-400/30 to-teal-600/30 rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">{t('license.title')}</h1>
            <p className="text-accent/60 mt-1 text-sm">{t('app.tagline')}</p>
          </div>

          {success ? (
            <div className="text-center py-8 animate-bounce-in">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-white text-lg font-medium">{t('license.success')}</p>
            </div>
          ) : (
            <>
              {/* Device ID */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-medium text-accent/90 mb-2">
                  <Fingerprint className="w-4 h-4" />
                  {t('license.deviceId')}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background/5 rounded-xl px-4 py-3 text-sm font-mono text-white/90 border border-white/10 select-all truncate">
                    {deviceId}
                  </div>
                  <button
                    onClick={handleCopyDeviceId}
                    className="px-3 py-2 bg-background/10 hover:bg-background/20 rounded-xl transition-all duration-200 border border-white/10 hover:scale-105 active:scale-95 flex-shrink-0"
                    title="Copy Device ID"
                  >
                    {copied ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5 text-white/70" />
                    )}
                  </button>
                </div>
              </div>

              {/* License Key Input */}
              <div className="mb-6">
                <label htmlFor="license-key" className="flex items-center gap-2 text-sm font-medium text-accent/90 mb-2">
                  <Key className="w-4 h-4" />
                  {t('license.key')}
                </label>
                <Input
                  id="license-key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder={t('license.placeholder')}
                  className="bg-background/10 border-white/20 text-white placeholder:text-white/40 h-12 rounded-xl focus:bg-background/15 font-mono tracking-wider dark:bg-background/10 dark:border-white/20 dark:text-white"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 flex items-center gap-2 bg-destructive/100/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}

              {/* Activate Button */}
              <Button
                onClick={handleActivate}
                disabled={isActivating}
                size="xl"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-teal-500 to-teal-400 text-white hover:from-teal-600 hover:to-teal-500 shadow-lg shadow-teal-500/30"
              >
                {isActivating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('license.activating')}
                  </span>
                ) : (
                  t('license.activate')
                )}
              </Button>

              {/* Help */}
              <div className="mt-6 text-center">
                <p className="text-accent/40 text-xs">
                  {t('license.help')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
