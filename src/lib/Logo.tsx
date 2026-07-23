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

export default function Logo({ className, size = 'md', variant = 'default' }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Premium Logo Mark — 3D Geometric Rx + Neural Circuit */}
      <div 
        className={cn(
          'relative flex-shrink-0 rounded-2xl flex items-center justify-center overflow-hidden',
          'transition-all duration-300',
          variant === 'white'
            ? 'bg-white/10 border border-white/20'
            : 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/25'
        )}
        style={{ width: s.box, height: s.box }}
      >
        {/* Animated gradient shine overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-glass-shine opacity-70 pointer-events-none"
          style={{ backgroundSize: '200% 100%' }}
        />
        
        {/* Inner glow ring */}
        <div className="absolute inset-[3px] rounded-[10px] border border-white/10 pointer-events-none" />
        
        {/* Outer ring glow */}
        <div className={cn(
          'absolute -inset-1 rounded-[14px] opacity-30 blur-sm pointer-events-none',
          variant === 'white' ? 'bg-white/10' : 'bg-emerald-400/30 animate-pulse-soft'
        )} />
        
        {/* Circuit grid */}
        <svg 
          className="absolute inset-0 opacity-15 text-white"
          width="100%" height="100%"
          viewBox="0 0 44 44"
        >
          <defs>
            <pattern id={`grid-${size}`} x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M 7 0 L 0 0 0 7" fill="none" stroke="currentColor" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="44" height="44" fill={`url(#grid-${size})`} />
          <circle cx="6" cy="38" r="0.8" fill="currentColor" opacity="0.4" />
          <circle cx="38" cy="6" r="0.8" fill="currentColor" opacity="0.4" />
          <circle cx="3" cy="6" r="0.5" fill="currentColor" opacity="0.3" />
          <circle cx="41" cy="38" r="0.5" fill="currentColor" opacity="0.3" />
        </svg>

        {/* Main Geometric Rx mark */}
        <svg 
          viewBox="0 0 44 44" 
          className="text-white relative z-10"
          style={{ width: s.icon, height: s.icon }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Hexagonal frame — pharmaceutical precision */}
          <polygon 
            points="22,3 39,12 39,32 22,41 5,32 5,12" 
            strokeWidth="1.2" 
            opacity="0.2" 
          />
          
          {/* Rx letterform — prescription symbol */}
          <path d="M13 14 L13 32 M13 14 L24 14 Q28 14 28 18 Q28 22 24 22 L13 22" 
            strokeWidth="2" opacity="0.95" />
          <line x1="19" y1="22" x2="26" y2="32" strokeWidth="2" opacity="0.95" />
          
          {/* x — circuit junction styling */}
          <line x1="30" y1="16" x2="38" y2="28" strokeWidth="1.8" opacity="0.85" />
          <line x1="38" y1="16" x2="30" y2="28" strokeWidth="1.8" opacity="0.85" />
          
          {/* AI circuit accent dots */}
          <circle cx="8" cy="10" r="1.8" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="36" cy="10" r="1.8" fill="currentColor" stroke="none" opacity="0.7" />
          
          {/* Neural circuit path */}
          <path d="M10 10 Q16 4 22 3 Q28 4 34 10" strokeWidth="0.8" opacity="0.35" fill="none" strokeDasharray="1.5 1.5" />
          
          {/* Center active node */}
          <circle cx="22" cy="32" r="2.2" fill="currentColor" stroke="none" opacity="0.8" />
          <circle cx="22" cy="32" r="4.5" fill="currentColor" stroke="none" opacity="0.15" />
          
          {/* Molecular dots */}
          <circle cx="14" cy="36" r="1.2" fill="currentColor" stroke="none" opacity="0.5" />
          <circle cx="30" cy="36" r="1.2" fill="currentColor" stroke="none" opacity="0.5" />
        </svg>

        {/* Bottom accent glow line */}
        <div className="absolute bottom-[3px] left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full" />
      </div>

      {/* Text — Premium typography */}
      {variant !== 'compact' && (
        <div className="flex flex-col">
          <span className={cn(
            'font-heading font-bold leading-tight tracking-tight',
            variant === 'white' ? 'text-white' : 'text-slate-900 dark:text-white',
            s.fontSize
          )}>
            AnPharmacy
          </span>
          <span className={cn(
            'text-[10px] leading-tight tracking-wider font-medium font-body',
            variant === 'white' ? 'text-emerald-300/60' : 'text-slate-400 dark:text-slate-500'
          )}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="inline-block w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <polygon points="5,1 9,4 9,8 5,9 1,8 1,4" opacity="0.5" />
                <circle cx="5" cy="5" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
              </svg>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Intelligent Pharmacy</span>
            </span>
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
        <div className="absolute w-[110%] h-[110%] rounded-full border border-emerald-400/15 animate-spin-slow" />
        <div className="absolute w-[90%] h-[90%] rounded-full border border-teal-300/10 animate-spin-slow" 
          style={{ animationDirection: 'reverse', animationDuration: '4s' }} 
        />
        <div className="absolute w-[70%] h-[70%] rounded-full border border-emerald-200/8 animate-spin-slow" 
          style={{ animationDuration: '6s' }} 
        />
        {/* Hexagon ring */}
        <div className="absolute w-full h-full animate-spin-slow" style={{ animationDuration: '10s' }}>
          <svg className="w-full h-full opacity-20 text-emerald-300" viewBox="0 0 100 100" fill="none" stroke="currentColor">
            <polygon points="50,5 88,25 88,75 50,95 12,75 12,25" strokeWidth="0.4" />
          </svg>
        </div>
        {/* Pulse ring */}
        <div className="absolute w-[60%] h-[60%] rounded-full bg-emerald-500/5 animate-pulse-ring" />
      </div>
      
      {/* Main icon */}
      <div className="relative w-36 h-36 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-500/30 border border-white/15 overflow-hidden">
        {/* Animated gradient shine */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-glass-shine opacity-80 pointer-events-none"
          style={{ backgroundSize: '200% 100%' }}
        />
        
        {/* Circuit grid */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 80 80">
            <defs>
              <pattern id="grid-anim" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.25" />
              </pattern>
            </defs>
            <rect width="80" height="80" fill="url(#grid-anim)" />
          </svg>
        </div>
        
        {/* Inner glow ring */}
        <div className="absolute inset-[4px] rounded-[20px] border border-white/10 pointer-events-none" />
        
        {/* Glass shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 pointer-events-none" />
        
        {/* Rx mark */}
        <svg viewBox="0 0 60 60" className="w-[62%] h-[62%] text-white relative z-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* Hexagon frame */}
          <polygon points="30,3 53,14 53,46 30,57 7,46 7,14" strokeWidth="1" opacity="0.15" />
          
          {/* R */}
          <path d="M16 18 L16 42 M16 18 L30 18 Q35 18 35 23 Q35 28 30 28 L16 28" strokeWidth="2.5" opacity="0.95" />
          <line x1="24" y1="28" x2="34" y2="42" strokeWidth="2.5" opacity="0.95" />
          
          {/* x */}
          <line x1="40" y1="22" x2="50" y2="36" strokeWidth="2.2" opacity="0.85" />
          <line x1="50" y1="22" x2="40" y2="36" strokeWidth="2.2" opacity="0.85" />
          
          {/* Circuit dots */}
          <circle cx="10" cy="14" r="2.5" fill="currentColor" stroke="none" opacity="0.7" />
          <circle cx="50" cy="14" r="2.5" fill="currentColor" stroke="none" opacity="0.7" />
          
          {/* Neural circuit path */}
          <path d="M13 14 Q22 5 30 4 Q38 5 47 14" strokeWidth="0.8" opacity="0.3" strokeDasharray="2 2" />
          
          {/* Center pulse node */}
          <circle cx="30" cy="42" r="3" fill="currentColor" stroke="none" opacity="0.8" />
          <circle cx="30" cy="42" r="6" fill="currentColor" stroke="none" opacity="0.12" />
        </svg>
        
        {/* Animated glass shine sweep */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-glass-shine opacity-60 pointer-events-none"
          style={{ backgroundSize: '200% 100%', animationDuration: '2.5s' }}
        />
      </div>
    </div>
  );
}
