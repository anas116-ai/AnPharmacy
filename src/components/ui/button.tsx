import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-[13px] font-medium transition-all duration-140 ease-out rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-dark shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-md active:shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40 shadow-xs',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.18)]',
        outline:
          'border border-border/80 bg-card text-foreground hover:bg-muted/70 hover:border-border shadow-xs',
        ghost:
          'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto',
        success:
          'bg-success text-success-foreground hover:bg-success/90 shadow-xs',
        warning:
          'bg-warning text-warning-foreground hover:bg-warning/90 shadow-xs',
        'premium-glow':
          'bg-primary text-white shadow-sm hover:bg-primary-dark border border-primary/20',
        'premium-outline':
          'border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/60 text-foreground shadow-xs',
        primary:
          'bg-primary text-primary-foreground hover:bg-primary-dark shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.18)] hover:shadow-md active:shadow-xs',
        'outline-teal':
          'border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 shadow-xs',
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
