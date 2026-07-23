import { useState, useEffect, useRef, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const [mounted, setMounted] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.textContent = `
        @keyframes dialogEnter {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes dialogExit {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.98); }
        }
      `;
      document.head.appendChild(styleRef.current);
    }

    if (open) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      const timer = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/30 dark:bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl'
        )}
        style={{
          animation: open
            ? 'dialogEnter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'dialogExit 150ms ease-out forwards',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('px-6 py-4 text-sm', className)} {...props}>
        {children}
      </div>
    );
  }
);

interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div className={cn('px-6 pt-6 pb-4 flex items-start justify-between gap-4', className)} {...props} />
  );
}

interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <h2 className={cn('text-xl font-semibold tracking-tight', className)} {...props} />
  );
}

interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-1', className)} {...props} />
  );
}

interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 px-6 pb-6 pt-4 border-t border-border/50', className)} {...props} />
  );
}

interface DialogCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export function DialogClose({ className, onClick, ...props }: DialogCloseProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
      {...props}
    >
      <X className="w-4 h-4" />
    </button>
  );
}

export { DialogContent };
