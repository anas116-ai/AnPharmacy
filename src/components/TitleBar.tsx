import { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Emblem } from '../lib/Logo';

// ponytail: custom titlebar for the frameless desktop window; hidden in browser mode
export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const isDesktop = window.electronAPI?.isDesktop === true;

  useEffect(() => {
    if (!isDesktop) return;
    window.electronAPI.isWindowMaximized().then(r => {
      if (r?.success) setMaximized(!!r.maximized);
    });
    window.electronAPI.onWindowMaximized(m => setMaximized(m));
  }, [isDesktop]);

  if (!isDesktop) return null;

  return (
    <div
      className="relative h-9 flex items-center justify-between bg-slate-950 border-b border-white/[0.06] select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Aurora accent strip */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#990066] via-[#D4148C] to-[#FF5A8D] opacity-70 pointer-events-none" aria-hidden="true" />
      {/* App identity */}
      <div className="flex items-center gap-2 pl-3 min-w-0">
        <Emblem className="w-4 h-4 shadow-[0_0_10px_-1px_rgba(212,20,140,0.6)]" />
        <span className="text-xs font-semibold text-slate-200 tracking-tight truncate">AnPharmacy</span>
        <span className="hidden md:inline text-[10px] text-slate-400">— Intelligent Pharmacy Management</span>
      </div>

      {/* Window controls */}
      <div className="flex items-stretch h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-11 h-full flex items-center justify-center hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-white cursor-pointer"
          aria-label="Minimize"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI.toggleMaximize()}
          className="w-11 h-full flex items-center justify-center hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-white cursor-pointer"
          aria-label={maximized ? 'Restore' : 'Maximize'}
          title={maximized ? 'Restore down' : 'Maximize'}
        >
          {maximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-11 h-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors text-slate-400 cursor-pointer"
          aria-label="Close"
          title="Close (minimize to tray)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
