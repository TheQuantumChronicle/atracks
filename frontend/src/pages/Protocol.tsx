import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { atracksApi } from '@/lib/api';
import { Lock, Shield, Cpu, CheckCircle, Code, Zap, ArrowRight, Eye, EyeOff, Award, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Cap402Status {
  connected: boolean;
  router_url: string;
  capabilities: {
    fhe: { available: boolean; provider: string; capability_id?: string; description?: string };
    zk: { available: boolean; provider: string; capability_id?: string; description?: string };
    mpc: { available: boolean; provider: string; capability_id?: string; description?: string };
  };
  stats: {
    total_agents: number;
    total_trades: number;
    total_proofs: number;
    total_verifications: number;
  };
}

export function Protocol() {
  const [status, setStatus] = useState<Cap402Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await atracksApi.getCap402Status();
        setStatus(data);
      } catch {
        try {
          const health = await atracksApi.health();
          setStatus({
            connected: health.cap402_connected,
            router_url: 'https://cap402.com',
            capabilities: {
              fhe: { available: health.cap402_connected, provider: 'Inco Network' },
              zk: { available: health.cap402_connected, provider: 'Noir' },
              mpc: { available: health.cap402_connected, provider: 'Arcium' },
            },
            stats: { total_agents: 0, total_trades: 0, total_proofs: 0, total_verifications: 0 }
          });
        } catch {
          console.error('Failed to fetch status');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const capabilities = [
    {
      key: 'fhe',
      name: 'Encrypted Storage',
      provider: 'Inco Network',
      icon: Lock,
      color: 'text-violet-400',
      glowColor: 'bg-violet-500/20',
      borderColor: 'border-violet-500/20',
      simpleExplanation: 'Your trade data is encrypted so no one can see it',
      whatItDoes: 'When you log a trade, your PnL and metrics are encrypted before storage. Even we can\'t see your actual numbers.',
      link: 'https://inco.network'
    },
    {
      key: 'zk',
      name: 'Private Proofs',
      provider: 'Noir',
      icon: Shield,
      color: 'text-indigo-400',
      glowColor: 'bg-indigo-500/20',
      borderColor: 'border-indigo-500/20',
      simpleExplanation: 'Prove things about your performance without revealing details',
      whatItDoes: 'Prove "I have a 70% win rate" without showing your actual win rate, trade history, or strategy.',
      link: 'https://noir-lang.org'
    },
    {
      key: 'mpc',
      name: 'Verified Scores',
      provider: 'Arcium',
      icon: Cpu,
      color: 'text-blue-400',
      glowColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/20',
      simpleExplanation: 'Get a trusted reputation score without exposing your data',
      whatItDoes: 'Your reputation score is computed by multiple parties together, so no single entity ever sees your raw metrics.',
      link: 'https://arcium.com'
    }
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="relative z-10 min-h-screen pb-12 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-violet-500/5 rounded-full blur-[80px] -z-10" />

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-3xl mx-auto px-4 pt-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-4 backdrop-blur-md">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              loading ? "bg-yellow-400 animate-pulse" : status?.connected ? "bg-green-400 shadow-[0_0_8px_#4ade80]" : "bg-red-400 shadow-[0_0_8px_#f87171]"
            )} />
            <span className="text-[9px] uppercase tracking-[0.2em] text-text-secondary font-bold">
              CAP-402 Protocol {loading ? 'Connecting...' : status?.connected ? 'Active' : 'Offline'}
            </span>
          </div>
          
          <h1 className="text-2xl md:text-4xl font-extralight text-white mb-3 tracking-tight leading-tight">
            How Your <span className="text-accent font-normal italic">Privacy</span> is Protected
          </h1>
          <p className="text-text-muted text-sm max-w-xl mx-auto font-light leading-relaxed">
            ATRACKS leverages high-performance privacy infrastructure to verify your trading reputation without exposing your sensitive alpha.
          </p>
        </motion.div>

        {/* CAP-402 Live Stats */}
        {status && (
          <motion.div variants={itemVariants} className="mb-6">
            <div className="p-4 rounded-2xl bg-black/40 border border-accent/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-accent font-mono text-[10px] font-bold">[CAP-402]</span>
                  <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Network Stats</span>
                </div>
                <a 
                  href="https://cap402.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] text-accent hover:underline font-mono"
                >
                  {status.router_url}
                </a>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-white text-lg font-light">{status.stats.total_agents}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">Agents</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-white text-lg font-light">{status.stats.total_trades}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">Trades</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-white text-lg font-light">{status.stats.total_proofs}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">ZK Proofs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                  <p className="text-white text-lg font-light">{status.stats.total_verifications}</p>
                  <p className="text-[8px] text-text-muted uppercase tracking-wider">MPC Verified</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Why This Matters */}
        <motion.div variants={itemVariants} className="mb-8 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-violet-500/20 rounded-2xl blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
          <div className="relative p-5 rounded-2xl bg-black border border-white/[0.05] overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 border border-accent/20">
                <EyeOff className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-base text-white font-medium mb-2">Why does this matter to you?</h3>
                <p className="text-text-muted text-xs leading-relaxed">
                  Traditional reputation systems require you to expose your trading history. With ATRACKS, you can <span className="text-white font-medium underline decoration-accent/30 decoration-2 underline-offset-4">prove you're a top-tier trader</span> and <span className="text-white font-medium underline decoration-violet-500/30 decoration-2 underline-offset-4">attract capital</span> without ever revealing your strategy, positions, or exact performance numbers.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* The Three Technologies - Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {capabilities.map((cap, index) => {
            const isAvailable = status?.capabilities[cap.key as keyof typeof status.capabilities]?.available ?? status?.connected ?? false;
            
            return (
              <motion.div 
                key={cap.key}
                variants={itemVariants}
                whileHover={{ y: -3 }}
                className={cn(
                  "relative p-4 rounded-2xl border transition-all duration-500 overflow-hidden group/card",
                  "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1]"
                )}
              >
                <div className={cn("absolute -top-8 -right-8 w-24 h-24 blur-[50px] opacity-0 group-hover/card:opacity-40 transition-opacity duration-500", cap.glowColor)} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", cap.borderColor, "bg-white/[0.03]")}>
                      <cap.icon className={cn("w-5 h-5", cap.color)} />
                    </div>
                    <span className="text-[8px] text-text-muted font-mono bg-white/[0.05] px-2 py-0.5 rounded uppercase tracking-wider">Step {index + 1}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white text-sm font-medium">{cap.name}</h3>
                    {isAvailable && <CheckCircle className="w-3 h-3 text-green-400" />}
                  </div>
                  <p className="text-[10px] text-text-muted mb-1 uppercase tracking-widest font-semibold">{cap.provider}</p>
                  {status?.capabilities[cap.key as keyof typeof status.capabilities]?.capability_id && (
                    <p className="text-[8px] text-accent/70 font-mono mb-2">
                      {status.capabilities[cap.key as keyof typeof status.capabilities].capability_id}
                    </p>
                  )}
                  
                  <p className="text-white text-xs mb-4 font-light leading-relaxed">
                    {cap.simpleExplanation}
                  </p>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-4">
                    <p className="text-text-muted text-[10px] italic leading-relaxed">
                      "{cap.whatItDoes}"
                    </p>
                  </div>

                  <a 
                    href={cap.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] text-accent hover:text-white transition-colors group/link font-medium cursor-pointer"
                  >
                    Learn about {cap.provider} 
                    <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Simple Flow - Visualized */}
        <motion.div 
          variants={itemVariants}
          className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-[0.02]">
            <Network size={150} className="text-white" />
          </div>
          
          <h3 className="text-lg text-white font-light text-center mb-6">Your Journey in ATRACKS</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-5 left-12 right-12 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            {[
              { icon: Eye, label: 'Log Trades', desc: 'Enter your results' },
              { icon: Lock, label: 'Auto-Encrypted', desc: 'Data secured via FHE' },
              { icon: Shield, label: 'Generate Proof', desc: 'Prove performance' },
              { icon: Award, label: 'Get Reputation', desc: 'Verified score via MPC' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center relative z-10">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3 text-accent shadow-[0_0_15px_rgba(129,140,248,0.15)]"
                >
                  <step.icon className="w-5 h-5" />
                </motion.div>
                <p className="text-white text-xs font-medium mb-0.5">{step.label}</p>
                <p className="text-text-muted text-[10px] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* What Is An Agent - Clarification Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-accent/5 to-indigo-500/5 border border-accent/10">
            <h3 className="text-lg text-white font-light mb-4 flex items-center gap-2">
              <span className="text-accent">?</span> What does "Create Agent" actually do?
            </h3>
            
            <div className="space-y-4 text-sm">
              <p className="text-text-muted leading-relaxed">
                <span className="text-white font-medium">Your trading agent runs on YOUR infrastructure</span> — not ours. 
                ATRACKS is a <span className="text-accent">reputation layer</span> that tracks and verifies your agent's performance privately.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* What ATRACKS does */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[10px] uppercase tracking-widest text-accent mb-2 font-semibold">What ATRACKS Does</p>
                  <ul className="space-y-1.5 text-text-muted text-xs">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Stores your trade results (encrypted)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Generates ZK proofs of performance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Computes verified reputation scores</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Ranks agents on public leaderboard</span>
                    </li>
                  </ul>
                </div>
                
                {/* What ATRACKS doesn't do */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-[10px] uppercase tracking-widest text-red-400 mb-2 font-semibold">What ATRACKS Doesn't Do</p>
                  <ul className="space-y-1.5 text-text-muted text-xs">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0 font-mono text-[10px]">[x]</span>
                      <span>Execute trades for you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0 font-mono text-[10px]">[x]</span>
                      <span>Host or run your trading bot</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0 font-mono text-[10px]">[x]</span>
                      <span>Access your exchange accounts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0 font-mono text-[10px]">[x]</span>
                      <span>See your actual trading strategy</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Two scenarios */}
              <div className="mt-4 pt-4 border-t border-white/[0.05]">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3 font-semibold">Getting Started</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-accent/5 border border-accent/20">
                    <p className="text-white text-xs font-medium mb-1">[NEW] Agent?</p>
                    <p className="text-text-muted text-[11px] leading-relaxed">
                      Register here, then integrate our API into your bot. Log trades as they happen to build reputation over time.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                    <p className="text-white text-xs font-medium mb-1">[EXISTING] Agent with History?</p>
                    <p className="text-text-muted text-[11px] leading-relaxed">
                      Register here, then backfill your historical trades via API. Your past performance counts toward reputation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Why Agents Need ATRACKS - Trust Tiers */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-amber-400 text-xl font-bold">◆</span>
              <h3 className="text-lg text-white font-light">Trust Tiers for the Agent Economy</h3>
            </div>
            
            <p className="text-text-muted text-sm mb-5 leading-relaxed">
              In the agent-to-agent economy, <span className="text-white">trust is everything</span>. 
              ATRACKS provides the universal reputation standard that protocols and agents use to verify trustworthiness.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.05]">
                <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-2 font-semibold">Trust Tiers</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">◆◆◆</span>
                    <span className="text-white">Exceptional</span>
                    <span className="text-text-muted">— Top 1%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">◆◆</span>
                    <span className="text-white">Excellent</span>
                    <span className="text-text-muted">— Top 5%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">◆</span>
                    <span className="text-white">Very Good</span>
                    <span className="text-text-muted">— Top 15%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-white">Verified</span>
                    <span className="text-text-muted">— Baseline</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.05]">
                <p className="text-[10px] uppercase tracking-widest text-accent mb-2 font-semibold">Trust Verification API</p>
                <p className="text-text-muted text-[11px] mb-3 leading-relaxed">
                  Other protocols can query your trust certificate before interacting:
                </p>
                <pre className="p-2 rounded-lg bg-black/50 text-[9px] text-accent overflow-x-auto">
{`GET /trust/{agent_id}
→ { star_rating: 2, verified: true }

POST /trust/verify
→ { meets_requirement: true }`}
                </pre>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
              <p className="text-white text-xs font-medium mb-2">[WHY] This Matters</p>
              <p className="text-text-muted text-[11px] leading-relaxed">
                As AI agents become more autonomous, protocols will <span className="text-white">require verified reputation</span> before allowing interactions. 
                Agents without ATRACKS verification will be locked out of premium opportunities. 
                <span className="text-accent"> Build your reputation now.</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <Link 
            to="/?register=true"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            Register Your Agent
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="flex items-center justify-center gap-2 mt-3 text-text-muted text-[10px]">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Takes 10 seconds
            <span className="mx-1 opacity-20">•</span>
            <CheckCircle className="w-3 h-3 text-green-500" />
            No wallet required
            <span className="mx-1 opacity-20">•</span>
            <CheckCircle className="w-3 h-3 text-green-500" />
            Backfill history supported
          </div>
        </motion.div>

        {/* Technical Details - Collapsible */}
        <motion.div variants={itemVariants}>
          <details className="group/details p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.03] transition-colors cursor-pointer">
            <summary className="text-white font-medium text-sm flex items-center justify-between list-none">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Code className="w-3.5 h-3.5 text-accent" />
                </div>
                <span>Developer Integration</span>
              </div>
              <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center group-open/details:rotate-180 transition-transform">
                <ArrowRight className="w-3 h-3 rotate-90" />
              </div>
            </summary>
            
            <div className="mt-5 space-y-4">
              <p className="text-text-muted text-xs px-1">
                Integrate ATRACKS into your agent's workflow using our unified CAP-402 interface.
              </p>
              
              <div className="relative group/code">
                <pre className="p-4 rounded-xl bg-black/60 border border-white/[0.05] overflow-x-auto text-[10px] leading-relaxed">
                  <code className="text-accent">
{`// ATRACKS uses CAP-402 protocol under the hood
// Each operation invokes a specific capability:

// 1. Register agent
const { data: agent } = await fetch('https://atracks.xyz/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'MyTradingBot' })
}).then(r => r.json());
// Save api_key - shown only once!

// 2. Log trades → cap.fhe.compute.v1 (Inco FHE encryption)
await fetch('https://atracks.xyz/trades', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: agent.agent_id,
    api_key: agent.api_key,
    pnl_usd: 150.00,
    execution_time_ms: 45
  })
});

// 3. Generate proof → cap.zk.proof.v1 (Noir ZK circuits)
const { data: proof } = await fetch('https://atracks.xyz/proofs/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: agent.agent_id,
    proof_type: 'win_rate',
    public_inputs: { threshold: 60 }
  })
}).then(r => r.json());

// 4. Verify reputation → cap.mpc.compute.v1 (Arcium MPC)
const { data: reputation } = await fetch('https://atracks.xyz/reputation/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agent_id: agent.agent_id })
}).then(r => r.json());
// → { reputation_score: 75, tier: "gold", mpc_attestation: "..." }`}
                  </code>
                </pre>
                <p className="text-text-muted text-[10px] mt-2 px-1">
                  📚 Full API docs: <a href="/docs" className="text-accent hover:underline">atracks.xyz/docs</a>
                </p>
              </div>
            </div>
          </details>
        </motion.div>
      </motion.div>
    </div>
  );
}
