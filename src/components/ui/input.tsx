import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isError?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type, icon, rightIcon, isError, label, error, helperText, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = React.useState(false);

    const EffectiveRightIcon = isPassword
      ? showPassword
        ? EyeOff
        : Eye
      : undefined;

    const handleRightIconClick = () => {
      if (isPassword) {
        setShowPassword(!showPassword);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            aria-invalid={isError ? true : undefined}
            aria-describedby={errorId || helperId}
            className={cn(
              'input-field flex h-10 w-full rounded-lg px-4 py-2 text-[13px] text-foreground',
              'border-border',
              'transition-all duration-150',
              'hover:border-foreground/20',
              'focus:ring-2 focus:ring-ring/30 focus:border-ring',
              'placeholder:text-muted-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
              isError && 'border-destructive ring-1 ring-destructive/20 focus:ring-destructive focus:border-destructive',
              icon && 'pl-11',
              (rightIcon || EffectiveRightIcon) && 'pr-11',
              'file:mr-4 file:py-2 file:px-4',
              className
            )}
            ref={ref}
            {...props}
          />
          {(rightIcon || EffectiveRightIcon) && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleRightIconClick}
              className={cn(
                'absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground',
                'transition-colors duration-200',
                !isPassword && 'pointer-events-none'
              )}
              aria-label={isPassword ? (showPassword ? 'Hide password' : 'Show password') : undefined}
            >
              {rightIcon || (EffectiveRightIcon && <EffectiveRightIcon className="h-4 w-4" />)}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-[13px] text-destructive">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-[13px] text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
