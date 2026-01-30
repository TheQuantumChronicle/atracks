import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'white';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider',
        {
          'bg-white/[0.05] text-text-secondary border border-white/[0.05]': variant === 'default',
          'bg-transparent text-text-muted border border-white/[0.1]': variant === 'outline',
          'bg-white text-black': variant === 'white',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  return (
    <Badge variant={tier === 'Unverified' ? 'outline' : 'white'}>
      {tier}
    </Badge>
  );
}
