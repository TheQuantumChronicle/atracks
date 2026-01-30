import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-black',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        {
          'bg-primary hover:bg-primary-dark text-black shadow-lg shadow-primary/20': variant === 'primary',
          'bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-white': variant === 'secondary',
          'bg-transparent hover:bg-white/[0.05] text-text-muted hover:text-white': variant === 'ghost',
          'bg-danger/80 hover:bg-danger text-white': variant === 'danger',
        },
        {
          'px-3 py-1.5 text-xs': size === 'sm',
          'px-4 py-2.5 text-sm': size === 'md',
          'px-6 py-3 text-sm': size === 'lg',
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
