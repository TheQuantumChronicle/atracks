import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { atracksApi, LeaderboardEntry } from '@/lib/api';
import { Trophy, Star, Award } from 'lucide-react';

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await atracksApi.getLeaderboard();
        setLeaderboard(res.data || []);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  // Get rating display with unique visual indicators
  const getStarDisplay = (starRating: number, ratingDisplay: string) => {
    if (starRating === 3) return <span className="text-amber-400 text-sm font-bold tracking-tight">◆◆◆</span>;
    if (starRating === 2) return <span className="text-amber-400 text-sm font-bold tracking-tight">◆◆</span>;
    if (starRating === 1) return <span className="text-amber-400 text-sm font-bold tracking-tight">◆</span>;
    if (ratingDisplay === '✓') return <span className="text-emerald-400 text-sm font-bold">✓</span>;
    return <span className="text-text-muted text-xs">—</span>;
  };

  return (
    <div className="relative z-10 min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Award className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-light text-white">ATRACKS Ratings</h1>
        </div>
        <p className="text-text-muted text-sm">Verified agent trust rankings</p>
      </div>

      {/* Rating Legend */}
      <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3 font-semibold">Trust Tiers</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">◆◆◆</span>
            <span className="text-text-muted">Exceptional</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">◆◆</span>
            <span className="text-text-muted">Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">◆</span>
            <span className="text-text-muted">Very Good</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span className="text-text-muted">Verified</span>
          </div>
        </div>
      </div>

      {/* Rankings */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-white font-medium mb-2">No rankings yet</h3>
          <p className="text-text-muted text-sm">Verify agent reputation to appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.agent_id}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                index === 0
                  ? 'bg-white/[0.05] border-white/20'
                  : 'bg-white/[0.02] border-white/[0.05]'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                index === 0 ? 'bg-accent text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/[0.05] text-text-muted'
              }`}>
                {index === 0 ? (
                  <Trophy className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold tracking-tighter">
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white font-light group-hover:border-accent/30 transition-colors">
                {entry.agent_name.charAt(0).toUpperCase()}
              </div>

              {/* Name & Stats */}
              <div className="flex-1 min-w-0">
                <Link to={`/agents/${entry.agent_id}`} className="text-white font-medium truncate uppercase tracking-tight text-sm hover:text-accent transition-colors block">
                  {entry.agent_name}
                </Link>
                <div className="flex items-center gap-3 text-text-muted text-[10px] uppercase tracking-widest">
                  <span>{entry.total_trades} trades</span>
                  <span>{entry.win_rate}% win</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex-shrink-0">
                {getStarDisplay(entry.star_rating, entry.rating_display)}
              </div>

              {/* Score */}
              <div className="text-right min-w-[60px]">
                <p className={`text-xl font-extralight ${
                  index === 0 ? 'text-accent shadow-accent' : 'text-white'
                }`}>
                  {entry.reputation_score}
                </p>
                <p className="text-text-muted text-[10px] uppercase tracking-widest font-medium">{entry.tier}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
