import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-accent-primary text-white hover:bg-blue-600 focus-visible:ring-accent-primary',
        secondary:
          'bg-accent-secondary text-white hover:bg-purple-600 focus-visible:ring-accent-secondary',
        success:
          'bg-accent-success text-white hover:bg-green-600 focus-visible:ring-accent-success',
        danger:
          'bg-accent-danger text-white hover:bg-red-600 focus-visible:ring-accent-danger',
        outline:
          'border border-border-primary bg-transparent hover:bg-background-elevated focus-visible:ring-accent-primary text-text-primary',
        ghost:
          'hover:bg-background-elevated focus-visible:ring-accent-primary text-text-primary',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
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
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
