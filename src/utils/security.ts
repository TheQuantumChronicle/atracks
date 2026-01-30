/**
 * Security Utilities
 * Production-grade security for API key hashing and validation
 */

import bcrypt from 'bcrypt';
import { z } from 'zod';

const SALT_ROUNDS = 12;

// ============================================
// API KEY HASHING
// ============================================

/**
 * Hash an API key for secure storage
 * The raw key is returned to the user once, then only the hash is stored
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Verify an API key against its hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

// ============================================
// INPUT VALIDATION SCHEMAS (Zod)
// ============================================

export const AgentRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Name can only contain letters, numbers, underscores, hyphens, and spaces'),
  public_key: z.string().max(200).optional()
});

export const TradeLogSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID format'),
  api_key: z.string().min(1, 'API key is required'),
  token_in: z.string().max(20).default('SOL'),
  token_out: z.string().max(20).default('USDC'),
  amount_in: z.number().min(0).max(1e12).default(0),
  amount_out: z.number().min(0).max(1e12).default(0),
  pnl_usd: z.number().min(-1e9).max(1e9),
  execution_time_ms: z.number().int().min(0).max(60000).default(100)
});

export const ProofGenerationSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID format'),
  proof_type: z.enum(['win_rate', 'pnl_threshold', 'trade_count', 'sharpe_ratio', 'max_drawdown', 'uptime', 'composite']),
  public_inputs: z.record(z.string(), z.number().min(-1e9).max(1e9)).default({})
});

export const ReputationVerifySchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID format')
});

export const ProofVerifySchema = z.object({
  proof_id: z.string().uuid('Invalid proof ID format')
});

// UUID validation for route params
export const UuidParamSchema = z.string().uuid('Invalid ID format');

/**
 * Validate a UUID route parameter
 * Returns null if invalid, the UUID if valid
 */
export function validateUuidParam(param: string | undefined): string | null {
  if (!param) return null;
  const result = UuidParamSchema.safeParse(param);
  return result.success ? result.data : null;
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize a string to prevent XSS and injection attacks
 */
export function sanitizeString(str: string | undefined, maxLength: number = 100): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/[<>\"\'&\x00-\x1f\x7f]/g, '') // Remove dangerous chars and control chars
    .trim();
}

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((e: z.ZodIssue) => e.message).join(', ');
  }
  if (error instanceof Error) {
    // Don't expose internal error details in production
    const safeMessages = [
      'Agent not found',
      'Invalid API key',
      'Proof not found',
      'Metrics not found',
      'Rate limit exceeded',
      'Proof has expired',
      'not found',
      'Invalid'
    ];
    if (safeMessages.some(msg => error.message.includes(msg))) {
      return error.message;
    }
    return 'An error occurred processing your request';
  }
  return 'An unexpected error occurred';
}

// ============================================
// RATE LIMITING (Production-grade)
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime && now > entry.blockUntil) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number; // How long to block after exceeding limit
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Check if blocked
  if (entry?.blocked && now < entry.blockUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.blockUntil - now
    };
  }

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false,
      blockUntil: 0
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    entry.blocked = true;
    entry.blockUntil = now + (config.blockDurationMs || config.windowMs);
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.blockUntil - now
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now
  };
}

// ============================================
// CORS CONFIGURATION
// ============================================

export function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS;
  if (!origins) {
    // Default origins - production domains only
    return [
      'https://atracks.xyz',
      'https://www.atracks.xyz',
      'https://api.atracks.xyz'
    ];
  }
  return origins.split(',').map(o => o.trim());
}
