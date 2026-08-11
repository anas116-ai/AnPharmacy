import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border-transparent',
        secondary:
          'bg-muted text-muted-foreground border-transparent',
        destructive:
          'bg-destructive/10 text-destructive border-transparent',
        outline:
          'border-border text-foreground bg-transparent',
        success:
          'bg-success-light text-success border-transparent',
        warning:
          'bg-warning-light text-warning border-transparent',
        info:
          'bg-info-light text-info border-transparent',
        subtle:
          'bg-transparent text-foreground border-border hover:bg-muted',

        'outline-teal':
          'border-accent/30 bg-accent-light text-accent dark:border-accent/30 dark:bg-accent/10 dark:text-accent font-medium',
        expired:
          'bg-muted text-muted-foreground border-transparent',
        critical:
          'bg-destructive/10 text-destructive border-transparent font-semibold',
        safe:
          'bg-success-light text-success border-transparent font-semibold',
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
