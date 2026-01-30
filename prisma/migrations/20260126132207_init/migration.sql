-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "public_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "winning_trades" INTEGER NOT NULL DEFAULT 0,
    "total_pnl_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_drawdown_bps" INTEGER NOT NULL DEFAULT 0,
    "sharpe_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_execution_time_ms" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uptime_percentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "encrypted_data" TEXT,
    "encryption_proof" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "token_in" TEXT NOT NULL DEFAULT 'SOL',
    "token_out" TEXT NOT NULL DEFAULT 'USDC',
    "amount_in" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_out" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnl_usd" DOUBLE PRECISION NOT NULL,
    "execution_time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proofs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "proof_type" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "verification_key" TEXT NOT NULL,
    "public_inputs" JSONB NOT NULL,
    "public_outputs" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputations" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'unverified',
    "badges" JSONB NOT NULL DEFAULT '[]',
    "mpc_computation_id" TEXT,
    "mpc_attestation" TEXT,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reputations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_api_key_key" ON "agents"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "metrics_agent_id_key" ON "metrics"("agent_id");

-- CreateIndex
CREATE INDEX "trades_agent_id_idx" ON "trades"("agent_id");

-- CreateIndex
CREATE INDEX "proofs_agent_id_idx" ON "proofs"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "reputations_agent_id_key" ON "reputations"("agent_id");

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputations" ADD CONSTRAINT "reputations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
