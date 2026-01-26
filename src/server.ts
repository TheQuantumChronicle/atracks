/**
 * Atracks API Server
 * Private Agent Reputation System
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import { metricsStore } from './services/metrics-store';
import { reputationService } from './services/reputation';
import { cap402Client } from './cap402/client';
import { TradeRecord, ReputationProofRequest, AtracksResponse } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ============================================
// HEALTH & STATUS
// ============================================

app.get('/health', async (_req: Request, res: Response) => {
  const cap402Healthy = await cap402Client.healthCheck();
  res.json({
    status: 'healthy',
    service: 'atracks',
    version: '1.0.0',
    cap402_connected: cap402Healthy,
    timestamp: Date.now()
  });
});

// ============================================
// AGENT MANAGEMENT
// ============================================

/**
 * Register a new agent
 */
app.post('/agents/register', async (req: Request, res: Response) => {
  try {
    const { name, public_key } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    const agent = await metricsStore.registerAgent(name, public_key);
    
    const response: AtracksResponse<typeof agent> = {
      success: true,
      data: agent,
      timestamp: Date.now()
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Registration failed',
      timestamp: Date.now()
    });
  }
});

/**
 * Get agent details
 */
app.get('/agents/:agent_id', (req: Request, res: Response) => {
  const agent = metricsStore.getAgent(req.params.agent_id);
  
  if (!agent) {
    res.status(404).json({ success: false, error: 'Agent not found' });
    return;
  }

  res.json({
    success: true,
    data: agent,
    timestamp: Date.now()
  });
});

/**
 * List all agents
 */
app.get('/agents', (_req: Request, res: Response) => {
  const agents = metricsStore.getAllAgents();
  res.json({
    success: true,
    data: agents,
    count: agents.length,
    timestamp: Date.now()
  });
});

// ============================================
// TRADE LOGGING (Updates Encrypted Metrics)
// ============================================

/**
 * Log a trade for an agent
 */
app.post('/trades', async (req: Request, res: Response) => {
  try {
    const { agent_id, token_in, token_out, amount_in, amount_out, pnl_usd, execution_time_ms } = req.body;

    if (!agent_id) {
      res.status(400).json({ success: false, error: 'agent_id is required' });
      return;
    }

    const trade: TradeRecord = {
      trade_id: uuidv4(),
      agent_id,
      timestamp: Date.now(),
      token_in: token_in || 'SOL',
      token_out: token_out || 'USDC',
      amount_in: amount_in || 0,
      amount_out: amount_out || 0,
      pnl_usd: pnl_usd || 0,
      execution_time_ms: execution_time_ms || 100
    };

    const updatedMetrics = await metricsStore.logTrade(trade);

    res.json({
      success: true,
      data: {
        trade_id: trade.trade_id,
        metrics_updated: true,
        total_trades: updatedMetrics.total_trades,
        win_rate: metricsStore.getWinRate(agent_id).toFixed(2) + '%'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to log trade',
      timestamp: Date.now()
    });
  }
});

// ============================================
// METRICS (Private - Agent's Own Data)
// ============================================

/**
 * Get agent's own metrics (private)
 */
app.get('/metrics/:agent_id', (req: Request, res: Response) => {
  const metrics = metricsStore.getMetrics(req.params.agent_id);
  
  if (!metrics) {
    res.status(404).json({ success: false, error: 'Agent not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...metrics,
      win_rate: metricsStore.getWinRate(req.params.agent_id)
    },
    timestamp: Date.now()
  });
});

/**
 * Get encrypted metrics (shareable)
 */
app.get('/metrics/:agent_id/encrypted', (req: Request, res: Response) => {
  const encrypted = metricsStore.getEncryptedMetrics(req.params.agent_id);
  
  if (!encrypted) {
    res.status(404).json({ success: false, error: 'Encrypted metrics not found' });
    return;
  }

  res.json({
    success: true,
    data: encrypted,
    timestamp: Date.now()
  });
});

// ============================================
// REPUTATION PROOFS (Noir ZK)
// ============================================

/**
 * Generate a reputation proof
 */
app.post('/proofs/generate', async (req: Request, res: Response) => {
  try {
    const { agent_id, proof_type, public_inputs } = req.body;

    if (!agent_id || !proof_type) {
      res.status(400).json({ 
        success: false, 
        error: 'agent_id and proof_type are required' 
      });
      return;
    }

    const request: ReputationProofRequest = {
      agent_id,
      proof_type,
      public_inputs: public_inputs || {}
    };

    const proof = await reputationService.generateProof(request);

    res.json({
      success: true,
      data: proof,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate proof',
      timestamp: Date.now()
    });
  }
});

/**
 * Verify a reputation proof
 */
app.post('/proofs/verify', async (req: Request, res: Response) => {
  try {
    const { proof_id } = req.body;

    if (!proof_id) {
      res.status(400).json({ success: false, error: 'proof_id is required' });
      return;
    }

    const result = await reputationService.verifyProof(proof_id);

    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify proof',
      timestamp: Date.now()
    });
  }
});

/**
 * Get a specific proof
 */
app.get('/proofs/:proof_id', (req: Request, res: Response) => {
  const proof = reputationService.getProof(req.params.proof_id);
  
  if (!proof) {
    res.status(404).json({ success: false, error: 'Proof not found' });
    return;
  }

  res.json({
    success: true,
    data: proof,
    timestamp: Date.now()
  });
});

/**
 * Get all proofs for an agent
 */
app.get('/agents/:agent_id/proofs', (req: Request, res: Response) => {
  const proofs = reputationService.getAgentProofs(req.params.agent_id);
  
  res.json({
    success: true,
    data: proofs,
    count: proofs.length,
    timestamp: Date.now()
  });
});

// ============================================
// VERIFIED REPUTATION (Arcium MPC)
// ============================================

/**
 * Compute verified reputation score
 */
app.post('/reputation/verify', async (req: Request, res: Response) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      res.status(400).json({ success: false, error: 'agent_id is required' });
      return;
    }

    const verified = await reputationService.computeVerifiedReputation(agent_id);

    res.json({
      success: true,
      data: verified,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify reputation',
      timestamp: Date.now()
    });
  }
});

/**
 * Get verified reputation for an agent
 */
app.get('/reputation/:agent_id', (req: Request, res: Response) => {
  const verified = reputationService.getVerifiedReputation(req.params.agent_id);
  
  if (!verified) {
    res.status(404).json({ 
      success: false, 
      error: 'No verified reputation found. Call POST /reputation/verify first.' 
    });
    return;
  }

  res.json({
    success: true,
    data: verified,
    timestamp: Date.now()
  });
});

// ============================================
// LEADERBOARD (Public - Only Verified Data)
// ============================================

/**
 * Get reputation leaderboard
 */
app.get('/leaderboard', (_req: Request, res: Response) => {
  const leaderboard = reputationService.getLeaderboard();
  
  res.json({
    success: true,
    data: leaderboard,
    count: leaderboard.length,
    timestamp: Date.now()
  });
});

// ============================================
// PROOF TYPES INFO
// ============================================

app.get('/proof-types', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        type: 'win_rate',
        description: 'Prove win rate exceeds threshold without revealing exact rate',
        public_inputs: ['threshold']
      },
      {
        type: 'pnl_threshold',
        description: 'Prove PnL is within a range without revealing exact amount',
        public_inputs: ['min_pnl', 'max_pnl']
      },
      {
        type: 'trade_count',
        description: 'Prove trade count exceeds minimum without revealing exact count',
        public_inputs: ['min_trades']
      },
      {
        type: 'composite',
        description: 'Prove multiple criteria at once',
        public_inputs: ['min_win_rate', 'min_pnl', 'min_trades', 'min_sharpe', 'max_drawdown']
      }
    ],
    timestamp: Date.now()
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏆 ATRACKS - Private Agent Reputation System            ║
║                                                           ║
║   Server running at http://localhost:${PORT}                 ║
║                                                           ║
║   Privacy Stack:                                          ║
║   • Inco FHE  - Encrypted metrics storage                 ║
║   • Noir ZK   - Reputation proofs                         ║
║   • Arcium MPC - Verified scores                          ║
║                                                           ║
║   Powered by CAP-402 Protocol                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
