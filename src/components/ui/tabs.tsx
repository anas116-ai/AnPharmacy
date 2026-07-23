import { createContext, useContext, type ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';

type TabsVariant = 'default' | 'underline';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue>({
  value: '',
  onValueChange: () => {},
  variant: 'default',
});

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  variant?: TabsVariant;
}

export function Tabs({ value, onValueChange, children, className, variant = 'default' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange, variant }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex p-1 rounded-xl bg-muted border border-border/50',
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange, variant } = useContext(TabsContext);
  const isActive = selectedValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && [
          isActive
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
        ],
        variant === 'underline' && [
          isActive
            ? 'text-foreground border-b-2 border-primary rounded-t-lg'
            : 'text-muted-foreground hover:text-foreground',
        ],
        className
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selectedValue } = useContext(TabsContext);

  if (selectedValue !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn('animate-fade-in mt-4', className)}
    >
      {children}
    </div>
  );
}
