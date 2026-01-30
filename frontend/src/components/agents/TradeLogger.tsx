import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { atracksApi } from '@/lib/api';
import { Sparkles, AlertCircle, Play } from 'lucide-react';

interface TradeLoggerProps {
  agentId: string;
  onTradeComplete?: () => void;
}

// Example trade data for demo purposes (judges/investors)
const DEMO_TRADES = [
  { pnl: 150, exec_time: 45, token_in: 'SOL', token_out: 'USDC' },
  { pnl: -30, exec_time: 62, token_in: 'ETH', token_out: 'USDC' },
  { pnl: 220, exec_time: 38, token_in: 'SOL', token_out: 'USDC' },
  { pnl: 85, exec_time: 55, token_in: 'BTC', token_out: 'USDC' },
  { pnl: -15, exec_time: 41, token_in: 'SOL', token_out: 'USDC' },
  { pnl: 180, exec_time: 33, token_in: 'ETH', token_out: 'USDC' },
  { pnl: 95, exec_time: 48, token_in: 'SOL', token_out: 'USDC' },
  { pnl: -45, exec_time: 67, token_in: 'BTC', token_out: 'USDC' },
  { pnl: 310, exec_time: 29, token_in: 'SOL', token_out: 'USDC' },
  { pnl: 125, exec_time: 52, token_in: 'ETH', token_out: 'USDC' },
];

export function TradeLogger({ agentId, onTradeComplete }: TradeLoggerProps) {
  const [trading, setTrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  
  // API key from localStorage
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Load API key from localStorage on mount/agentId change
  const storedApiKey = (() => {
    try {
      const storedKeys = JSON.parse(localStorage.getItem('atracks_api_keys') || '{}');
      return storedKeys[agentId] || null;
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    setApiKey(storedApiKey);
  }, [storedApiKey]);

  // Demo: log example trades for judges/investors
  async function runDemo() {
    if (!apiKey) {
      setError('No API key found. Only the agent owner can run demo.');
      return;
    }
    
    setTrading(true);
    setProgress(0);
    setError(null);
    setCompleted(false);

    for (let i = 0; i < DEMO_TRADES.length; i++) {
      const trade = DEMO_TRADES[i];
      try {
        await atracksApi.logTrade({
          agent_id: agentId,
          api_key: apiKey,
          token_in: trade.token_in,
          token_out: trade.token_out,
          pnl_usd: trade.pnl,
          execution_time_ms: trade.exec_time,
        });
        setProgress(i + 1);
        await new Promise(r => setTimeout(r, 120));
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr?.response?.data?.error || 'Demo failed');
        break;
      }
    }

    setTrading(false);
    setCompleted(true);
    onTradeComplete?.();
  }

  // If no API key, show ownership message
  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-text-muted" />
            <span className="text-xs uppercase tracking-widest">Demo Trades</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 text-sm font-medium mb-1">Not Your Agent</p>
              <p className="text-text-muted text-xs">
                Only the owner can log trades. API integration required for real agents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs uppercase tracking-widest">Demo Trades</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}
        
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 mb-4">
          <p className="text-text-muted text-xs leading-relaxed mb-3">
            Log 10 example trades to see how ATRACKS tracks performance and computes reputation.
          </p>
          <p className="text-[10px] text-text-muted italic">
            Real agents integrate via API — this demo shows the flow.
          </p>
        </div>

        {trading && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-text-muted mb-1">
              <span>Logging trades...</span>
              <span>{progress}/10</span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-200"
                style={{ width: `${(progress / 10) * 100}%` }}
              />
            </div>
          </div>
        )}

        {completed && !trading && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
            ✓ 10 trades logged! Check metrics above.
          </div>
        )}

        <Button onClick={runDemo} disabled={trading} className="w-full">
          <Play className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wider">
            {trading ? 'Running...' : completed ? 'Run Again' : 'Run Demo (10 Trades)'}
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
