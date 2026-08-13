import React from 'react';
import { cn } from './utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'compact' | 'mono';
}

const sizeMap = {
  sm: { box: 36, icon: 28, fontSize: 'text-[22px]', tagline: 'text-[10px]' },
  md: { box: 44, icon: 34, fontSize: 'text-[26px]', tagline: 'text-[11px]' },
  lg: { box: 60, icon: 46, fontSize: 'text-[34px]', tagline: 'text-[11px]' },
  xl: { box: 88, icon: 66, fontSize: 'text-[46px]', tagline: 'text-xs' },
};

/**
 * LOGO — "Distribution Hub"
 *
 * Professional, business-grade mark: two supply sources feeding a single
 * controlled pharmacy node (the ring = the point of control). Reads as a
 * managed distribution network — exactly what AnPharmacy does. Ownable,
 * distinctive, scales cleanly 16px → 96px and holds up in mono.
 */
export function AnPharmacyIcon({
  className,
  style,
  mono = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  mono?: boolean;
}) {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `anGrad${uid}`;
  const hub = (
    <>
      <path d="M30,30 L50,72" />
      <path d="M70,30 L50,72" />
      <circle cx="30" cy="30" r="9" />
      <circle cx="70" cy="30" r="9" />
      <circle cx="50" cy="72" r="13" fill="none" strokeWidth="8" />
      <circle cx="50" cy="72" r="5" />
    </>
  );

  if (mono) {
    return (
      <svg viewBox="0 0 100 100" className={cn('block', className)} style={style} aria-hidden="true">
        <g fill="currentColor" stroke="currentColor" strokeWidth="8" strokeLinecap="round">
          {hub}
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={cn('block', className)} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="24" y1="28" x2="76" y2="74">
          <stop offset="0%" stopColor="#990066" />
          <stop offset="50%" stopColor="#D4148C" />
          <stop offset="100%" stopColor="#FF5A8D" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`} stroke={`url(#${gradId})`} strokeWidth="8" strokeLinecap="round">
        {hub}
      </g>
    </svg>
  );
}

/** Alias kept for existing call sites. */
export const LogoMark = AnPharmacyIcon;

/**
 * EMBLEM — the icon as a contained, badge-style glyph (Instagram/Flipkart move):
 * a gradient squircle holding a white Distribution Hub. This is the standalone
 * app icon / favicon and the left half of the combination mark. Reads instantly
 * at 32px because the shape (tile) carries the brand, not just the strokes.
 */
export function Emblem({
  className,
  style,
  mono = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  mono?: boolean;
}) {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `emGrad${uid}`;
  const hub = (
    <>
      <path d="M30,30 L50,72" />
      <path d="M70,30 L50,72" />
      <circle cx="30" cy="30" r="9" />
      <circle cx="70" cy="30" r="9" />
      <circle cx="50" cy="72" r="13" fill="none" strokeWidth="8" />
      <circle cx="50" cy="72" r="5" />
    </>
  );

  if (mono) {
    return (
      <svg viewBox="0 0 100 100" className={cn('block', className)} style={style} aria-hidden="true">
        <rect x="8" y="8" width="84" height="84" rx="22" fill="currentColor" />
        <g fill="#ffffff" stroke="#ffffff" strokeWidth="8" strokeLinecap="round">{hub}</g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={cn('block', className)} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="20" y1="14" x2="82" y2="88">
          <stop offset="0%" stopColor="#990066" />
          <stop offset="52%" stopColor="#D4148C" />
          <stop offset="100%" stopColor="#FF5A8D" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="84" height="84" rx="22" fill={`url(#${gradId})`} />
      <g fill="#ffffff" stroke="#ffffff" strokeWidth="8" strokeLinecap="round">{hub}</g>
    </svg>
  );
}

/**
 * LETTERMARK (monogram) — the initial "A" (An) drawn in capsule strokes, with
 * the crossbar itself a medicine pill. A typographic mark for compact/avatars
 * where the full wordmark or emblem would be too small to read.
 */
export function Lettermark({
  className,
  style,
  mono = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  mono?: boolean;
}) {
  const uid = React.useId().replace(/:/g, '');
  const gradId = `lmGrad${uid}`;
  const A = (
    <>
      <path d="M50,16 L26,84" />
      <path d="M50,16 L74,84" />
      <path d="M36,56 L64,56" />
    </>
  );

  if (mono) {
    return (
      <svg viewBox="0 0 100 100" className={cn('block', className)} style={style} aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">{A}</g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={cn('block', className)} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="26" y1="16" x2="74" y2="84">
          <stop offset="0%" stopColor="#990066" />
          <stop offset="52%" stopColor="#D4148C" />
          <stop offset="100%" stopColor="#FF5A8D" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gradId})`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">{A}</g>
    </svg>
  );
}

/**
 * Transparent icon wrapper — renders the "an" mark with no box behind it.
 * Size is fully controlled by the caller via className / markClassName.
 */
export function BrandTile({
  className,
  markClassName,
  markStyle,
  style,
  mono = false,
}: {
  className?: string; // wrapper sizing (e.g. w-10 h-10)
  markClassName?: string; // icon sizing (e.g. w-6 h-6)
  markStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  mono?: boolean;
}) {
  return (
    <span className={cn('relative inline-flex flex-shrink-0 items-center justify-center', className)} style={style}>
      <AnPharmacyIcon className={cn('block', markClassName)} style={markStyle} mono={mono} />
    </span>
  );
}

/**
 * BRAND WORDMARK — "AnPharmacy", pure typography (no icon/emblem/monogram).
 * Split two-tone: "An" in the brand gradient (bold), "Pharmacy" in ink (medium).
 * Weights kept at 600–700 so the word stays legible at app-header sizes.
 */
const BRAND_GRAD = 'linear-gradient(95deg,#990066 0%,#D4148C 52%,#FF5A8D 100%)';
const WORDMARK_FONT = "'Plus Jakarta Sans','Space Grotesk', system-ui, sans-serif";

export function Wordmark({
  white = false,
  mono = false,
  fontSize = 'text-xl',
  className,
}: {
  white?: boolean;
  mono?: boolean;
  fontSize?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'leading-tight tracking-[-0.015em] whitespace-nowrap',
        fontSize,
        className
      )}
      style={{ fontFamily: WORDMARK_FONT }}
    >
      <span
        style={{
          fontWeight: 700,
          ...(mono
            ? { color: 'currentColor' }
            : white
              ? { color: '#FFFFFF' }
              : { backgroundImage: BRAND_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }),
        }}
      >
        An
      </span>
      <span style={{ fontWeight: 600, color: white ? '#FFFFFF' : 'currentColor' }}>Pharmacy</span>
    </span>
  );
}

/**
 * Full logo lockup — the AnPharmacy wordmark (+ optional tagline).
 * Defaults to a PURE WORDMARK (no icon). `emblem` can re-add the combination
 * mark for app-chrome contexts (title bar, splash) only.
 */
export function AnPharmacyLogo({
  className,
  size = 'md',
  variant = 'default',
  layout = 'horizontal',
  emblem = false,
}: LogoProps & { layout?: 'horizontal' | 'stacked'; emblem?: boolean }) {
  const s = sizeMap[size];
  const white = variant === 'white';
  const mono = variant === 'mono';
  const stacked = layout === 'stacked';

  const iconEl = emblem && (
    <Emblem style={{ width: s.box, height: s.box }} mono={mono} />
  );

  const textEl = variant !== 'compact' && (
    <div className={cn('flex flex-col', stacked && 'items-center')}>
      <Wordmark white={white} mono={mono} fontSize={s.fontSize} />
      <span
        className={cn(
          s.tagline,
          'leading-tight tracking-[0.18em] uppercase font-medium font-body',
          white ? 'text-pink-200/70' : mono ? 'text-slate-500' : 'text-slate-400 dark:text-slate-500'
        )}
      >
        Intelligent Pharmacy Management
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        'flex items-center',
        stacked ? 'flex-col gap-3' : 'gap-3',
        white ? 'text-white' : mono ? 'text-slate-900' : 'text-slate-900 dark:text-white',
        className
      )}
    >
      {iconEl}
      {textEl}
    </div>
  );
}

/** Alias kept for existing call sites. */
export default function Logo(props: LogoProps) {
  return <AnPharmacyLogo {...props} />;
}

/* Animated variant for splash/loading screens */
export function AnimatedLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-[110%] h-[110%] rounded-full border border-slate-400/15 animate-spin-slow" />
        <div
          className="absolute w-[90%] h-[90%] rounded-full animate-spin-slow"
          style={{
            animationDirection: 'reverse',
            animationDuration: '4s',
            border: '1px solid rgba(217,70,239,0.18)',
          }}
        />
        <div className="absolute w-[70%] h-[70%] rounded-full border border-slate-300/8 animate-spin-slow" style={{ animationDuration: '6s' }} />
        <div className="absolute w-[60%] h-[60%] rounded-full bg-fuchsia-500/5 animate-pulse-ring" />
      </div>

      {/* Main mark */}
      <div className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-[#0A0F1E] via-[#0E1728] to-[#101E38] flex items-center justify-center shadow-2xl shadow-slate-900/40 border border-white/15 overflow-hidden">
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
        <AnPharmacyIcon
          className="w-[68%] h-[68%] relative z-10"
          style={{ opacity: 0.95 }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-glass-shine opacity-60 pointer-events-none"
          style={{ backgroundSize: '200% 100%', animationDuration: '2.5s' }}
        />
      </div>
    </div>
  );
}
