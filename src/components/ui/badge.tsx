import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-slate-900 text-white border-transparent dark:bg-slate-700 dark:text-white',
        secondary:
          'bg-slate-100 text-slate-600 border-transparent dark:bg-slate-800 dark:text-slate-300',
        destructive:
          'bg-rose-50 text-rose-600 border-transparent dark:bg-rose-950/30 dark:text-rose-400',
        outline:
          'border-border text-foreground bg-transparent',
        success:
          'bg-emerald-50 text-emerald-700 border-transparent dark:bg-emerald-950/30 dark:text-emerald-300',
        warning:
          'bg-amber-50 text-amber-700 border-transparent dark:bg-amber-950/30 dark:text-amber-300',
        info:
          'bg-sky-50 text-sky-700 border-transparent dark:bg-sky-950/30 dark:text-sky-300',
        subtle:
          'bg-transparent text-foreground border-border hover:bg-muted',

        'outline-teal':
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:text-emerald-400 font-medium',
        expired:
          'bg-slate-500/15 text-slate-600 border-transparent dark:text-slate-400 font-medium',
        critical:
          'bg-rose-50 text-rose-600 border-transparent dark:bg-rose-950/30 dark:text-rose-400 font-semibold',
        safe:
          'bg-emerald-50 text-emerald-700 border-transparent dark:bg-emerald-950/30 dark:text-emerald-300 font-semibold',
        glass:
          'glass-enterprise text-foreground',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-[11px]',
        default: 'px-2.5 py-0.5 text-[11px]',
        md: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
