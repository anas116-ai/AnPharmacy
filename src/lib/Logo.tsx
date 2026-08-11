import React from 'react';
import { cn } from './utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'compact';
}

const sizeMap = {
  sm: { box: 36, icon: 20, fontSize: 'text-sm' },
  md: { box: 44, icon: 24, fontSize: 'text-base' },
  lg: { box: 60, icon: 34, fontSize: 'text-xl' },
  xl: { box: 88, icon: 50, fontSize: 'text-3xl' },
};

/**
 * Logo #21 — stylized lowercase "a" with a yellow dot.
 *
 * Built from SOLID filled geometry (a ring bowl + stem bar) so it renders
 * crisply at every size — no thin strokes that can break or vanish.
 * The bowl is a circular ring open on the right; the stem fills that opening
 * and extends down as the letter's tail; the yellow dot anchors the bottom-right.
 *
 * Mark uses currentColor for the glyph so it works on any background;
 * the yellow dot is always accent-yellow.
 */
export function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('block', className)}
      style={style}
      aria-hidden="true"
    >
      {/* Bowl — filled ring open on the right */}
      <path
        d="M26.26 14.5 A13 13 0 1 0 26.26 27.5 L21.06 24.5 A7 7 0 1 1 21.06 17.5 Z"
        fill="currentColor"
      />
      {/* Stem — vertical bar filling the opening + tail */}
      <rect x="23" y="8" width="7" height="30" rx="3.5" fill="currentColor" />
      {/* Yellow accent dot */}
      <circle cx="36" cy="36" r="3.5" fill="#EAB308" />
    </svg>
  );
}

/** Dark slate tile — deep, premium, shows the white glyph + yellow dot. */
export const brandTile = 'bg-gradient-to-br from-[#0B1120] via-[#111827] to-[#1E293B] shadow-lg shadow-slate-900/40';

/**
 * The application-icon tile: rounded gradient box with a subtle top glass
 * shine and a yellow accent line. Reused by the full lockup and by
 * sidebar / header / invoice placements so the mark always sits in the
 * same brand tile. The glyph renders WHITE against the dark tile.
 */
export function BrandTile({
  className,
  markClassName,
  markStyle,
  tone = 'brand',
  style,
}: {
  className?: string;
  markClassName?: string;
  markStyle?: React.CSSProperties;
  tone?: 'brand' | 'glass';
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'relative flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden',
        tone === 'brand'
          ? brandTile
          : 'bg-white/10 border border-white/20 shadow-none',
        className
      )}
      style={style}
    >
      {/* Top glass shine */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-transparent pointer-events-none"
      />
      {/* Inner glow ring */}
      <div className="absolute inset-[3px] rounded-[9px] border border-white/10 pointer-events-none" />
      {/* Yellow accent line */}
      <div className="absolute bottom-[3px] left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent rounded-full" />
      <LogoMark className={cn('text-white relative z-10', markClassName)} style={markStyle} />
    </div>
  );
}

export default function Logo({ className, size = 'md', variant = 'default' }: LogoProps) {
  const s = sizeMap[size];
  const white = variant === 'white';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandTile
        tone={white ? 'glass' : 'brand'}
        style={{ width: s.box, height: s.box }}
        markClassName={cn('opacity-95', white && 'opacity-90')}
        markStyle={{ width: s.icon, height: s.icon }}
      />

      {variant !== 'compact' && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-heading font-bold leading-tight tracking-[-0.03em]',
              white ? 'text-white' : 'text-slate-900 dark:text-white',
              s.fontSize
            )}
          >
            AnPharmacy
            <span
              className={cn(
                'inline-block ml-1 rounded-[2px] align-[0.14em]',
                white ? 'bg-yellow-400' : 'bg-yellow-500 dark:bg-yellow-400'
              )}
              style={{ width: '0.3em', height: '0.3em' }}
            />
          </span>
          <span
            className={cn(
              'text-[9px] leading-tight tracking-[0.2em] uppercase font-medium font-body',
              white ? 'text-yellow-200/60' : 'text-slate-400 dark:text-slate-500'
            )}
          >
            Distribution in motion
          </span>
        </div>
      )}
    </div>
  );
}

/* Animated variant for splash/loading screens */
export function AnimatedLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-[110%] h-[110%] rounded-full border border-slate-400/15 animate-spin-slow" />
        <div className="absolute w-[90%] h-[90%] rounded-full border border-yellow-300/10 animate-spin-slow"
          style={{ animationDirection: 'reverse', animationDuration: '4s' }}
        />
        <div className="absolute w-[70%] h-[70%] rounded-full border border-slate-300/8 animate-spin-slow"
          style={{ animationDuration: '6s' }}
        />
        <div className="absolute w-[60%] h-[60%] rounded-full bg-yellow-500/5 animate-pulse-ring" />
      </div>

      {/* Main mark */}
      <div className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-[#0B1120] via-[#111827] to-[#1E293B] flex items-center justify-center shadow-2xl shadow-slate-900/40 border border-white/15 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-glass-shine opacity-80 pointer-events-none"
          style={{ backgroundSize: '200% 100%' }}
        />
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 80 80">
            <circle cx="12" cy="14" r="1" fill="currentColor" />
            <circle cx="68" cy="18" r="1" fill="currentColor" />
            <circle cx="18" cy="66" r="1" fill="currentColor" />
            <circle cx="64" cy="62" r="1" fill="currentColor" />
            <circle cx="40" cy="8" r="1" fill="currentColor" />
            <circle cx="40" cy="72" r="1" fill="currentColor" />
          </svg>
        </div>
        <div className="absolute inset-[4px] rounded-[20px] border border-white/10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 pointer-events-none" />
        <LogoMark className="w-[68%] h-[68%] text-white relative z-10" style={{ opacity: 0.95 }} />
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-glass-shine opacity-60 pointer-events-none"
          style={{ backgroundSize: '200% 100%', animationDuration: '2.5s' }}
        />
      </div>
    </div>
  );
}
