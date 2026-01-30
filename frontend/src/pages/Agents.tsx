import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { atracksApi, Agent, AgentMetrics } from '@/lib/api';
import { formatUSD } from '@/lib/utils';
import { Plus, User, ChevronRight, X } from 'lucide-react';

interface AgentWithMetrics extends Agent {
  metrics?: AgentMetrics;
}

export function Agents() {
  const [agents, setAgents] = useState<AgentWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [registering, setRegistering] = useState(false);

  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await atracksApi.getAgents();
      const agentsWithMetrics = await Promise.all(
        (res.data || []).map(async (agent) => {
          try {
            const metricsRes = await atracksApi.getMetrics(agent.agent_id);
            return { ...agent, metrics: metricsRes.data };
          } catch {
            return agent;
          }
        })
      );
      setAgents(agentsWithMetrics);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, []);

  async function handleRegister() {
    if (!newAgentName.trim()) return;
    setRegistering(true);
    try {
      await atracksApi.registerAgent(newAgentName.trim());
      setNewAgentName('');
      setShowRegister(false);
      fetchAgents();
    } catch (error) {
      console.error('Failed to register agent:', error);
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="relative z-10 min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-white">Agents</h1>
          <p className="text-text-muted text-sm mt-1">{agents.length} registered</p>
        </div>
        <Button onClick={() => setShowRegister(true)} className="cursor-pointer">
          <Plus className="w-4 h-4" />
          New Agent
        </Button>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-white">New Agent</h2>
              <button onClick={() => setShowRegister(false)} className="text-text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Agent name"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-text-muted focus:outline-none focus:border-primary/50 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            />
            <Button className="w-full" onClick={handleRegister} disabled={registering || !newAgentName.trim()}>
              {registering ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </div>
      )}

      {/* Agents List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-white font-medium mb-2">No agents yet</h3>
          <p className="text-text-muted text-sm mb-6">Create your first agent to start</p>
          <Button onClick={() => setShowRegister(true)} className="cursor-pointer">
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Link to={`/agents/${agent.agent_id}`} key={agent.agent_id}>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group">
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white font-light text-lg shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{agent.name}</h3>
                  <p className="text-text-muted text-sm">
                    {agent.metrics ? `${agent.metrics.total_trades} trades` : 'No trades yet'}
                  </p>
                </div>
                {agent.metrics && (
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-text-muted text-xs">Win Rate</p>
                      <p className="text-success font-medium">{agent.metrics.win_rate.toFixed(0)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-text-muted text-xs">PnL</p>
                      <p className={agent.metrics.total_pnl_usd >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                        {formatUSD(agent.metrics.total_pnl_usd)}
                      </p>
                    </div>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
