/**
 * Reputation Service
 * Generates ZK proofs via Noir and verifies via Arcium MPC
 */

import { v4 as uuidv4 } from 'uuid';
import { cap402Client } from '../cap402/client';
import { metricsStore } from './metrics-store';
import {
  ReputationProof,
  ReputationProofRequest,
  ReputationProofType,
  VerifiedReputation,
  ReputationTier,
  ReputationBadge
} from '../types';

// Store for generated proofs
const proofsStore = new Map<string, ReputationProof>();
const verifiedReputations = new Map<string, VerifiedReputation>();

// Tier thresholds
const TIER_THRESHOLDS = {
  diamond: { min_score: 90, min_trades: 500, min_win_rate: 70 },
  platinum: { min_score: 80, min_trades: 200, min_win_rate: 65 },
  gold: { min_score: 70, min_trades: 100, min_win_rate: 60 },
  silver: { min_score: 60, min_trades: 50, min_win_rate: 55 },
  bronze: { min_score: 50, min_trades: 10, min_win_rate: 50 }
};

// Badge definitions
const BADGE_DEFINITIONS: Record<string, { name: string; description: string; criteria: (m: any) => boolean }> = {
  first_trade: {
    name: 'First Trade',
    description: 'Completed first trade',
    criteria: (m) => m.total_trades >= 1
  },
  profitable: {
    name: 'Profitable',
    description: 'Achieved positive PnL',
    criteria: (m) => m.total_pnl_usd > 0
  },
  consistent: {
    name: 'Consistent',
    description: 'Win rate above 60%',
    criteria: (m) => m.total_trades > 0 && (m.winning_trades / m.total_trades) >= 0.6
  },
  veteran: {
    name: 'Veteran',
    description: 'Completed 100+ trades',
    criteria: (m) => m.total_trades >= 100
  },
  whale: {
    name: 'Whale',
    description: 'PnL exceeds $10,000',
    criteria: (m) => m.total_pnl_usd >= 10000
  },
  speed_demon: {
    name: 'Speed Demon',
    description: 'Average execution under 100ms',
    criteria: (m) => m.avg_execution_time_ms < 100
  }
};

class ReputationService {

  /**
   * Generate a reputation proof for an agent
   */
  async generateProof(request: ReputationProofRequest): Promise<ReputationProof> {
    const metrics = metricsStore.getMetrics(request.agent_id);
    if (!metrics) {
      throw new Error(`Agent ${request.agent_id} not found`);
    }

    let proofResult: { proof: string; verification_key: string; meets_threshold?: boolean };
    let publicOutputs: Record<string, any> = {};

    switch (request.proof_type) {
      case 'win_rate':
        const winRate = metricsStore.getWinRate(request.agent_id);
        proofResult = await cap402Client.proveWinRate(
          winRate,
          request.public_inputs.threshold || 50
        );
        publicOutputs = {
          threshold: request.public_inputs.threshold,
          meets_threshold: proofResult.meets_threshold
        };
        break;

      case 'pnl_threshold':
        proofResult = await cap402Client.provePnLThreshold(
          metrics.total_pnl_usd,
          request.public_inputs.min_pnl || 0,
          request.public_inputs.max_pnl || 1000000
        );
        publicOutputs = {
          min_pnl: request.public_inputs.min_pnl,
          max_pnl: request.public_inputs.max_pnl,
          pnl_in_range: true
        };
        break;

      case 'trade_count':
        proofResult = await cap402Client.proveTradeCount(
          metrics.total_trades,
          request.public_inputs.min_trades || 10
        );
        publicOutputs = {
          min_trades: request.public_inputs.min_trades,
          meets_threshold: proofResult.meets_threshold
        };
        break;

      case 'composite':
        const compositeResult = await cap402Client.proveCompositeReputation(
          {
            win_rate: metricsStore.getWinRate(request.agent_id),
            pnl: metrics.total_pnl_usd,
            trades: metrics.total_trades,
            sharpe: metrics.sharpe_ratio,
            drawdown: metrics.max_drawdown_bps
          },
          {
            min_win_rate: request.public_inputs.min_win_rate || 50,
            min_pnl: request.public_inputs.min_pnl || 0,
            min_trades: request.public_inputs.min_trades || 10,
            min_sharpe: request.public_inputs.min_sharpe || 0.5,
            max_drawdown: request.public_inputs.max_drawdown || 2000
          }
        );
        proofResult = {
          proof: compositeResult.proof,
          verification_key: compositeResult.verification_key
        };
        publicOutputs = {
          all_criteria_met: compositeResult.all_criteria_met,
          criteria_results: compositeResult.criteria_results
        };
        break;

      default:
        throw new Error(`Unknown proof type: ${request.proof_type}`);
    }

    const proof: ReputationProof = {
      proof_id: uuidv4(),
      agent_id: request.agent_id,
      proof_type: request.proof_type,
      proof_data: proofResult.proof,
      verification_key: proofResult.verification_key,
      public_outputs: publicOutputs,
      created_at: Date.now(),
      expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      circuit_hash: `noir_${request.proof_type}_v1`
    };

    proofsStore.set(proof.proof_id, proof);
    return proof;
  }

  /**
   * Verify a reputation proof via Arcium MPC
   */
  async verifyProof(proofId: string): Promise<{ valid: boolean; verification_proof: string }> {
    const proof = proofsStore.get(proofId);
    if (!proof) {
      throw new Error(`Proof ${proofId} not found`);
    }

    if (Date.now() > proof.expires_at) {
      throw new Error(`Proof ${proofId} has expired`);
    }

    return cap402Client.verifyReputationProof(
      proof.proof_data,
      proof.verification_key,
      proof.public_outputs
    );
  }

  /**
   * Compute verified reputation score via Arcium MPC
   */
  async computeVerifiedReputation(agentId: string): Promise<VerifiedReputation> {
    const agent = metricsStore.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const metrics = metricsStore.getMetrics(agentId);
    if (!metrics) {
      throw new Error(`Metrics for agent ${agentId} not found`);
    }

    const encryptedMetrics = metricsStore.getEncryptedMetrics(agentId);
    
    // Get all proofs for this agent
    const agentProofs = Array.from(proofsStore.values())
      .filter(p => p.agent_id === agentId && Date.now() < p.expires_at)
      .map(p => p.proof_data);

    // Compute score via Arcium MPC
    const result = await cap402Client.computeVerifiedScore(
      agentId,
      encryptedMetrics?.encrypted_data || '',
      agentProofs
    );

    // Calculate badges
    const badges = this.calculateBadges(agentId, metrics);

    const verified: VerifiedReputation = {
      agent_id: agentId,
      reputation_score: result.reputation_score,
      tier: result.tier as ReputationTier,
      badges,
      verification_proof: result.mpc_attestation,
      verified_at: Date.now(),
      mpc_attestation: result.mpc_attestation
    };

    verifiedReputations.set(agentId, verified);
    return verified;
  }

  /**
   * Get verified reputation for an agent
   */
  getVerifiedReputation(agentId: string): VerifiedReputation | undefined {
    return verifiedReputations.get(agentId);
  }

  /**
   * Calculate earned badges
   */
  private calculateBadges(agentId: string, metrics: any): ReputationBadge[] {
    const badges: ReputationBadge[] = [];

    for (const [badgeId, def] of Object.entries(BADGE_DEFINITIONS)) {
      if (def.criteria(metrics)) {
        badges.push({
          badge_id: badgeId,
          name: def.name,
          description: def.description,
          earned_at: Date.now()
        });
      }
    }

    return badges;
  }

  /**
   * Get proof by ID
   */
  getProof(proofId: string): ReputationProof | undefined {
    return proofsStore.get(proofId);
  }

  /**
   * Get all proofs for an agent
   */
  getAgentProofs(agentId: string): ReputationProof[] {
    return Array.from(proofsStore.values())
      .filter(p => p.agent_id === agentId);
  }

  /**
   * Get leaderboard with verified reputations
   */
  getLeaderboard(): Array<{
    agent_id: string;
    name: string;
    tier: ReputationTier;
    score: number;
    badges_count: number;
  }> {
    const agents = metricsStore.getAllAgents();
    
    return agents
      .map(agent => {
        const verified = verifiedReputations.get(agent.agent_id);
        return {
          agent_id: agent.agent_id,
          name: agent.name,
          tier: verified?.tier || 'unverified' as ReputationTier,
          score: verified?.reputation_score || 0,
          badges_count: verified?.badges.length || 0
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

export const reputationService = new ReputationService();
