import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-[13px] font-medium transition-all duration-150 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md',
        secondary:
          'bg-slate-100 text-slate-700 hover:bg-slate-200',
        destructive:
          'bg-rose-500 text-white hover:bg-rose-600 shadow-sm hover:shadow-rose-500/20',
        outline:
          'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
        ghost:
          'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        link:
          'text-primary underline-offset-4 hover:underline',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-emerald-500/20',
        warning:
          'bg-amber-500 text-white hover:bg-amber-600 shadow-sm hover:shadow-amber-500/20',
        'premium-glow':
          'bg-navy-900 text-white shadow-md shadow-emerald-500/15 hover:shadow-lg hover:shadow-emerald-500/20',
        'premium-outline':
          'border-2 border-slate-200 bg-transparent hover:border-slate-400 hover:bg-slate-50',

        'primary':
          'bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow-md',
        'outline-teal':
          'border-2 border-emerald-200 bg-card text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800/40 dark:text-emerald-400 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-700/50 shadow-sm',
      },
      size: {
        xs: 'h-8 px-2.5 text-xs',
        sm: 'h-9 px-3 text-[13px]',
        default: 'h-10 px-4 text-[13px]',
        lg: 'h-11 px-6 text-sm',
        xl: 'h-12 px-8 text-sm',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
