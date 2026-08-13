import { useEffect, useState } from 'react';
import { Database, HardDrive, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

// ponytail: desktop-only status bar at the bottom — shows what a native app shows
export default function StatusBar() {
  const { user } = useAuthStore();
  const isDesktop = window.electronAPI?.isDesktop === true;
  const [info, setInfo] = useState<{ version?: string; dbPath?: string }>({});

  useEffect(() => {
    if (!isDesktop || !window.electronAPI.getAppInfo) return;
    window.electronAPI.getAppInfo().then(r => {
      if (r?.success) setInfo(r);
    });
  }, [isDesktop]);

  if (!isDesktop) return null;

  return (
    <div className="relative h-6 flex items-center justify-between px-3 bg-slate-950 border-t border-white/[0.06] text-[10px] text-slate-500 select-none shrink-0">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-[#990066]/60 via-[#D4148C]/60 to-[#FF5A8D]/60 opacity-60 pointer-events-none" aria-hidden="true" />
      <div className="flex items-center gap-4 min-w-0">
        <span className="flex items-center gap-1.5 truncate" title="Database location">
          <HardDrive className="w-3 h-3 text-emerald-400/70" />
          <span className="truncate max-w-[280px]">{info.dbPath || 'local database'}</span>
        </span>
        <span className="hidden md:flex items-center gap-1.5">
          <Database className="w-3 h-3 text-sky-400/70" />
          v{info.version || '1.0.0'}
        </span>
        <span className="hidden sm:flex items-center gap-1.5 text-emerald-400/90">
          <ShieldCheck className="w-3 h-3" />
          Data is 100% on this device
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-slate-400">{user?.displayName || 'guest'}</span>
      </div>
    </div>
  );
}
