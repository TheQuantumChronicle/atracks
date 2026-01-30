import { Card } from '@/components/ui';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  loading?: boolean;
}

export function StatsCard({ title, value, change, icon: Icon, loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-4 bg-bg-card-hover rounded w-24 mb-3"></div>
          <div className="h-8 bg-bg-card-hover rounded w-16 mb-2"></div>
          <div className="h-4 bg-bg-card-hover rounded w-32"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card hover className="group/card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-secondary text-[9px] uppercase tracking-[0.3em] font-bold opacity-70 group-hover/card:opacity-100 transition-opacity">{title}</p>
          <p className="text-4xl font-extralight text-white mt-3 tracking-tighter group-hover/card:scale-[1.02] origin-left transition-transform duration-500">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-4">
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-tight">
                {change >= 0 ? '+' : ''}{change}%
              </span>
              <span className="text-text-muted text-[10px] uppercase tracking-tighter font-light italic opacity-50">v/s last cycle</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center group-hover/card:border-accent/30 group-hover/card:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-500">
          <Icon className="w-5 h-5 text-white/30 group-hover/card:text-accent transition-colors duration-500" />
        </div>
      </div>
    </Card>
  );
}
