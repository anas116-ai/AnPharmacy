import { useState, useRef, useEffect, Children, isValidElement, cloneElement, type ReactNode, type ReactElement } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Select({ value, onValueChange, children, placeholder, className, disabled, label, id }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedChild = Children.toArray(children)
    .find((child): child is ReactElement<SelectItemProps> =>
      isValidElement(child) && (child.props as any).value === value
    );

  const selectedLabel = selectedChild ? (selectedChild.props as any).children : null;
  const displayValue = selectedLabel || placeholder || 'Select...';

  return (
    <div id={id} ref={ref} className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'input-field flex h-10 w-full cursor-pointer items-center justify-between px-4 py-2.5 text-sm',
          'transition-all duration-200',
          'hover:border-foreground/20',
          'focus:ring-2 focus:ring-ring/30 focus:border-ring',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
          !value && 'text-muted-foreground',
          value && 'text-foreground font-medium'
        )}
      >
        <span className="truncate text-left">{displayValue}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-2 w-full rounded-xl surface-glass-elevated overflow-hidden',
            'shadow-2xl',
            'animate-slide-in-up',
            'origin-top'
          )}
        >
          <div className="p-1.5 space-y-0.5">
            {Children.map(children, child => {
              if (isValidElement(child) && child.type === SelectItem) {
                return cloneElement(child, {
                  ...(child.props as any),
                  onSelect: (val: string) => {
                    onValueChange(val);
                    setIsOpen(false);
                  },
                  isSelected: (child.props as any).value === value,
                } as any);
              }
              return child;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  onSelect?: (value: string) => void;
  isSelected?: boolean;
}

export function SelectItem({ value, children, onSelect, isSelected }: SelectItemProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect?.(value)}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm',
        'outline-none transition-all duration-150',
        'text-foreground',
        'hover:bg-secondary hover:text-secondary-foreground',
        isSelected && 'bg-secondary text-secondary-foreground font-medium'
      )}
    >
      <span className="flex-1 text-left">{children}</span>
      {isSelected && <Check className="ml-2 h-4 w-4 shrink-0 text-accent" />}
    </button>
  );
}
