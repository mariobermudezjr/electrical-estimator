import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-border-primary bg-background-elevated px-3 py-2 text-sm text-text-primary',
          'placeholder:text-text-tertiary',
          'focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          'resize-y',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
