import React from 'react';
import { cn } from './utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'compact' | 'mono';
}

const sizeMap = {
  sm: { box: 36, icon: 28, fontSize: 'text-[19px]', tagline: 'text-[7.5px]' },
  md: { box: 44, icon: 34, fontSize: 'text-[23px]', tagline: 'text-[8.5px]' },
  lg: { box: 60, icon: 46, fontSize: 'text-[30px]', tagline: 'text-[9.5px]' },
  xl: { box: 88, icon: 66, fontSize: 'text-[42px]', tagline: 'text-[11px]' },
};

/**
 * AnPharmacy Brand Icon — The Official Concept #44
 *
 * Vector Architecture:
 * - Outer continuous circular arc sweeping from 40° counter-clockwise to 235°.
 * - Seamlessly transitions into a sculpted botanical leaf underline with an inner vein.
 * - Inside: Typographic AP monogram with modern chevron crossbar.
 * - Colors: the mint-teal brand palette — deep teal #123F3D → teal #17827A
 *   → mint #3FA79B, on a deep-teal tile (#123035 → #0F262B → #0C1D21).
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
  const brandGradId = `brandGrad${uid}`;
  const leafGradId = `leafGrad${uid}`;

  if (mono) {
    return (
      <svg viewBox="0 0 320 320" className={cn('block shrink-0', className)} style={style} aria-hidden="true">
        <g transform="translate(160, 145)">
          <path
            d="M 60 -60 A 88 88 0 1 0 -72 50 C -64 72 -35 96 25 96 C 68 96 100 78 110 66 C 75 74 38 65 -10 45 C -45 32 -68 36 -72 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -70 50 C -45 82 15 96 110 66 C 68 70 25 60 -18 40 C -48 26 -66 36 -70 50 Z"
            fill="currentColor"
          />
          <g transform="translate(-12, -8)">
            <path d="M -36 28 L -10 -40 L 16 28" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M -22 6 L -10 -5 L 6 6" fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 22 28 L 22 -40 L 48 -40 C 66 -40 78 -29 78 -14 C 78 2 66 12 48 12 L 22 12" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 320" className={cn('block shrink-0', className)} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={brandGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#123F3D" />
          <stop offset="52%" stopColor="#17827A" />
          <stop offset="100%" stopColor="#3FA79B" />
        </linearGradient>
        <linearGradient id={leafGradId} x1="0%" y1="0%" x2="100%" y2="40%">
          <stop offset="0%" stopColor="#2E9C90" />
          <stop offset="55%" stopColor="#17827A" />
          <stop offset="100%" stopColor="#123F3D" />
        </linearGradient>
      </defs>

      <g transform="translate(160, 145)">
        {/* Continuous Outer Circle of #44 */}
        <path
          d="M 60 -60 A 88 88 0 1 0 -72 50 C -64 72 -35 96 25 96 C 68 96 100 78 110 66 C 75 74 38 65 -10 45 C -45 32 -68 36 -72 50"
          fill="none"
          stroke={`url(#${brandGradId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Sculpted Botanical Leaf Underline of #44 */}
        <path
          d="M -70 50 C -45 82 15 96 110 66 C 68 70 25 60 -18 40 C -48 26 -66 36 -70 50 Z"
          fill={`url(#${leafGradId})`}
        />

        {/* Leaf Vein */}
        <path
          d="M -58 52 Q 18 74 98 68"
          fill="none"
          stroke="#0C1D21"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Monogram AP inside the circle */}
        <g transform="translate(-12, -8)">
          {/* A */}
          <path
            d="M -36 28 L -10 -40 L 16 28"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Chevron Crossbar */}
          <path
            d="M -22 6 L -10 -5 L 6 6"
            fill="none"
            stroke="#2E9C90"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* P */}
          <path
            d="M 22 28 L 22 -40 L 48 -40 C 66 -40 78 -29 78 -14 C 78 2 66 12 48 12 L 22 12"
            fill="none"
            stroke={`url(#${brandGradId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}

/** Alias for existing call sites */
export const LogoMark = AnPharmacyIcon;

/**
 * EMBLEM — Luxury App Icon / Badge (Enclosed in a deep obsidian/sapphire tile)
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
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#123035] via-[#0F262B] to-[#0C1D21] border border-white/15 shadow-md p-1.5 shrink-0 overflow-hidden',
        className
      )}
      style={style}
    >
      <div className="absolute inset-0 bg-[#17827A]/[0.10] pointer-events-none rounded-2xl" />
      <AnPharmacyIcon className="w-full h-full" mono={mono} />
    </div>
  );
}

/** Alias */
export const Lettermark = AnPharmacyIcon;

/**
 * Transparent Icon Tile Wrapper
 */
export function BrandTile({
  className,
  markClassName,
  markStyle,
  style,
  mono = false,
}: {
  className?: string;
  markClassName?: string;
  markStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  mono?: boolean;
}) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={style}>
      <Emblem className={cn('w-full h-full block', markClassName)} style={markStyle} mono={mono} />
    </span>
  );
}

/**
 * BRAND WORDMARK — "AnPharmacy"
 */
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
        'leading-tight tracking-[-0.02em] whitespace-nowrap inline-flex items-baseline font-sans',
        fontSize,
        className
      )}
      style={{ fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif" }}
    >
      <span
        style={{
          fontWeight: 800,
          color: mono
            ? 'currentColor'
            : white
              ? '#5FC9BB'
              : '#123F3D',
        }}
      >
        An
      </span>
      <span
        style={{
          fontWeight: 700,
          color: white ? '#FFFFFF' : mono ? 'currentColor' : '#14292E',
        }}
        className="dark:text-white"
      >
        Pharmacy
      </span>
    </span>
  );
}

/**
 * Complete AnPharmacy Logo Lockup
 */
export function AnPharmacyLogo({
  className,
  size = 'md',
  variant = 'default',
  layout = 'horizontal',
  emblem = true,
}: LogoProps & { layout?: 'horizontal' | 'stacked'; emblem?: boolean }) {
  const s = sizeMap[size];
  const white = variant === 'white';
  const mono = variant === 'mono';
  const stacked = layout === 'stacked';

  const iconEl = emblem && (
    <Emblem style={{ width: s.box, height: s.box }} mono={mono} />
  );

  const textEl = variant !== 'compact' && (
    <div className={cn('flex flex-col justify-center', stacked && 'items-center text-center')}>
      <Wordmark white={white} mono={mono} fontSize={s.fontSize} />
      <span
        className={cn(
          s.tagline,
          'font-semibold uppercase tracking-[0.14em] leading-tight mt-0.5',
          white ? 'text-[#5FC9BB]/90' : 'text-slate-600'
        )}
      >
        Intelligent Pharmacy Distribution Management
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 select-none',
        stacked ? 'flex-col' : 'flex-row',
        className
      )}
    >
      {iconEl}
      {textEl}
    </div>
  );
}

/**
 * ANIMATED LOGO — for Splash Screen & Hero Accents
 */
export function AnimatedLogo({
  size = 'lg',
  className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <div className="absolute inset-0 bg-[#17827A]/25 blur-2xl rounded-full animate-pulse" />
      <AnPharmacyLogo size={size} variant="white" layout="stacked" />
    </div>
  );
}

export default AnPharmacyLogo;
