/**
 * Database Service
 * Handles all database operations using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { cap402Client } from '../cap402/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Types matching our existing interfaces
export interface AgentData {
  agent_id: string;
  name: string;
  api_key: string;
  public_key?: string;
  created_at: number;
}

export interface MetricsData {
  total_trades: number;
  winning_trades: number;
  total_pnl_usd: number;
  max_drawdown_bps: number;
  sharpe_ratio: number;
  avg_execution_time_ms: number;
  uptime_percentage: number;
  last_updated: number;
}

export interface TradeData {
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

class DatabaseService {
  
  // ============================================
  // AGENT OPERATIONS
  // ============================================

  async registerAgent(name: string, publicKey?: string): Promise<AgentData> {
    const apiKey = `atk_${uuidv4().replace(/-/g, '')}`;
    
    const agent = await prisma.agent.create({
      data: {
        name,
        apiKey,
        publicKey,
        metrics: {
          create: {} // Create empty metrics record
        }
      },
      include: { metrics: true }
    });

    // Try to encrypt initial metrics via CAP-402
    try {
      const encrypted = await cap402Client.encryptMetrics({
        total_trades: 0,
        winning_trades: 0,
        total_pnl_usd: 0
      });
      
      await prisma.metrics.update({
        where: { agentId: agent.id },
        data: {
          encryptedData: encrypted.encrypted_data,
          encryptionProof: encrypted.encryption_proof
        }
      });
    } catch (error) {
      console.log('⚠️ FHE encryption unavailable, using local storage');
    }

    return {
      agent_id: agent.id,
      name: agent.name,
      api_key: agent.apiKey,
      public_key: agent.publicKey || undefined,
      created_at: agent.createdAt.getTime()
    };
  }

  async getAgent(agentId: string): Promise<AgentData | null> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) return null;

    return {
      agent_id: agent.id,
      name: agent.name,
      api_key: agent.apiKey,
      public_key: agent.publicKey || undefined,
      created_at: agent.createdAt.getTime()
    };
  }

  async getAllAgents(): Promise<AgentData[]> {
    const agents = await prisma.agent.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return agents.map(agent => ({
      agent_id: agent.id,
      name: agent.name,
      api_key: agent.apiKey,
      public_key: agent.publicKey || undefined,
      created_at: agent.createdAt.getTime()
    }));
  }

  async validateApiKey(agentId: string, apiKey: string): Promise<boolean> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { apiKey: true }
    });
    return agent?.apiKey === apiKey;
  }

  // ============================================
  // METRICS OPERATIONS
  // ============================================

  async getMetrics(agentId: string): Promise<MetricsData | null> {
    const metrics = await prisma.metrics.findUnique({
      where: { agentId }
    });

    if (!metrics) return null;

    return {
      total_trades: metrics.totalTrades,
      winning_trades: metrics.winningTrades,
      total_pnl_usd: metrics.totalPnlUsd,
      max_drawdown_bps: metrics.maxDrawdownBps,
      sharpe_ratio: metrics.sharpeRatio,
      avg_execution_time_ms: metrics.avgExecutionTimeMs,
      uptime_percentage: metrics.uptimePercentage,
      last_updated: metrics.updatedAt.getTime()
    };
  }

  async getWinRate(agentId: string): Promise<number> {
    const metrics = await prisma.metrics.findUnique({
      where: { agentId },
      select: { totalTrades: true, winningTrades: true }
    });

    if (!metrics || metrics.totalTrades === 0) return 0;
    return (metrics.winningTrades / metrics.totalTrades) * 100;
  }

  // ============================================
  // TRADE OPERATIONS
  // ============================================

  async logTrade(trade: TradeData): Promise<MetricsData> {
    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: trade.agent_id },
      include: { metrics: true }
    });

    if (!agent || !agent.metrics) {
      throw new Error(`Agent ${trade.agent_id} not found`);
    }

    // Create trade record
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

    // Update metrics
    const currentMetrics = agent.metrics;
    const newTotalTrades = currentMetrics.totalTrades + 1;
    const newWinningTrades = trade.pnl_usd > 0 ? currentMetrics.winningTrades + 1 : currentMetrics.winningTrades;
    const newTotalPnl = currentMetrics.totalPnlUsd + trade.pnl_usd;
    const newAvgExecTime = (currentMetrics.avgExecutionTimeMs * currentMetrics.totalTrades + trade.execution_time_ms) / newTotalTrades;
    const winRate = newWinningTrades / newTotalTrades;
    const newSharpe = winRate * 2; // Simplified Sharpe proxy

    // Track drawdown
    let newMaxDrawdown = currentMetrics.maxDrawdownBps;
    if (trade.pnl_usd < 0) {
      const drawdownBps = Math.abs(trade.pnl_usd * 100);
      newMaxDrawdown = Math.max(newMaxDrawdown, Math.round(drawdownBps));
    }

    const updatedMetrics = await prisma.metrics.update({
      where: { agentId: trade.agent_id },
      data: {
        totalTrades: newTotalTrades,
        winningTrades: newWinningTrades,
        totalPnlUsd: newTotalPnl,
        avgExecutionTimeMs: newAvgExecTime,
        sharpeRatio: newSharpe,
        maxDrawdownBps: newMaxDrawdown
      }
    });

    return {
      total_trades: updatedMetrics.totalTrades,
      winning_trades: updatedMetrics.winningTrades,
      total_pnl_usd: updatedMetrics.totalPnlUsd,
      max_drawdown_bps: updatedMetrics.maxDrawdownBps,
      sharpe_ratio: updatedMetrics.sharpeRatio,
      avg_execution_time_ms: updatedMetrics.avgExecutionTimeMs,
      uptime_percentage: updatedMetrics.uptimePercentage,
      last_updated: updatedMetrics.updatedAt.getTime()
    };
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(): Promise<{ totalAgents: number; totalTrades: number; totalProofs: number; totalVerifications: number }> {
    const [agentCount, tradeCount, proofCount, reputationCount] = await Promise.all([
      prisma.agent.count(),
      prisma.trade.count(),
      prisma.proof.count(),
      prisma.reputation.count()
    ]);

    return {
      totalAgents: agentCount,
      totalTrades: tradeCount,
      totalProofs: proofCount,
      totalVerifications: reputationCount
    };
  }

  // ============================================
  // CONNECTION
  // ============================================

  async connect(): Promise<void> {
    await prisma.$connect();
    console.log('✅ Database connected');
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
    console.log('Database disconnected');
  }
}

export const databaseService = new DatabaseService();
export { prisma };
