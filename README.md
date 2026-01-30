# Atracks - Private Agent Reputation System

**Built on CAP-402 Protocol** | Agents build verifiable reputation without revealing their alpha.

---

## What is Atracks?

Atracks enables autonomous agents to:
- **Build reputation** through encrypted performance metrics
- **Generate ZK proofs** of their track record (win rate, PnL, trade count)
- **Get verified scores** via MPC without exposing actual data
- **Attract capital delegation** while keeping strategies private

---

## Privacy Stack

| Technology | Role | Provider |
|------------|------|----------|
| **Inco FHE** | Encrypted metrics storage | Fully Homomorphic Encryption |
| **Noir ZK** | Reputation proofs | Zero-Knowledge Proofs |
| **Arcium MPC** | Verified scores | Multi-Party Computation |

---

## Quick Start

### 1. Install Dependencies

```bash
cd Atracks
npm install
```

### 2. Start CAP-402 Router (in CAP-402 directory)

```bash
cd ../CAP-402
npm start
```

### 3. Start Atracks Server

```bash
npm run dev
```

Server runs at `http://localhost:3002` (dev) or `https://api.atracks.xyz` (production)

### 4. Run Demo

```bash
npm run demo
```

---

## API Endpoints

### Agent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/register` | Register a new agent |
| GET | `/agents/:id` | Get agent details |
| GET | `/agents` | List all agents |

### Trade Logging (Encrypted via Inco FHE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trades` | Log a trade (updates encrypted metrics) |
| GET | `/metrics/:agent_id` | Get agent's private metrics |
| GET | `/metrics/:agent_id/encrypted` | Get encrypted metrics (shareable) |

### Reputation Proofs (Noir ZK)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/proofs/generate` | Generate a ZK proof |
| POST | `/proofs/verify` | Verify a proof |
| GET | `/proofs/:proof_id` | Get proof details |
| GET | `/agents/:id/proofs` | Get all proofs for an agent |

### Verified Reputation (Arcium MPC)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reputation/verify` | Compute verified reputation score |
| GET | `/reputation/:agent_id` | Get verified reputation |
| GET | `/leaderboard` | Public reputation leaderboard |

---

## Proof Types

| Type | Description | Public Inputs |
|------|-------------|---------------|
| `win_rate` | Prove win rate > X% | `threshold` |
| `pnl_threshold` | Prove PnL in range | `min_pnl`, `max_pnl` |
| `trade_count` | Prove trades > N | `min_trades` |
| `composite` | Multiple criteria | All of the above |

---

## SDK Usage

```typescript
import { createAtracksClient } from './src/sdk';

// Production (default)
const client = createAtracksClient();

// Or specify URL explicitly
// const client = createAtracksClient('https://api.atracks.xyz');

// Register agent
const agent = await client.registerAgent('MyTradingBot');

// Log trades
await client.logTrade({
  agent_id: agent.agent_id,
  pnl_usd: 150,
  execution_time_ms: 85
});

// Generate ZK proof: "My win rate is above 60%"
const proof = await client.proveWinRate(agent.agent_id, 60);

// Get verified reputation via Arcium MPC
const reputation = await client.verifyReputation(agent.agent_id);

console.log(`Score: ${reputation.reputation_score}/100`);
console.log(`Tier: ${reputation.tier}`);
console.log(`Badges: ${reputation.badges.length}`);
```

---

## Reputation Tiers

| Tier | Score | Requirements |
|------|-------|--------------|
| Diamond | 90+ | 500+ trades, 70%+ win rate |
| Platinum | 80-89 | 200+ trades, 65%+ win rate |
| Gold | 70-79 | 100+ trades, 60%+ win rate |
| Silver | 60-69 | 50+ trades, 55%+ win rate |
| Bronze | 50-59 | 10+ trades, 50%+ win rate |
| Unverified | <50 | Not yet verified |

---

## Badges

| Badge | Description |
|-------|-------------|
| First Trade | Completed first trade |
| Profitable | Achieved positive PnL |
| Consistent | Win rate above 60% |
| Veteran | Completed 100+ trades |
| Whale | PnL exceeds $10,000 |
| Speed Demon | Avg execution under 100ms |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ATRACKS                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Metrics    │  │   Proofs     │  │  Reputation  │       │
│  │   Store      │  │   Service    │  │   Service    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                    ┌──────▼───────┐                          │
│                    │  CAP-402     │                          │
│                    │  Client      │                          │
│                    └──────┬───────┘                          │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     CAP-402 ROUTER                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Inco FHE   │  │   Noir ZK    │  │  Arcium MPC  │       │
│  │  (Encrypt)   │  │  (Proofs)    │  │  (Verify)    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Example Flow

1. **Agent registers** with Atracks
2. **Logs trades** - metrics encrypted via Inco FHE
3. **Generates ZK proofs** - "I have 70%+ win rate" via Noir
4. **Requests verification** - Arcium MPC computes score
5. **Gets tier & badges** - publicly verifiable reputation
6. **Attracts capital** - without revealing strategy details

---

## Environment Variables

```bash
# CAP-402 Router URL
CAP402_ROUTER_URL=https://cap402.com

# Server Configuration
PORT=3002
HOST=0.0.0.0

# Environment
NODE_ENV=production

# PostgreSQL Database (Railway provides this automatically)
DATABASE_URL=postgresql://user:password@host:5432/atracks

# CORS Origins
CORS_ORIGINS=https://atracks.xyz,https://www.atracks.xyz,https://api.atracks.xyz
```

---

## Project Structure

```
Atracks/
├── src/
│   ├── types/           # TypeScript interfaces
│   │   └── index.ts
│   ├── cap402/          # CAP-402 client
│   │   └── client.ts
│   ├── services/        # Core services
│   │   ├── metrics-store.ts   # Encrypted metrics (Inco FHE)
│   │   └── reputation.ts      # Proofs & verification
│   ├── sdk/             # Client SDK
│   │   └── index.ts
│   └── server.ts        # Express API server
├── examples/
│   └── demo.ts          # Demo script
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

MIT

---

**Powered by CAP-402 Protocol** | Privacy-first agent infrastructure
