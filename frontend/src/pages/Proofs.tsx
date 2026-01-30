import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { atracksApi, Agent, ReputationProof } from '@/lib/api';
import { Shield, CheckCircle } from 'lucide-react';

const PROOF_TYPES = [
  { type: 'win_rate', label: 'Win Rate', desc: 'Prove win rate > X%' },
  { type: 'trade_count', label: 'Trade Count', desc: 'Prove trades > N' },
  { type: 'pnl_threshold', label: 'PnL Range', desc: 'Prove PnL in range' },
];

export function Proofs() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedProofType, setSelectedProofType] = useState<string>('win_rate');
  const [threshold, setThreshold] = useState<number>(60);
  const [generating, setGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<ReputationProof | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await atracksApi.getAgents();
        setAgents(res.data || []);
        if (res.data?.length > 0) {
          setSelectedAgent(res.data[0].agent_id);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    }
    fetchAgents();
  }, []);

  async function handleGenerateProof() {
    if (!selectedAgent || !selectedProofType) return;
    setGenerating(true);
    setGeneratedProof(null);

    try {
      const publicInputs: Record<string, number> = {};
      if (selectedProofType === 'win_rate') {
        publicInputs.threshold = threshold;
      } else if (selectedProofType === 'trade_count') {
        publicInputs.min_trades = threshold;
      } else if (selectedProofType === 'pnl_threshold') {
        publicInputs.min_pnl = 0;
        publicInputs.max_pnl = threshold * 100;
      }

      const res = await atracksApi.generateProof(selectedAgent, selectedProofType, publicInputs);
      setGeneratedProof(res.data);
    } catch (error) {
      console.error('Failed to generate proof:', error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="relative z-10 h-[calc(100vh-80px)] flex flex-col justify-center">
      <div className="max-w-xl mx-auto px-6 w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white mb-2">ZK Proofs</h1>
          <p className="text-text-muted text-xs">Prove performance without revealing data</p>
        </div>

        {/* Agent Selection */}
        <div className="mb-5">
          <label className="block text-text-muted text-[10px] uppercase tracking-wider mb-2">Agent</label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-accent/50 appearance-none text-sm"
          >
            <option value="">Select agent...</option>
            {agents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        {/* Proof Type */}
        <div className="mb-5">
          <label className="block text-text-muted text-[10px] uppercase tracking-wider mb-2">Proof Type</label>
          <div className="grid grid-cols-3 gap-2">
            {PROOF_TYPES.map((pt) => (
              <button
                key={pt.type}
                onClick={() => setSelectedProofType(pt.type)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedProofType === pt.type
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-white/[0.05] bg-white/[0.02] text-text-muted hover:border-white/[0.1]'
                }`}
              >
                <p className="font-medium text-xs">{pt.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Threshold */}
        <div className="mb-6">
          <label className="block text-text-muted text-[10px] uppercase tracking-wider mb-2">
            {selectedProofType === 'win_rate' && 'Min Win Rate (%)'}
            {selectedProofType === 'trade_count' && 'Min Trades'}
            {selectedProofType === 'pnl_threshold' && 'Max PnL ($)'}
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white focus:outline-none focus:border-accent/50 text-sm"
          />
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleGenerateProof}
          disabled={!selectedAgent || generating}
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Generate Proof
            </>
          )}
        </Button>

        {/* Result */}
        {generatedProof && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-accent" />
              <div>
                <p className="text-white text-sm font-medium">Proof Generated</p>
                <p className="text-text-muted text-xs">{generatedProof.proof_type}</p>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-black/30 font-mono text-[10px] text-text-muted break-all">
              {generatedProof.proof_id}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
