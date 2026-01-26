/**
 * Atracks - Core Types
 * Private Agent Reputation System
 */

// Agent identity
export interface Agent {
  agent_id: string;
  name: string;
  created_at: number;
  public_key?: string;
}

// Performance metrics (stored encrypted via Inco FHE)
export interface PerformanceMetrics {
  total_trades: number;
  winning_trades: number;
  total_pnl_usd: number;
  max_drawdown_bps: number;
  sharpe_ratio: number;
  avg_execution_time_ms: number;
  uptime_percentage: number;
  last_updated: number;
}

// Encrypted metrics storage
export interface EncryptedMetrics {
  agent_id: string;
  encrypted_data: string;
  encryption_proof: string;
  last_updated: number;
  mode: 'live' | 'simulation';
}

// Reputation proof request
export interface ReputationProofRequest {
  agent_id: string;
  proof_type: ReputationProofType;
  public_inputs: Record<string, number>;
}

// Types of reputation proofs
export type ReputationProofType = 
  | 'win_rate'           // Prove win rate > X%
  | 'pnl_threshold'      // Prove PnL > $X
  | 'trade_count'        // Prove trades > N
  | 'sharpe_ratio'       // Prove Sharpe > X
  | 'max_drawdown'       // Prove drawdown < X bps
  | 'uptime'             // Prove uptime > X%
  | 'composite';         // Multiple criteria

// Generated reputation proof (via Noir ZK)
export interface ReputationProof {
  proof_id: string;
  agent_id: string;
  proof_type: ReputationProofType;
  proof_data: string;
  verification_key: string;
  public_outputs: Record<string, any>;
  created_at: number;
  expires_at: number;
  circuit_hash: string;
}

// Verified reputation score (via Arcium MPC)
export interface VerifiedReputation {
  agent_id: string;
  reputation_score: number;        // 0-100
  tier: ReputationTier;
  badges: ReputationBadge[];
  verification_proof: string;
  verified_at: number;
  mpc_attestation: string;
}

// Reputation tiers
export type ReputationTier = 
  | 'unverified'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond';

// Achievement badges
export interface ReputationBadge {
  badge_id: string;
  name: string;
  description: string;
  earned_at: number;
  proof_id?: string;
}

// Trade record for logging
export interface TradeRecord {
  trade_id: string;
  agent_id: string;
  timestamp: number;
  token_in: string;
  token_out: string;
  amount_in: number;
  amount_out: number;
  pnl_usd: number;
  execution_time_ms: number;
}

// API Response types
export interface AtracksResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// CAP-402 integration types
export interface CAP402InvokeRequest {
  capability_id: string;
  inputs: Record<string, any>;
  preferences?: {
    privacy_required?: boolean;
    max_cost?: number;
  };
}

export interface CAP402InvokeResponse {
  success: boolean;
  request_id: string;
  capability_id: string;
  outputs?: Record<string, any>;
  error?: string;
  metadata?: {
    execution: {
      executor: string;
      execution_time_ms: number;
      cost_actual: number;
    };
  };
}
