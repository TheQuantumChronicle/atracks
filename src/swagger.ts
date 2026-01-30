/**
 * Swagger/OpenAPI Configuration for ATRACKS API
 * https://atracks.xyz
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ATRACKS API',
      version: '1.0.0',
      description: `
# Private Agent Reputation System

ATRACKS enables trading agents to build verifiable reputation without exposing sensitive performance data.

## Privacy Stack

- **Inco FHE** - Fully Homomorphic Encryption for encrypted metrics storage
- **Noir ZK** - Zero-knowledge proofs for reputation attestations  
- **Arcium MPC** - Multi-party computation for verified scores

## Authentication

Trade logging requires an API key. The key is returned **once** when you register an agent - save it securely.

\`\`\`bash
# Include API key in request body for trade logging
curl -X POST https://atracks.xyz/trades \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "...", "api_key": "atk_...", "pnl_usd": 150}'
\`\`\`

## Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| Read (GET) | 100 req/min |
| Write (POST) | 20 req/min |

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`
- \`X-RateLimit-Remaining\`
- \`X-RateLimit-Reset\`
      `,
      contact: {
        name: 'ATRACKS',
        url: 'https://atracks.xyz'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://api.atracks.xyz',
        description: 'Production'
      }
    ],
    tags: [
      { name: 'Health', description: 'System health and status' },
      { name: 'Agents', description: 'Agent registration and management' },
      { name: 'Trades', description: 'Trade logging (requires API key)' },
      { name: 'Metrics', description: 'Performance metrics' },
      { name: 'Proofs', description: 'ZK proof generation and verification' },
      { name: 'Reputation', description: 'Verified reputation scores' },
      { name: 'Leaderboard', description: 'Public leaderboard' }
    ],
    components: {
      schemas: {
        Agent: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', format: 'uuid', description: 'Unique agent identifier' },
            name: { type: 'string', description: 'Agent display name' },
            public_key: { type: 'string', nullable: true, description: 'Optional public key' },
            created_at: { type: 'integer', description: 'Unix timestamp (ms)' },
            api_key: { type: 'string', description: 'API key (only returned on registration)' }
          }
        },
        PublicAgent: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            public_key: { type: 'string', nullable: true },
            created_at: { type: 'integer' }
          }
        },
        Metrics: {
          type: 'object',
          properties: {
            total_trades: { type: 'integer' },
            winning_trades: { type: 'integer' },
            total_pnl_usd: { type: 'number' },
            max_drawdown_bps: { type: 'integer', description: 'Basis points' },
            sharpe_ratio: { type: 'number' },
            avg_execution_time_ms: { type: 'number' },
            uptime_percentage: { type: 'number' },
            win_rate: { type: 'number', description: 'Percentage' },
            last_updated: { type: 'integer' }
          }
        },
        EncryptedMetrics: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', format: 'uuid' },
            encrypted_data: { type: 'string', description: 'FHE encrypted data' },
            encryption_proof: { type: 'string' },
            last_updated: { type: 'integer' },
            mode: { type: 'string', enum: ['live', 'computed'] }
          }
        },
        TradeLog: {
          type: 'object',
          required: ['agent_id', 'api_key', 'pnl_usd'],
          properties: {
            agent_id: { type: 'string', format: 'uuid' },
            api_key: { type: 'string', description: 'Agent API key for authentication' },
            token_in: { type: 'string', default: 'SOL' },
            token_out: { type: 'string', default: 'USDC' },
            amount_in: { type: 'number', default: 0 },
            amount_out: { type: 'number', default: 0 },
            pnl_usd: { type: 'number', description: 'Profit/loss in USD' },
            execution_time_ms: { type: 'integer', default: 100 }
          }
        },
        ReputationProof: {
          type: 'object',
          properties: {
            proof_id: { type: 'string', format: 'uuid' },
            agent_id: { type: 'string', format: 'uuid' },
            proof_type: { type: 'string', enum: ['win_rate', 'pnl_threshold', 'trade_count', 'sharpe_ratio', 'max_drawdown', 'uptime', 'composite'] },
            proof_data: { type: 'string' },
            verification_key: { type: 'string' },
            public_outputs: { type: 'object' },
            created_at: { type: 'integer' },
            expires_at: { type: 'integer' },
            circuit_hash: { type: 'string' }
          }
        },
        VerifiedReputation: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', format: 'uuid' },
            reputation_score: { type: 'integer', minimum: 0, maximum: 100 },
            tier: { type: 'string', enum: ['unverified', 'bronze', 'silver', 'gold', 'platinum', 'diamond'] },
            badges: { type: 'array', items: { $ref: '#/components/schemas/Badge' } },
            verification_proof: { type: 'string' },
            verified_at: { type: 'integer' },
            mpc_attestation: { type: 'string' }
          }
        },
        Badge: {
          type: 'object',
          properties: {
            badge_id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            earned_at: { type: 'integer' }
          }
        },
        LeaderboardEntry: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', format: 'uuid' },
            agent_name: { type: 'string' },
            reputation_score: { type: 'integer' },
            tier: { type: 'string' },
            badges: { type: 'array', items: { $ref: '#/components/schemas/Badge' } },
            total_trades: { type: 'integer' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
            timestamp: { type: 'integer' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            timestamp: { type: 'integer' }
          }
        }
      }
    }
  },
  apis: ['./src/server.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
