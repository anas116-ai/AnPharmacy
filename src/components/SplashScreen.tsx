import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatedLogo } from '../lib/Logo';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setShowContent(true), 50);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setProgress(10);
      await new Promise(r => setTimeout(r, 50));
      if (!mounted) return;

      try {
        if (window.electronAPI) {
          setProgress(30);
          const result = await window.electronAPI.dbInit();
          if (!mounted) return;
          setProgress(result.success ? 70 : 50);
        }
      } catch {
        if (mounted) setProgress(50);
      }

      setProgress(80);
      if (mounted) {
        setProgress(100);
        await new Promise(r => setTimeout(r, 200));
        onComplete();
      }
    };

    init();
    return () => { mounted = false; };
  }, [onComplete, t]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#060e1a] via-[#0A1628] to-[#0F2B4A] flex items-center justify-center overflow-hidden">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-success-light/8 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '0s' }} />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-navy-400/8 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: '48px 48px' }}
      />

      <div className={`relative text-center space-y-8 transition-all duration-700 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        {/* Brand mark */}
        <div className="relative inline-block">
          <AnimatedLogo />
        </div>

        {/* App name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold text-white tracking-tight">
            {t('app.name')}
          </h1>
          <p className="text-navy-300/60 text-sm max-w-xs mx-auto">
            {t('app.tagline')}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-72 mx-auto space-y-3">
          <div className="relative h-1.5 bg-background/8 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #EAB308, #FACC15)',
                boxShadow: '0 0 12px rgba(234, 179, 8, 0.35)'
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-navy-300/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-light opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-light" />
            </span>
            <span>{progress < 100 ? 'Initializing...' : 'Ready'}</span>
            <span className="text-navy-400/40 font-mono text-[10px]">{Math.round(progress)}%</span>
          </div>
        </div>

        <p className="text-navy-400/30 text-[10px] font-mono tracking-widest uppercase">v1.0.0</p>
      </div>
    </div>
  );
}
