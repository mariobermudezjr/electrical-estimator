import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-lg border border-border-primary bg-background-elevated px-3 py-2 text-sm text-text-primary',
          'focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          'cursor-pointer',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

export { Select };
