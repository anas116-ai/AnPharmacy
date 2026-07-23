import * as React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'premium' | 'bordered' | 'ghost';
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClass = variant === 'premium'
    ? 'card-elevated'
    : variant === 'bordered'
      ? 'border bg-card'
      : variant === 'ghost'
        ? 'border-0 bg-transparent'
        : 'card-base';
  return (
    <div ref={ref} className={cn(variantClass, className)} {...props} />
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    divider?: boolean;
  }
>(({ className, divider, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'p-5 pb-4',
      divider && 'border-b border-border/50',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    src?: string;
    alt?: string;
  }
>(({ className, src, alt, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative overflow-hidden rounded-t-[var(--radius)]', className)}
    {...props}
  >
    {src && (
      <img
        src={src}
        alt={alt}
        className="h-48 w-full object-cover"
      />
    )}
    {props.children}
  </div>
));
CardMedia.displayName = 'CardMedia';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-end p-5 pt-0', className)}
    {...props}
  />
));
CardAction.displayName = 'CardAction';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    borderTop?: boolean;
  }
>(({ className, borderTop, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-5 pt-0',
      borderTop && 'mt-auto border-t border-border/50 pt-4',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardMedia, CardTitle, CardDescription, CardContent, CardAction, CardFooter };
