/**
 * Atracks SDK
 * Easy integration for agents to build and prove reputation
 */

import axios, { AxiosInstance } from 'axios';
import {
  Agent,
  PerformanceMetrics,
  ReputationProof,
  ReputationProofType,
  VerifiedReputation,
  TradeRecord,
  AtracksResponse
} from '../types';

export interface AtracksConfig {
  baseUrl?: string;
  timeout?: number;
}

export class AtracksClient {
  private client: AxiosInstance;

  constructor(config: AtracksConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseUrl || 'http://localhost:3002',
      timeout: config.timeout || 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ============================================
  // AGENT MANAGEMENT
  // ============================================

  /**
   * Register a new agent
   */
  async registerAgent(name: string, publicKey?: string): Promise<Agent> {
    const response = await this.client.post<AtracksResponse<Agent>>('/agents/register', {
      name,
      public_key: publicKey
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to register agent');
    }
    
    return response.data.data;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent> {
    const response = await this.client.get<AtracksResponse<Agent>>(`/agents/${agentId}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Agent not found');
    }
    
    return response.data.data;
  }

  // ============================================
  // TRADE LOGGING
  // ============================================

  /**
   * Log a trade (updates encrypted metrics)
   */
  async logTrade(trade: {
    agent_id: string;
    token_in?: string;
    token_out?: string;
    amount_in?: number;
    amount_out?: number;
    pnl_usd: number;
    execution_time_ms?: number;
  }): Promise<{ trade_id: string; total_trades: number; win_rate: string }> {
    const response = await this.client.post('/trades', trade);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to log trade');
    }
    
    return response.data.data;
  }

  /**
   * Log multiple trades
   */
  async logTrades(agentId: string, trades: Array<{ pnl_usd: number; execution_time_ms?: number }>): Promise<void> {
    for (const trade of trades) {
      await this.logTrade({
        agent_id: agentId,
        pnl_usd: trade.pnl_usd,
        execution_time_ms: trade.execution_time_ms || 100
      });
    }
  }

  // ============================================
  // METRICS
  // ============================================

  /**
   * Get agent's metrics (private)
   */
  async getMetrics(agentId: string): Promise<PerformanceMetrics & { win_rate: number }> {
    const response = await this.client.get(`/metrics/${agentId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get metrics');
    }
    
    return response.data.data;
  }

  // ============================================
  // REPUTATION PROOFS (Noir ZK)
  // ============================================

  /**
   * Generate a win rate proof
   * Proves: "My win rate is above X%" without revealing exact rate
   */
  async proveWinRate(agentId: string, threshold: number): Promise<ReputationProof> {
    return this.generateProof(agentId, 'win_rate', { threshold });
  }

  /**
   * Generate a PnL proof
   * Proves: "My PnL is between $X and $Y" without revealing exact amount
   */
  async provePnL(agentId: string, minPnL: number, maxPnL: number): Promise<ReputationProof> {
    return this.generateProof(agentId, 'pnl_threshold', { min_pnl: minPnL, max_pnl: maxPnL });
  }

  /**
   * Generate a trade count proof
   * Proves: "I have completed at least N trades" without revealing exact count
   */
  async proveTradeCount(agentId: string, minTrades: number): Promise<ReputationProof> {
    return this.generateProof(agentId, 'trade_count', { min_trades: minTrades });
  }

  /**
   * Generate a composite reputation proof
   * Proves multiple criteria at once
   */
  async proveComposite(
    agentId: string,
    criteria: {
      min_win_rate?: number;
      min_pnl?: number;
      min_trades?: number;
      min_sharpe?: number;
      max_drawdown?: number;
    }
  ): Promise<ReputationProof> {
    return this.generateProof(agentId, 'composite', criteria);
  }

  /**
   * Generic proof generation
   */
  private async generateProof(
    agentId: string,
    proofType: ReputationProofType,
    publicInputs: Record<string, number>
  ): Promise<ReputationProof> {
    const response = await this.client.post('/proofs/generate', {
      agent_id: agentId,
      proof_type: proofType,
      public_inputs: publicInputs
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate proof');
    }
    
    return response.data.data;
  }

  /**
   * Verify a proof
   */
  async verifyProof(proofId: string): Promise<{ valid: boolean; verification_proof: string }> {
    const response = await this.client.post('/proofs/verify', { proof_id: proofId });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to verify proof');
    }
    
    return response.data.data;
  }

  /**
   * Get a proof by ID
   */
  async getProof(proofId: string): Promise<ReputationProof> {
    const response = await this.client.get(`/proofs/${proofId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Proof not found');
    }
    
    return response.data.data;
  }

  // ============================================
  // VERIFIED REPUTATION (Arcium MPC)
  // ============================================

  /**
   * Compute verified reputation score
   * Uses Arcium MPC to verify encrypted metrics and proofs
   */
  async verifyReputation(agentId: string): Promise<VerifiedReputation> {
    const response = await this.client.post('/reputation/verify', { agent_id: agentId });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to verify reputation');
    }
    
    return response.data.data;
  }

  /**
   * Get verified reputation
   */
  async getReputation(agentId: string): Promise<VerifiedReputation> {
    const response = await this.client.get(`/reputation/${agentId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Reputation not found');
    }
    
    return response.data.data;
  }

  // ============================================
  // LEADERBOARD
  // ============================================

  /**
   * Get reputation leaderboard
   */
  async getLeaderboard(): Promise<Array<{
    agent_id: string;
    name: string;
    tier: string;
    score: number;
    badges_count: number;
  }>> {
    const response = await this.client.get('/leaderboard');
    return response.data.data || [];
  }

  // ============================================
  // HEALTH
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

/**
 * Create an Atracks client
 */
export function createAtracksClient(baseUrl?: string): AtracksClient {
  return new AtracksClient({ baseUrl });
}

export default AtracksClient;
