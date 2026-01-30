import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { atracksApi, LeaderboardEntry, Agent, VerifiedReputation } from '@/lib/api';
import { Users, Plus, ChevronRight, Network, X, Zap, Sparkles, Trophy, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';

export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  
  // Onboarding flow state
  const [onboardingStep, setOnboardingStep] = useState<'idle' | 'creating' | 'trading' | 'proving' | 'done'>('idle');
  const [newAgent, setNewAgent] = useState<Agent | null>(null);
  const [newReputation, setNewReputation] = useState<VerifiedReputation | null>(null);

  async function fetchData() {
    try {
      const health = await atracksApi.health().catch(() => ({ cap402_connected: false }));
      const agentsRes = await atracksApi.getAgents().catch(() => ({ data: [] }));
      const leaderboardRes = await atracksApi.getLeaderboard().catch(() => ({ data: [] }));
      
      setConnected(health.cap402_connected === true);
      setAgents(agentsRes.data || []);
      setLeaderboard(leaderboardRes.data || []);
    } catch (error) {
      console.error('Dashboard sync error:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Check for register query param from Protocol page
  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setShowRegister(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Quick start - one click to create agent, log demo trades, generate proof, get reputation
  async function handleQuickStart() {
    setShowRegister(true);
    setOnboardingStep('idle');
  }

  async function handleRegister() {
    if (!newAgentName.trim()) return;
    setOnboardingStep('creating');
    
    try {
      // Step 1: Create agent
      const agentRes = await atracksApi.registerAgent(newAgentName.trim());
      const agent = agentRes.data;
      setNewAgent(agent);
      
      // Store API key in localStorage for this agent
      const storedKeys = JSON.parse(localStorage.getItem('atracks_api_keys') || '{}');
      storedKeys[agent.agent_id] = agent.api_key;
      localStorage.setItem('atracks_api_keys', JSON.stringify(storedKeys));
      
      setOnboardingStep('trading');
      
      // Step 2: Log sample trades (using the agent's API key)
      const sampleTrades = [
        { pnl_usd: 150, execution_time_ms: 45 },
        { pnl_usd: -30, execution_time_ms: 62 },
        { pnl_usd: 220, execution_time_ms: 38 },
        { pnl_usd: 85, execution_time_ms: 55 },
        { pnl_usd: -15, execution_time_ms: 41 },
        { pnl_usd: 180, execution_time_ms: 33 },
        { pnl_usd: 95, execution_time_ms: 48 },
        { pnl_usd: -45, execution_time_ms: 67 },
        { pnl_usd: 310, execution_time_ms: 29 },
        { pnl_usd: 125, execution_time_ms: 52 },
      ];
      
      for (const trade of sampleTrades) {
        await atracksApi.logTrade({
          agent_id: agent.agent_id,
          api_key: agent.api_key,
          pnl_usd: trade.pnl_usd,
          execution_time_ms: trade.execution_time_ms,
        });
      }
      
      setOnboardingStep('proving');
      
      // Step 3: Generate ZK proof
      await atracksApi.generateProof(agent.agent_id, 'win_rate', { threshold: 60 });
      
      // Step 4: Get verified reputation via MPC
      const repRes = await atracksApi.verifyReputation(agent.agent_id);
      setNewReputation(repRes.data);
      
      setOnboardingStep('done');
      setNewAgentName('');
      fetchData();
      
    } catch (error) {
      console.error('Onboarding failed:', error);
      setOnboardingStep('idle');
    }
  }

  function handleViewAgent() {
    if (newAgent) {
      setShowRegister(false);
      navigate(`/agents/${newAgent.agent_id}`);
    }
  }

  function handleCloseModal() {
    setShowRegister(false);
    setOnboardingStep('idle');
    setNewAgent(null);
    setNewReputation(null);
    setNewAgentName('');
  }

  const hasAgents = agents.length > 0;

  return (
    <div className="relative z-10 h-full flex flex-col justify-center pt-16 md:pt-24 pb-4">
      {/* Animated background - branded gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary accent orb - top left */}
        <motion.div
          animate={{ 
            x: [0, 40, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
            opacity: [0.03, 0.05, 0.03],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[10%] w-80 h-80 rounded-full bg-accent blur-3xl"
        />
        {/* Secondary indigo orb - bottom right */}
        <motion.div
          animate={{ 
            x: [0, -30, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
            opacity: [0.02, 0.04, 0.02],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-indigo-500 blur-3xl"
        />
        {/* Tertiary purple orb - center */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.015, 0.03, 0.015],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500 blur-3xl"
        />
        
        {/* Animated grid lines - subtle tech feel */}
        <div className="absolute inset-0 opacity-[0.02]">
          <motion.div 
            animate={{ opacity: [0.02, 0.04, 0.02] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(129, 140, 248, 0.3) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(129, 140, 248, 0.3) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.sin(i) * 20, 0],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut"
            }}
            className="absolute w-1 h-1 rounded-full bg-accent"
            style={{
              left: `${15 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
          />
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 w-full">
        {/* Hero with Logo */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-4 md:mb-5"
        >
          {/* Animated Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-4"
          >
            {/* Glow ring */}
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/40 to-indigo-500/40 blur-xl"
            />
            {/* Logo container */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="relative w-full h-full rounded-2xl bg-gradient-to-br from-accent/20 to-indigo-500/20 border border-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden"
            >
              <img 
                src="/atrackslogo.png" 
                alt="ATRACKS" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
              />
              {/* Shine effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
              />
            </motion.div>
          </motion.div>

          {/* Status badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] mb-3"
          >
            <motion.span 
              animate={connected ? { 
                boxShadow: ['0 0 4px #818cf8', '0 0 12px #818cf8', '0 0 4px #818cf8']
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-accent" : "bg-white/20"
              )} 
            />
            <span className="text-[8px] uppercase tracking-[0.3em] text-text-secondary font-semibold">
              {connected ? (
                <>Powered by <a href="https://cap402.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">CAP402</a></>
              ) : 'Connecting...'}
            </span>
          </motion.div>
          
          {/* Title with gradient */}
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl md:text-5xl font-extralight mb-2 tracking-tighter uppercase"
          >
            <span className="bg-gradient-to-r from-white via-white to-accent/80 bg-clip-text text-transparent">
              ATRACKS
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-text-muted text-sm md:text-base max-w-xs mx-auto mb-2"
          >
            Private reputation layer for trading agents
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="text-text-muted/60 text-xs md:text-[13px] max-w-sm mx-auto leading-relaxed"
          >
            Your bot runs on your infrastructure. We track & verify performance privately via encrypted storage, ZK proofs, and MPC scoring.
          </motion.p>
        </motion.div>

        {/* Quick Start CTA - Show prominently if no agents */}
        {!hasAgents && !loading && (
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            onClick={handleQuickStart}
            className="w-full mb-4 p-4 rounded-xl bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 hover:border-accent/50 transition-all group cursor-pointer"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-5 h-5 text-accent" />
              </motion.div>
              <span className="text-white text-sm font-medium">Try Demo — Create Agent in 10 Seconds</span>
              <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.button>
        )}

        {/* Value Props - What users get */}
        {!hasAgents && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="grid grid-cols-2 gap-2 mb-4"
          >
            {[
              { icon: <span className="text-amber-400 font-bold">◆</span>, title: 'Get Ranked', desc: 'Public leaderboard visibility' },
              { icon: <span className="text-accent font-mono text-[10px]">[FHE]</span>, title: 'Stay Private', desc: 'Strategy never exposed' },
              { icon: <span className="text-indigo-400 font-mono text-[10px]">[ZK]</span>, title: 'Prove Performance', desc: 'Verifiable credentials' },
              { icon: <span className="text-purple-400 font-mono text-[10px]">[MPC]</span>, title: 'Build Trust', desc: 'Agent-to-agent reputation' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05, duration: 0.3 }}
                className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center"
              >
                {item.icon}
                <p className="text-white text-[10px] font-medium mt-1">{item.title}</p>
                <p className="text-text-muted text-[8px]">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Flow - Subtle single line (show when has agents) */}
        {hasAgents && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4 text-[11px] md:text-xs text-text-muted"
          >
            <span>Log</span>
            <span className="text-white/20">→</span>
            <span>Encrypt</span>
            <span className="text-white/20">→</span>
            <span>Prove</span>
            <span className="text-white/20">→</span>
            <span className="text-accent">Verify</span>
          </motion.div>
        )}

        {/* Stats Row */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4"
        >
          <Link to="/agents" className="group p-3 md:p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] md:text-[8px] uppercase tracking-widest text-text-muted mb-0.5">Agents</p>
                <motion.p 
                  key={agents.length}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xl md:text-2xl font-light text-white"
                >
                  {loading ? '—' : agents.length}
                </motion.p>
              </div>
              <Users className="w-4 h-4 md:w-5 md:h-5 text-text-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
          <Link to="/leaderboard" className="group p-3 md:p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[7px] md:text-[8px] uppercase tracking-widest text-text-muted mb-0.5">Ranked</p>
                <motion.p 
                  key={leaderboard.length}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xl md:text-2xl font-light text-white"
                >
                  {loading ? '—' : leaderboard.length}
                </motion.p>
              </div>
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-text-muted group-hover:text-accent transition-colors" />
            </div>
          </Link>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="grid grid-cols-2 gap-2"
        >
          <motion.button 
            onClick={() => setShowRegister(true)} 
            className="group cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl glass-panel transition-all group-hover:border-accent/30">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white text-[9px] md:text-[10px] uppercase tracking-wide font-medium">New Agent</p>
              </div>
              <ChevronRight className="w-3 h-3 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link to="/proofs" className="group block">
              <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl glass-panel transition-all group-hover:border-accent/30">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-accent text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Network className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[9px] md:text-[10px] uppercase tracking-wide font-medium">ZK Proof</p>
                </div>
                <ChevronRight className="w-3 h-3 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* For Developers - API First */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-accent/5 to-indigo-500/5 border border-accent/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent font-mono text-[10px] font-semibold">[DEV]</span>
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">For Developers</p>
          </div>
          
          <p className="text-text-muted text-[11px] mb-3 leading-relaxed">
            <span className="text-white">ATRACKS is API-first.</span> This dashboard is for visualization and demo. 
            Your agents integrate directly via REST API — no frontend needed.
          </p>

          <div className="bg-black/40 rounded-xl p-3 mb-3 font-mono text-[9px] text-text-muted overflow-x-auto">
            <p className="text-accent"># CAP-402 capabilities invoked under the hood</p>
            <p className="text-white mt-1">POST /agents/register <span className="text-text-muted">→ {"{"} agent_id, api_key {"}"}</span></p>
            <p className="text-white">POST /trades <span className="text-violet-400">cap.fhe.compute.v1</span></p>
            <p className="text-white">POST /proofs/generate <span className="text-indigo-400">cap.zk.proof.v1</span></p>
            <p className="text-white">POST /reputation/verify <span className="text-blue-400">cap.mpc.compute.v1</span></p>
            <p className="text-accent mt-2"># Other agents verify trust</p>
            <p className="text-white">GET /trust/{"{agent_id}"} <span className="text-text-muted">→ {"{"} verified, star_rating {"}"}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="/docs" 
              target="_blank"
              className="flex-1 text-center py-2 px-3 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-white text-[10px] font-medium"
            >
              API Docs
            </a>
            <Link 
              to="/protocol"
              className="flex-1 text-center py-2 px-3 rounded-lg bg-accent/20 border border-accent/30 hover:bg-accent/30 transition-colors text-white text-[10px] font-medium"
            >
              How It Works
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Onboarding Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm p-5 md:p-6 rounded-2xl bg-[#0a0a0f] border border-white/[0.08]">
            
            {/* Step: Input name */}
            {onboardingStep === 'idle' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-white">Create Agent</h2>
                  <button onClick={handleCloseModal} className="text-text-muted hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Demo Mode Notice */}
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                  <p className="text-amber-400 text-[10px] font-mono font-semibold">[DEMO MODE]</p>
                  <p className="text-text-muted text-[9px] mt-1">
                    This will log 10 sample trades to demonstrate the full flow. For production, integrate our API to log real trades.
                  </p>
                </div>
                
                <p className="text-text-muted/60 text-[9px] mb-4 italic">
                  Your trading bot runs on your infrastructure. ATRACKS is just the reputation layer.
                </p>
                <input
                  type="text"
                  placeholder="Agent name (e.g. AlphaBot)"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50 mb-4 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
                <Button className="w-full" onClick={handleRegister} disabled={!newAgentName.trim()}>
                  <Zap className="w-4 h-4" />
                  Try Demo Flow
                </Button>
              </>
            )}

            {/* Step: Processing */}
            {(onboardingStep === 'creating' || onboardingStep === 'trading' || onboardingStep === 'proving') && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent animate-spin mx-auto mb-4" />
                <p className="text-white font-medium mb-2">
                  {onboardingStep === 'creating' && 'Creating agent...'}
                  {onboardingStep === 'trading' && 'Logging demo trades (Inco FHE)...'}
                  {onboardingStep === 'proving' && 'Generating ZK proof (Noir)...'}
                </p>
                <div className="flex items-center justify-center gap-4 text-[10px] text-text-muted">
                  <span className={cn(onboardingStep === 'creating' ? 'text-accent' : 'text-text-muted')}>① Create</span>
                  <span className={cn(onboardingStep === 'trading' ? 'text-accent' : 'text-text-muted')}>② Encrypt</span>
                  <span className={cn(onboardingStep === 'proving' ? 'text-accent' : 'text-text-muted')}>③ Prove</span>
                </div>
              </div>
            )}

            {/* Step: Done - Show results */}
            {onboardingStep === 'done' && newReputation && (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-white font-medium text-lg mb-1">{newAgent?.name}</h3>
                <p className="text-text-muted text-xs mb-4">Agent created & verified</p>
                
                {/* API Key - Important! */}
                <div className="text-left p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
                  <p className="text-yellow-400 text-[10px] uppercase tracking-wider font-semibold mb-1">[!] Save Your API Key</p>
                  <p className="text-text-muted text-[10px] mb-2">Only you can log trades for this agent. This key won't be shown again.</p>
                  <code className="block p-2 rounded bg-black/30 text-[10px] text-white font-mono break-all select-all">
                    {newAgent?.api_key}
                  </code>
                </div>

                {/* Reputation Results */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-2xl font-light text-white">{newReputation.reputation_score}</p>
                    <p className="text-[8px] uppercase tracking-wider text-text-muted">Score</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-lg font-medium text-accent">{newReputation.tier}</p>
                    <p className="text-[8px] uppercase tracking-wider text-text-muted">Tier</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-2xl font-light text-white">{newReputation.badges?.length || 0}</p>
                    <p className="text-[8px] uppercase tracking-wider text-text-muted">Badges</p>
                  </div>
                </div>

                {/* What happened */}
                <div className="text-left p-3 rounded-xl bg-accent/5 border border-accent/10 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 text-[9px] font-mono font-semibold">[DEMO]</span>
                    <p className="text-[10px] text-text-muted">What just happened:</p>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <p className="text-white">[ok] 10 sample trades encrypted via <span className="text-accent">Inco FHE</span></p>
                    <p className="text-white">[ok] Win rate proof via <span className="text-accent">Noir ZK</span></p>
                    <p className="text-white">[ok] Score computed via <span className="text-accent">Arcium MPC</span></p>
                  </div>
                  <p className="text-text-muted/60 text-[9px] mt-2 italic">
                    In production, integrate our API to log real trades from your bot.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={handleCloseModal}>
                    Close
                  </Button>
                  <Button onClick={handleViewAgent}>
                    View Agent
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
