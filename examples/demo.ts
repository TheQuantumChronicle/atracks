/**
 * Atracks Demo
 * Demonstrates the Private Agent Reputation System
 */

import { createAtracksClient } from '../src/sdk';

const ATRACKS_URL = process.env.ATRACKS_URL || 'http://localhost:3002';

async function demo() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏆 ATRACKS DEMO - Private Agent Reputation System       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  const client = createAtracksClient(ATRACKS_URL);

  // Check health
  console.log('📡 Checking Atracks server...');
  const healthy = await client.healthCheck();
  if (!healthy) {
    console.error('❌ Atracks server not available. Run: npm run dev');
    process.exit(1);
  }
  console.log('✅ Server healthy\n');

  // ============================================
  // STEP 1: Register an Agent
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('STEP 1: Register Agent');
  console.log('═══════════════════════════════════════\n');

  const agent = await client.registerAgent('AlphaTrader-001');
  console.log(`✅ Agent registered:`);
  console.log(`   ID: ${agent.agent_id}`);
  console.log(`   Name: ${agent.name}`);
  console.log(`   Created: ${new Date(agent.created_at).toISOString()}\n`);

  // ============================================
  // STEP 2: Log Some Trades (Encrypted via Inco FHE)
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('STEP 2: Log Trades (Encrypted Metrics)');
  console.log('═══════════════════════════════════════\n');

  const trades = [
    { pnl_usd: 150, execution_time_ms: 85 },
    { pnl_usd: -50, execution_time_ms: 120 },
    { pnl_usd: 200, execution_time_ms: 95 },
    { pnl_usd: 75, execution_time_ms: 110 },
    { pnl_usd: -25, execution_time_ms: 88 },
    { pnl_usd: 300, execution_time_ms: 92 },
    { pnl_usd: 125, execution_time_ms: 78 },
    { pnl_usd: -100, execution_time_ms: 105 },
    { pnl_usd: 180, execution_time_ms: 82 },
    { pnl_usd: 250, execution_time_ms: 90 },
  ];

  console.log(`📊 Logging ${trades.length} trades...`);
  for (const trade of trades) {
    const result = await client.logTrade({
      agent_id: agent.agent_id,
      pnl_usd: trade.pnl_usd,
      execution_time_ms: trade.execution_time_ms
    });
    console.log(`   Trade logged: PnL $${trade.pnl_usd > 0 ? '+' : ''}${trade.pnl_usd} | Total: ${result.total_trades} | Win Rate: ${result.win_rate}`);
  }
  console.log('');

  // Get metrics
  const metrics = await client.getMetrics(agent.agent_id);
  console.log('📈 Current Metrics (Private):');
  console.log(`   Total Trades: ${metrics.total_trades}`);
  console.log(`   Winning Trades: ${metrics.winning_trades}`);
  console.log(`   Win Rate: ${metrics.win_rate.toFixed(1)}%`);
  console.log(`   Total PnL: $${metrics.total_pnl_usd.toFixed(2)}`);
  console.log(`   Avg Execution: ${metrics.avg_execution_time_ms.toFixed(0)}ms\n`);

  // ============================================
  // STEP 3: Generate ZK Proofs (Noir)
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('STEP 3: Generate ZK Proofs (Noir)');
  console.log('═══════════════════════════════════════\n');

  // Prove win rate > 50%
  console.log('🔐 Generating proof: "Win rate > 50%"...');
  const winRateProof = await client.proveWinRate(agent.agent_id, 50);
  console.log(`   ✅ Proof generated: ${winRateProof.proof_id}`);
  console.log(`   Circuit: ${winRateProof.circuit_hash}`);
  console.log(`   Meets threshold: ${winRateProof.public_outputs.meets_threshold}`);
  console.log(`   Proof data: ${winRateProof.proof_data.slice(0, 32)}...`);
  console.log('');

  // Prove PnL in range
  console.log('🔐 Generating proof: "PnL between $500 and $2000"...');
  const pnlProof = await client.provePnL(agent.agent_id, 500, 2000);
  console.log(`   ✅ Proof generated: ${pnlProof.proof_id}`);
  console.log(`   PnL in range: ${pnlProof.public_outputs.pnl_in_range}`);
  console.log('');

  // Prove trade count
  console.log('🔐 Generating proof: "Completed at least 5 trades"...');
  const tradeCountProof = await client.proveTradeCount(agent.agent_id, 5);
  console.log(`   ✅ Proof generated: ${tradeCountProof.proof_id}`);
  console.log(`   Meets threshold: ${tradeCountProof.public_outputs.meets_threshold}`);
  console.log('');

  // Composite proof
  console.log('🔐 Generating composite proof...');
  const compositeProof = await client.proveComposite(agent.agent_id, {
    min_win_rate: 50,
    min_pnl: 500,
    min_trades: 5,
    min_sharpe: 0.5,
    max_drawdown: 2000
  });
  console.log(`   ✅ Proof generated: ${compositeProof.proof_id}`);
  console.log(`   All criteria met: ${compositeProof.public_outputs.all_criteria_met}`);
  console.log(`   Criteria results:`, compositeProof.public_outputs.criteria_results);
  console.log('');

  // ============================================
  // STEP 4: Verify Proofs
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('STEP 4: Verify Proofs');
  console.log('═══════════════════════════════════════\n');

  console.log('🔍 Verifying win rate proof...');
  const verification = await client.verifyProof(winRateProof.proof_id);
  console.log(`   Valid: ${verification.valid}`);
  console.log(`   Verification proof: ${verification.verification_proof.slice(0, 32)}...`);
  console.log('');

  // ============================================
  // STEP 5: Compute Verified Reputation (Arcium MPC)
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('STEP 5: Verified Reputation (Arcium MPC)');
  console.log('═══════════════════════════════════════\n');

  console.log('🏆 Computing verified reputation score...');
  const reputation = await client.verifyReputation(agent.agent_id);
  console.log(`   ✅ Reputation verified!`);
  console.log(`   Score: ${reputation.reputation_score}/100`);
  console.log(`   Tier: ${reputation.tier.toUpperCase()}`);
  console.log(`   Badges: ${reputation.badges.length}`);
  reputation.badges.forEach(badge => {
    console.log(`      🏅 ${badge.name}: ${badge.description}`);
  });
  console.log(`   MPC Attestation: ${reputation.mpc_attestation.slice(0, 32)}...`);
  console.log('');

  // ============================================
  // STEP 6: View Leaderboard
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('STEP 6: Leaderboard');
  console.log('═══════════════════════════════════════\n');

  const leaderboard = await client.getLeaderboard();
  console.log('🏆 Reputation Leaderboard:');
  leaderboard.forEach((entry, i) => {
    console.log(`   ${i + 1}. ${entry.name} | Tier: ${entry.tier.toUpperCase()} | Score: ${entry.score} | Badges: ${entry.badges_count}`);
  });
  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('═══════════════════════════════════════');
  console.log('DEMO COMPLETE');
  console.log('═══════════════════════════════════════\n');

  console.log('What we demonstrated:');
  console.log('');
  console.log('1. 📊 INCO FHE - Encrypted Metrics Storage');
  console.log('   Trade data is encrypted using Fully Homomorphic Encryption');
  console.log('   Metrics can be updated without decryption');
  console.log('');
  console.log('2. 🔐 NOIR ZK - Reputation Proofs');
  console.log('   Generated ZK proofs for:');
  console.log('   • Win rate threshold');
  console.log('   • PnL range');
  console.log('   • Trade count');
  console.log('   • Composite criteria');
  console.log('   All without revealing actual values!');
  console.log('');
  console.log('3. 🛡️ ARCIUM MPC - Verified Reputation');
  console.log('   Computed verified reputation score via MPC');
  console.log('   Score and tier are publicly verifiable');
  console.log('   Underlying data remains private');
  console.log('');
  console.log('🎉 Agents can now attract capital delegation');
  console.log('   without revealing their alpha!');
  console.log('');
}

// Run demo
demo().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});
