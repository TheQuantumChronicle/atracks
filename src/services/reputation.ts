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

// Database access (optional)
let prisma: any = null;

async function initReputationDb() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return;
    
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    
    // Load existing reputations from database
    const reputations = await prisma.reputation.findMany({
      include: { agent: true }
    });
    
    for (const rep of reputations) {
      verifiedReputations.set(rep.agentId, {
        agent_id: rep.agentId,
        reputation_score: rep.score,
        tier: rep.tier as ReputationTier,
        badges: rep.badges as ReputationBadge[],
        verification_proof: rep.mpcAttestation || '',
        verified_at: rep.verifiedAt.getTime(),
        mpc_attestation: rep.mpcAttestation || ''
      });
    }
    
    // Load existing proofs
    const proofs = await prisma.proof.findMany();
    for (const proof of proofs) {
      proofsStore.set(proof.id, {
        proof_id: proof.id,
        agent_id: proof.agentId,
        proof_type: proof.proofType as ReputationProofType,
        proof_data: proof.proof,
        verification_key: proof.verificationKey,
        public_outputs: proof.publicOutputs as Record<string, any>,
        created_at: proof.createdAt.getTime(),
        expires_at: proof.createdAt.getTime() + 86400000, // 24h
        circuit_hash: `noir_${proof.proofType}_v1`
      });
    }
    
    console.log(`   Loaded ${reputations.length} reputations, ${proofs.length} proofs from database`);
  } catch (error) {
    // Silent fail - database is optional
  }
}

initReputationDb().catch(() => {});

// Cleanup expired proofs every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [proofId, proof] of proofsStore.entries()) {
    if (now > proof.expires_at) {
      proofsStore.delete(proofId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired proofs from memory`);
  }
}, 5 * 60 * 1000);

// ATRACKS Trust Tier System
// ◆◆◆ Three Diamonds = Exceptional (top 1%)
// ◆◆ Two Diamonds = Excellent (top 5%)
// ◆ One Diamond = Very Good (top 15%)
// ✓ Verified = Meets baseline standards
// — Unverified = Not yet evaluated

const STAR_THRESHOLDS = {
  three_star: { min_score: 95, min_trades: 1000, min_win_rate: 75, min_pnl: 10000 },
  two_star: { min_score: 85, min_trades: 500, min_win_rate: 68, min_pnl: 5000 },
  one_star: { min_score: 75, min_trades: 200, min_win_rate: 62, min_pnl: 1000 },
  verified: { min_score: 50, min_trades: 25, min_win_rate: 50, min_pnl: 0 }
};

// Legacy tier mapping for backwards compatibility
const TIER_THRESHOLDS = {
  diamond: { min_score: 95, min_trades: 1000, min_win_rate: 75 },  // = 3 stars
  platinum: { min_score: 85, min_trades: 500, min_win_rate: 68 },  // = 2 stars
  gold: { min_score: 75, min_trades: 200, min_win_rate: 62 },      // = 1 star
  silver: { min_score: 60, min_trades: 50, min_win_rate: 55 },     // = verified
  bronze: { min_score: 50, min_trades: 25, min_win_rate: 50 }      // = verified
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
    
    // Save to database if available
    if (prisma) {
      try {
        await prisma.proof.create({
          data: {
            id: proof.proof_id,
            agentId: proof.agent_id,
            proofType: proof.proof_type,
            proof: proof.proof_data,
            verificationKey: proof.verification_key,
            publicInputs: request.public_inputs,
            publicOutputs: proof.public_outputs,
            verified: false
          }
        });
      } catch (error) {
        console.log('⚠️ Failed to save proof to database');
      }
    }
    
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
      agentProofs,
      {
        total_trades: metrics.total_trades,
        winning_trades: metrics.winning_trades,
        total_pnl_usd: metrics.total_pnl_usd,
        avg_execution_time_ms: metrics.avg_execution_time_ms
      }
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
    
    // Save to database if available
    if (prisma) {
      try {
        await prisma.reputation.upsert({
          where: { agentId },
          update: {
            score: verified.reputation_score,
            tier: verified.tier,
            badges: verified.badges,
            mpcAttestation: verified.mpc_attestation,
            verifiedAt: new Date(verified.verified_at)
          },
          create: {
            agentId,
            score: verified.reputation_score,
            tier: verified.tier,
            badges: verified.badges,
            mpcAttestation: verified.mpc_attestation,
            verifiedAt: new Date(verified.verified_at)
          }
        });
      } catch (error) {
        console.log('⚠️ Failed to save reputation to database');
      }
    }
    
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
    agent_name: string;
    reputation_score: number;
    tier: ReputationTier;
    badges: ReputationBadge[];
    total_trades: number;
  }> {
    const agents = metricsStore.getAllAgents();
    
    return agents
      .map(agent => {
        const verified = verifiedReputations.get(agent.agent_id);
        const metrics = metricsStore.getMetrics(agent.agent_id);
        return {
          agent_id: agent.agent_id,
          agent_name: agent.name,
          reputation_score: verified?.reputation_score || 0,
          tier: verified?.tier || 'unverified' as ReputationTier,
          badges: verified?.badges || [],
          total_trades: metrics?.total_trades || 0
        };
      })
      .filter(entry => entry.reputation_score > 0) // Only show verified agents
      .sort((a, b) => b.reputation_score - a.reputation_score);
  }
  /**
   * Calculate ATRACKS Star Rating (Michelin-style)
   * Returns 0-3 stars based on comprehensive performance metrics
   */
  calculateStarRating(agentId: string): {
    stars: number;
    rating: 'three_star' | 'two_star' | 'one_star' | 'verified' | 'unverified';
    display: string;
    description: string;
  } {
    const verified = verifiedReputations.get(agentId);
    const metrics = metricsStore.getMetrics(agentId);
    
    if (!verified || !metrics) {
      return { 
        stars: 0, 
        rating: 'unverified', 
        display: '—',
        description: 'Not yet verified'
      };
    }

    const score = verified.reputation_score;
    const trades = metrics.total_trades;
    const winRate = trades > 0 ? (metrics.winning_trades / trades) * 100 : 0;
    const pnl = metrics.total_pnl_usd;

    // Check thresholds from highest to lowest
    if (score >= STAR_THRESHOLDS.three_star.min_score &&
        trades >= STAR_THRESHOLDS.three_star.min_trades &&
        winRate >= STAR_THRESHOLDS.three_star.min_win_rate &&
        pnl >= STAR_THRESHOLDS.three_star.min_pnl) {
      return { 
        stars: 3, 
        rating: 'three_star', 
        display: '◆◆◆',
        description: 'Exceptional'
      };
    }

    if (score >= STAR_THRESHOLDS.two_star.min_score &&
        trades >= STAR_THRESHOLDS.two_star.min_trades &&
        winRate >= STAR_THRESHOLDS.two_star.min_win_rate &&
        pnl >= STAR_THRESHOLDS.two_star.min_pnl) {
      return { 
        stars: 2, 
        rating: 'two_star', 
        display: '◆◆',
        description: 'Excellent'
      };
    }

    if (score >= STAR_THRESHOLDS.one_star.min_score &&
        trades >= STAR_THRESHOLDS.one_star.min_trades &&
        winRate >= STAR_THRESHOLDS.one_star.min_win_rate &&
        pnl >= STAR_THRESHOLDS.one_star.min_pnl) {
      return { 
        stars: 1, 
        rating: 'one_star', 
        display: '◆',
        description: 'Very Good'
      };
    }

    if (score >= STAR_THRESHOLDS.verified.min_score &&
        trades >= STAR_THRESHOLDS.verified.min_trades) {
      return { 
        stars: 0, 
        rating: 'verified', 
        display: '✓',
        description: 'Verified'
      };
    }

    return { 
      stars: 0, 
      rating: 'unverified', 
      display: '—',
      description: 'Not yet verified'
    };
  }

  /**
   * Get public trust certificate for an agent
   * This is what other protocols/agents can query to verify trust
   */
  getTrustCertificate(agentId: string): {
    agent_id: string;
    agent_name: string;
    verified: boolean;
    star_rating: number;
    rating_display: string;
    rating_description: string;
    tier: string;
    reputation_score: number;
    total_trades: number;
    win_rate: number;
    verified_at: number | null;
    certificate_hash: string;
    valid_until: number;
  } | null {
    const agent = metricsStore.getAgent(agentId);
    if (!agent) return null;

    const verified = verifiedReputations.get(agentId);
    const metrics = metricsStore.getMetrics(agentId);
    const starRating = this.calculateStarRating(agentId);
    
    const winRate = metrics && metrics.total_trades > 0 
      ? (metrics.winning_trades / metrics.total_trades) * 100 
      : 0;

    // Generate certificate hash for verification
    const certData = `${agentId}:${verified?.reputation_score || 0}:${starRating.stars}:${Date.now()}`;
    const certHash = `atracks_cert_${Buffer.from(certData).toString('base64').slice(0, 32)}`;

    return {
      agent_id: agentId,
      agent_name: agent.name,
      verified: !!verified,
      star_rating: starRating.stars,
      rating_display: starRating.display,
      rating_description: starRating.description,
      tier: verified?.tier || 'unverified',
      reputation_score: verified?.reputation_score || 0,
      total_trades: metrics?.total_trades || 0,
      win_rate: Math.round(winRate * 10) / 10,
      verified_at: verified?.verified_at || null,
      certificate_hash: certHash,
      valid_until: Date.now() + (24 * 60 * 60 * 1000) // Valid for 24 hours
    };
  }

  /**
   * Get leaderboard with star ratings
   */
  getLeaderboardWithStars(): Array<{
    agent_id: string;
    agent_name: string;
    reputation_score: number;
    star_rating: number;
    rating_display: string;
    tier: ReputationTier;
    badges: ReputationBadge[];
    total_trades: number;
    win_rate: number;
  }> {
    const agents = metricsStore.getAllAgents();
    
    return agents
      .map(agent => {
        const verified = verifiedReputations.get(agent.agent_id);
        const metrics = metricsStore.getMetrics(agent.agent_id);
        const starRating = this.calculateStarRating(agent.agent_id);
        const winRate = metrics && metrics.total_trades > 0 
          ? (metrics.winning_trades / metrics.total_trades) * 100 
          : 0;
        
        return {
          agent_id: agent.agent_id,
          agent_name: agent.name,
          reputation_score: verified?.reputation_score || 0,
          star_rating: starRating.stars,
          rating_display: starRating.display,
          tier: verified?.tier || 'unverified' as ReputationTier,
          badges: verified?.badges || [],
          total_trades: metrics?.total_trades || 0,
          win_rate: Math.round(winRate * 10) / 10
        };
      })
      .filter(entry => entry.reputation_score > 0)
      .sort((a, b) => {
        // Sort by stars first, then by score
        if (b.star_rating !== a.star_rating) return b.star_rating - a.star_rating;
        return b.reputation_score - a.reputation_score;
      });
  }
}

export const reputationService = new ReputationService();
