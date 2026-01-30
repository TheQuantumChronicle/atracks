/**
 * Encrypted Metrics Store
 * Uses PostgreSQL via Prisma with in-memory fallback
 * Inco FHE via CAP-402 for encrypted storage
 */

import { v4 as uuidv4 } from 'uuid';
import { cap402Client } from '../cap402/client';
import { hashApiKey, verifyApiKey } from '../utils/security';
import { 
  PerformanceMetrics, 
  EncryptedMetrics, 
  TradeRecord,
  Agent 
} from '../types';

// Extended agent type with hashed key for internal storage
interface StoredAgent extends Agent {
  api_key_hash?: string;
}

// In-memory fallback store (used when DB unavailable)
const agentStore = new Map<string, StoredAgent>();
const encryptedMetricsMap = new Map<string, EncryptedMetrics>();
const rawMetricsStore = new Map<string, PerformanceMetrics>();

// Database imports (optional - graceful fallback)
let prisma: any = null;
let useDatabase = false;

// Try to load Prisma
async function initDatabase() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.log('⚠️ DATABASE_URL not set - using in-memory storage');
      return;
    }
    
    // Import pg adapter for Prisma 7
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    useDatabase = true;
    console.log('✅ PostgreSQL connected - using persistent storage');
    
    // Load existing data from database into memory cache
    await loadFromDatabase();
  } catch (error: any) {
    console.log('⚠️ PostgreSQL unavailable - using in-memory storage');
    console.log(`   Reason: ${error?.message || String(error)}`);
    useDatabase = false;
  }
}

// Load existing agents and metrics from database
async function loadFromDatabase() {
  if (!prisma) return;
  
  try {
    const agents = await prisma.agent.findMany({
      include: { metrics: true }
    });
    
    for (const dbAgent of agents) {
      // Load agent into memory with hashed key
      const storedAgent: StoredAgent = {
        agent_id: dbAgent.id,
        name: dbAgent.name,
        api_key: '[HASHED]',
        api_key_hash: dbAgent.apiKey, // DB stores the hash
        public_key: dbAgent.publicKey || undefined,
        created_at: dbAgent.createdAt.getTime()
      };
      agentStore.set(storedAgent.agent_id, storedAgent);
      
      // Load metrics into memory
      if (dbAgent.metrics) {
        const metrics: PerformanceMetrics = {
          total_trades: dbAgent.metrics.totalTrades,
          winning_trades: dbAgent.metrics.winningTrades,
          total_pnl_usd: dbAgent.metrics.totalPnlUsd,
          max_drawdown_bps: dbAgent.metrics.maxDrawdownBps,
          sharpe_ratio: dbAgent.metrics.sharpeRatio,
          avg_execution_time_ms: dbAgent.metrics.avgExecutionTimeMs,
          uptime_percentage: dbAgent.metrics.uptimePercentage,
          last_updated: dbAgent.metrics.updatedAt.getTime()
        };
        rawMetricsStore.set(storedAgent.agent_id, metrics);
      }
    }
    
    console.log(`   Loaded ${agents.length} agents from database`);
  } catch (error: any) {
    console.log(`   Failed to load from database: ${error?.message}`);
  }
}

// Initialize on module load
initDatabase().catch((err) => {
  console.log('Database init error:', err);
});

class MetricsStoreService {
  
  /**
   * Register a new agent
   * Returns the agent with raw API key (only time it's visible)
   */
  async registerAgent(name: string, publicKey?: string): Promise<Agent> {
    const agentId = uuidv4();
    const rawApiKey = `atk_${uuidv4().replace(/-/g, '')}`;
    
    // Hash the API key for storage
    const apiKeyHash = await hashApiKey(rawApiKey);
    
    // Agent returned to user (with raw key - only shown once)
    const agent: Agent = {
      agent_id: agentId,
      name,
      created_at: Date.now(),
      public_key: publicKey,
      api_key: rawApiKey // Raw key returned to user once
    };

    // Agent stored internally (with hashed key)
    const storedAgent: StoredAgent = {
      ...agent,
      api_key: '[HASHED]', // Don't store raw key
      api_key_hash: apiKeyHash
    };

    // Try database first - store hashed key
    if (useDatabase && prisma) {
      try {
        await prisma.agent.create({
          data: {
            id: agentId,
            name,
            apiKey: apiKeyHash, // Store hash, not raw key
            publicKey,
            metrics: { create: {} }
          }
        });
        console.log(`✅ Agent ${name} saved to database (key hashed)`);
      } catch (error) {
        console.log('⚠️ Database write failed, using memory');
      }
    }

    // Always store in memory as cache/fallback (with hash)
    agentStore.set(agent.agent_id, storedAgent);
    
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
        mode: (encrypted.mode === 'live' ? 'live' : 'computed') as 'live' | 'computed'
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
    // Check memory first
    const memAgent = agentStore.get(agentId);
    if (memAgent) return memAgent;

    // Could add async DB lookup here if needed
    return undefined;
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(agentStore.values());
  }

  /**
   * Validate API key for an agent - returns true if valid
   * Uses bcrypt constant-time comparison to prevent timing attacks
   */
  async validateApiKey(agentId: string, apiKey: string): Promise<boolean> {
    const agent = agentStore.get(agentId);
    if (!agent || !agent.api_key_hash) return false;
    return verifyApiKey(apiKey, agent.api_key_hash);
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
      const drawdownBps = Math.abs(trade.pnl_usd * 100);
      metrics.max_drawdown_bps = Math.max(metrics.max_drawdown_bps, Math.round(drawdownBps));
    }

    metrics.last_updated = Date.now();

    // Save to database if available
    if (useDatabase && prisma) {
      try {
        await prisma.trade.create({
          data: {
            agentId: trade.agent_id,
            tokenIn: trade.token_in,
            tokenOut: trade.token_out,
            amountIn: trade.amount_in,
            amountOut: trade.amount_out,
            pnlUsd: trade.pnl_usd,
            executionTimeMs: trade.execution_time_ms
          }
        });
        
        await prisma.metrics.update({
          where: { agentId: trade.agent_id },
          data: {
            totalTrades: metrics.total_trades,
            winningTrades: metrics.winning_trades,
            totalPnlUsd: metrics.total_pnl_usd,
            avgExecutionTimeMs: metrics.avg_execution_time_ms,
            sharpeRatio: metrics.sharpe_ratio,
            maxDrawdownBps: metrics.max_drawdown_bps
          }
        });
      } catch (error) {
        console.log('⚠️ Database write failed for trade');
      }
    }

    // Update encrypted metrics via FHE
    try {
      const existingEncrypted = encryptedMetricsMap.get(trade.agent_id);
      if (existingEncrypted?.encrypted_data) {
        const result = await cap402Client.addEncryptedPnL(
          existingEncrypted.encrypted_data,
          trade.pnl_usd
        );
        
        encryptedMetricsMap.set(trade.agent_id, {
          ...existingEncrypted,
          encrypted_data: result.encrypted_result,
          encryption_proof: result.proof,
          last_updated: Date.now()
        });
      }
    } catch (error) {
      // FHE update failed - continue with local metrics
    }

    return metrics;
  }

  /**
   * Get raw metrics for an agent
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

  /**
   * Get aggregate stats for CAP-402 status
   */
  getStats(): { totalAgents: number; totalTrades: number; totalProofs: number; totalVerifications: number } {
    let totalTrades = 0;
    rawMetricsStore.forEach(metrics => {
      totalTrades += metrics.total_trades;
    });
    
    return {
      totalAgents: agentStore.size,
      totalTrades,
      totalProofs: 0, // Will be tracked by reputation service
      totalVerifications: 0
    };
  }

  /**
   * Check if database is connected
   */
  isDatabaseConnected(): boolean {
    return useDatabase;
  }
}

export const metricsStore = new MetricsStoreService();
