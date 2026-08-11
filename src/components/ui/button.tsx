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
          'bg-primary text-primary-foreground hover:bg-primary-dark shadow-sm hover:shadow-md',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline:
          'border border-border bg-card text-foreground hover:bg-muted',
        ghost:
          'text-muted-foreground hover:bg-muted hover:text-foreground',
        link:
          'text-primary underline-offset-4 hover:underline',
        success:
          'bg-success text-success-foreground hover:bg-success/90 shadow-sm',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm',
        'premium-glow':
          'bg-gradient-to-r from-accent to-emerald-700 text-white shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30',
        'premium-outline':
          'border-2 border-border bg-transparent hover:border-accent/50 hover:bg-muted',

        'primary':
          'bg-primary text-primary-foreground hover:bg-primary-dark shadow-sm hover:shadow-md',
        'outline-teal':
          'border-2 border-accent/30 bg-card text-accent hover:bg-accent-light hover:border-accent/50 shadow-sm',
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
