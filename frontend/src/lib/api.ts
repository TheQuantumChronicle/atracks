import axios from 'axios';

// In production, use the deployed backend URL
// In development, Vite proxy handles /api -> localhost:3002
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Agent {
  agent_id: string;
  name: string;
  public_key?: string;
  created_at: number;
  api_key: string; // Secret key for owner authentication - only shown once on creation
}

// Agent without api_key for public display
export interface PublicAgent {
  agent_id: string;
  name: string;
  public_key?: string;
  created_at: number;
}

export interface AgentMetrics {
  agent_id: string;
  total_trades: number;
  winning_trades: number;
  total_pnl_usd: number;
  max_drawdown_bps: number;
  sharpe_ratio: number;
  avg_execution_time_ms: number;
  uptime_percentage: number;
  win_rate: number;
  last_updated: number;
}

export interface ReputationProof {
  proof_id: string;
  agent_id: string;
  proof_type: string;
  proof_data: string;
  verification_key: string;
  public_outputs: Record<string, string | number | boolean>;
  created_at: number;
  expires_at: number;
  circuit_hash: string;
}

export interface Badge {
  badge_id: string;
  name: string;
  description: string;
  earned_at: number;
}

export interface VerifiedReputation {
  agent_id: string;
  reputation_score: number;
  tier: string;
  badges: (string | Badge)[];
  verification_proof: string;
  verified_at: number;
  mpc_attestation: string;
}

export interface LeaderboardEntry {
  agent_id: string;
  agent_name: string;
  reputation_score: number;
  star_rating: number;
  rating_display: string;
  tier: string;
  badges: (string | Badge)[];
  total_trades: number;
  win_rate: number;
}

export interface TrustCertificate {
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
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: number;
}

export const atracksApi = {
  // Health
  async health() {
    const { data } = await api.get<{ status: string; cap402_connected: boolean; timestamp: number }>('/health');
    return data;
  },

  // Agents
  async getAgents() {
    const { data } = await api.get<ApiResponse<Agent[]> & { count: number }>('/agents');
    return data;
  },

  async getAgent(agentId: string) {
    const { data } = await api.get<ApiResponse<Agent>>(`/agents/${agentId}`);
    return data;
  },

  async registerAgent(name: string, publicKey?: string) {
    const { data } = await api.post<ApiResponse<Agent>>('/agents/register', { name, public_key: publicKey });
    return data;
  },

  // Trades
  async logTrade(trade: {
    agent_id: string;
    api_key: string; // Required for authentication
    token_in?: string;
    token_out?: string;
    amount_in?: number;
    amount_out?: number;
    pnl_usd: number;
    execution_time_ms?: number;
  }) {
    const { data } = await api.post<ApiResponse<{ trade_id: string; metrics_updated: boolean }>>('/trades', trade);
    return data;
  },

  // Metrics
  async getMetrics(agentId: string) {
    const { data } = await api.get<ApiResponse<AgentMetrics>>(`/metrics/${agentId}`);
    return data;
  },

  async getEncryptedMetrics(agentId: string) {
    const { data } = await api.get<ApiResponse<{ encrypted_data: string }>>(`/metrics/${agentId}/encrypted`);
    return data;
  },

  // Proofs
  async generateProof(agentId: string, proofType: string, publicInputs: Record<string, number>) {
    const { data } = await api.post<ApiResponse<ReputationProof>>('/proofs/generate', {
      agent_id: agentId,
      proof_type: proofType,
      public_inputs: publicInputs,
    });
    return data;
  },

  async verifyProof(proofId: string) {
    const { data } = await api.post<ApiResponse<{ verified: boolean }>>('/proofs/verify', { proof_id: proofId });
    return data;
  },

  async getProof(proofId: string) {
    const { data } = await api.get<ApiResponse<ReputationProof>>(`/proofs/${proofId}`);
    return data;
  },

  async getAgentProofs(agentId: string) {
    const { data } = await api.get<ApiResponse<ReputationProof[]> & { count: number }>(`/agents/${agentId}/proofs`);
    return data;
  },

  // Reputation
  async verifyReputation(agentId: string) {
    const { data } = await api.post<ApiResponse<VerifiedReputation>>('/reputation/verify', { agent_id: agentId });
    return data;
  },

  async getReputation(agentId: string) {
    const { data } = await api.get<ApiResponse<VerifiedReputation>>(`/reputation/${agentId}`);
    return data;
  },

  // Leaderboard
  async getLeaderboard() {
    const { data } = await api.get<ApiResponse<LeaderboardEntry[]> & { count: number }>('/leaderboard');
    return data;
  },

  // Proof Types
  async getProofTypes() {
    const { data } = await api.get<ApiResponse<{ type: string; description: string; public_inputs: string[] }[]>>('/proof-types');
    return data;
  },

  // Trust Certificates
  async getTrustCertificate(agentId: string) {
    const { data } = await api.get<ApiResponse<TrustCertificate>>(`/trust/${agentId}`);
    return data;
  },

  // CAP-402 Protocol Status
  async getCap402Status() {
    const { data } = await api.get<{
      connected: boolean;
      router_url: string;
      capabilities: {
        fhe: { available: boolean; provider: string; capability_id?: string; description?: string };
        zk: { available: boolean; provider: string; capability_id?: string; description?: string };
        mpc: { available: boolean; provider: string; capability_id?: string; description?: string };
      };
      stats: {
        total_agents: number;
        total_trades: number;
        total_proofs: number;
        total_verifications: number;
      };
    }>('/cap402/status');
    return data;
  },
};

export default api;
