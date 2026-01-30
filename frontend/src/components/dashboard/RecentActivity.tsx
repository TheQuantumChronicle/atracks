import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getTimeAgo } from '@/lib/utils';
import { TrendingUp, TrendingDown, Shield, Award, Zap } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'trade' | 'proof' | 'verification' | 'badge';
  agent_name: string;
  description: string;
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

interface RecentActivityProps {
  items: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ items, loading }: RecentActivityProps) {
  const getIcon = (type: string, metadata?: Record<string, string | number | boolean>) => {
    const iconClass = "w-4 h-4 text-white/60";
    switch (type) {
      case 'trade':
        return metadata?.positive ? (
          <TrendingUp className={iconClass} />
        ) : (
          <TrendingDown className={iconClass} />
        );
      case 'proof':
        return <Shield className={iconClass} />;
      case 'verification':
        return <Zap className={iconClass} />;
      case 'badge':
        return <Award className={iconClass} />;
      default:
        return <Zap className={iconClass} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-[0.2em] text-text-secondary">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-text-muted text-center py-8 text-[10px] uppercase tracking-widest italic">No activity logs</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                  {getIcon(item.type, item.metadata)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-light truncate uppercase tracking-tight">{item.description}</p>
                  <p className="text-[9px] text-text-muted uppercase tracking-widest font-medium mt-0.5">{item.agent_name}</p>
                </div>
                <span className="text-[9px] text-text-muted uppercase tracking-tighter whitespace-nowrap font-medium">{getTimeAgo(item.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
