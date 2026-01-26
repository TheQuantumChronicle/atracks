/**
 * Encrypted Metrics Store
 * Uses Inco FHE via CAP-402 for encrypted storage
 */

import { v4 as uuidv4 } from 'uuid';
import { cap402Client } from '../cap402/client';
import { 
  PerformanceMetrics, 
  EncryptedMetrics, 
  TradeRecord,
  Agent 
} from '../types';

// In-memory store (production would use encrypted database)
const agentStore = new Map<string, Agent>();
const encryptedMetricsMap = new Map<string, EncryptedMetrics>();
const rawMetricsStore = new Map<string, PerformanceMetrics>(); // For demo - encrypted in production

class MetricsStoreService {
  
  /**
   * Register a new agent
   */
  async registerAgent(name: string, publicKey?: string): Promise<Agent> {
    const agent: Agent = {
      agent_id: uuidv4(),
      name,
      created_at: Date.now(),
      public_key: publicKey
    };

    agentStore.set(agent.agent_id, agent);
    
    // Initialize empty metrics
    const initialMetrics: PerformanceMetrics = {
      total_trades: 0,
      winning_trades: 0,
      total_pnl_usd: 0,
      max_drawdown_bps: 0,
      sharpe_ratio: 0,
      avg_execution_time_ms: 0,
      uptime_percentage: 100,
      last_updated: Date.now()
    };

    rawMetricsStore.set(agent.agent_id, initialMetrics);

    // Encrypt and store metrics via Inco FHE
    try {
      console.log('📡 Calling CAP-402 FHE encryption...');
      const encrypted = await cap402Client.encryptMetrics({
        total_trades: 0,
        winning_trades: 0,
        total_pnl_usd: 0
      });
      console.log('📡 FHE response:', JSON.stringify(encrypted));

      encryptedMetricsMap.set(agent.agent_id, {
        agent_id: agent.agent_id,
        encrypted_data: encrypted.encrypted_data,
        encryption_proof: encrypted.encryption_proof,
        last_updated: Date.now(),
        mode: encrypted.mode as 'live' | 'simulation'
      });
      console.log(`✅ FHE encryption successful - mode: ${encrypted.mode}`);
    } catch (error: any) {
      console.log('⚠️  FHE encryption unavailable, using local storage');
      console.log(`   Error: ${error?.message || String(error)}`);
    }

    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return agentStore.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(agentStore.values());
  }

  /**
   * Log a trade and update metrics
   */
  async logTrade(trade: TradeRecord): Promise<PerformanceMetrics> {
    const metrics = rawMetricsStore.get(trade.agent_id);
    if (!metrics) {
      throw new Error(`Agent ${trade.agent_id} not found`);
    }

    // Update metrics
    metrics.total_trades += 1;
    if (trade.pnl_usd > 0) {
      metrics.winning_trades += 1;
    }
    metrics.total_pnl_usd += trade.pnl_usd;
    
    // Update average execution time
    metrics.avg_execution_time_ms = 
      (metrics.avg_execution_time_ms * (metrics.total_trades - 1) + trade.execution_time_ms) 
      / metrics.total_trades;

    // Calculate win rate for Sharpe approximation
    const winRate = metrics.winning_trades / metrics.total_trades;
    metrics.sharpe_ratio = winRate * 2; // Simplified Sharpe proxy

    // Track drawdown
    if (trade.pnl_usd < 0) {
      const drawdownBps = Math.abs(trade.pnl_usd / 100) * 100;
      if (drawdownBps > metrics.max_drawdown_bps) {
        metrics.max_drawdown_bps = drawdownBps;
      }
    }

    metrics.last_updated = Date.now();
    rawMetricsStore.set(trade.agent_id, metrics);

    // Update encrypted metrics via Inco FHE
    try {
      const encrypted = await cap402Client.encryptMetrics({
        total_trades: metrics.total_trades,
        winning_trades: metrics.winning_trades,
        total_pnl_usd: metrics.total_pnl_usd
      });

      encryptedMetricsMap.set(trade.agent_id, {
        agent_id: trade.agent_id,
        encrypted_data: encrypted.encrypted_data,
        encryption_proof: encrypted.encryption_proof,
        last_updated: Date.now(),
        mode: encrypted.mode as 'live' | 'simulation'
      });
    } catch (error) {
      console.log('⚠️  FHE update unavailable');
    }

    return metrics;
  }

  /**
   * Get raw metrics (only for the agent itself - private)
   */
  getMetrics(agentId: string): PerformanceMetrics | undefined {
    return rawMetricsStore.get(agentId);
  }

  /**
   * Get encrypted metrics (public - can be shared)
   */
  getEncryptedMetrics(agentId: string): EncryptedMetrics | undefined {
    return encryptedMetricsMap.get(agentId);
  }

  /**
   * Calculate win rate
   */
  getWinRate(agentId: string): number {
    const metrics = rawMetricsStore.get(agentId);
    if (!metrics || metrics.total_trades === 0) return 0;
    return (metrics.winning_trades / metrics.total_trades) * 100;
  }

  /**
   * Get leaderboard (only shows verified scores, not raw data)
   */
  getLeaderboard(): Array<{ agent_id: string; name: string; tier: string }> {
    const agents = Array.from(agentStore.values());
    return agents.map(agent => ({
      agent_id: agent.agent_id,
      name: agent.name,
      tier: 'unverified' // Tier comes from verified reputation
    }));
  }
}

export const metricsStore = new MetricsStoreService();
