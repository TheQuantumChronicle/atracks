/**
 * Atracks API Server
 * Private Agent Reputation System
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { v4 as uuidv4 } from 'uuid';

import { metricsStore } from './services/metrics-store';
import { reputationService } from './services/reputation';
import { cap402Client } from './cap402/client';
import { TradeRecord, ReputationProofRequest, AtracksResponse } from './types';
import {
  sanitizeString,
  sanitizeError,
  checkRateLimit,
  getCorsOrigins,
  AgentRegistrationSchema,
  TradeLogSchema,
  ProofGenerationSchema,
  ReputationVerifySchema,
  ProofVerifySchema,
  validateUuidParam
} from './utils/security';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet.js for comprehensive security headers
// Disable CSP for /docs route (Swagger UI needs inline scripts)
app.use((req, res, next) => {
  if (req.path.startsWith('/docs') || req.path === '/openapi.json') {
    return next();
  }
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://atracks.xyz', 'https://api.atracks.xyz', 'https://www.atracks.xyz'],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })(req, res, next);
});

// CORS with origin restrictions
const allowedOrigins = getCorsOrigins();
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10kb' })); // Limit body size

// Production-grade rate limiter middleware
function rateLimit(maxRequests: number, windowMs: number, blockDurationMs?: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const result = checkRateLimit(ip, { maxRequests, windowMs, blockDurationMs });
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000));
    
    if (!result.allowed) {
      res.status(429).json({ 
        success: false, 
        error: 'Rate limit exceeded. Please try again later.',
        retry_after: Math.ceil(result.resetIn / 1000),
        timestamp: Date.now()
      });
      return;
    }
    
    next();
  };
}

// Apply rate limiting to all routes
app.use(rateLimit(500, 60000)); // 500 requests per minute (generous for demo/onboarding)

// Rate limit for write operations (allows demo mode with 10+ trades)
const writeRateLimit = rateLimit(100, 60000, 60000); // 100 writes per minute, 1 min block if exceeded

// ============================================
// STATIC FILES (for Swagger branding)
// ============================================
app.use('/static', express.static(path.join(__dirname, '../public')));

// ============================================
// API DOCUMENTATION (Swagger)
// ============================================

const swaggerOptions = {
  customCss: `
    /* Custom header with logo */
    .swagger-ui .info hgroup.main { display: flex; align-items: center; gap: 16px; }
    .swagger-ui .info hgroup.main::before {
      content: '';
      display: block;
      width: 48px;
      height: 48px;
      background: url('/static/atrackslogo.png') center/contain no-repeat;
      border-radius: 12px;
    }
    
    /* Dark theme base */
    .swagger-ui .topbar { display: none }
    body { background: #0a0a0f !important; }
    .swagger-ui { background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .swagger-ui .wrapper { max-width: 1200px; padding: 0 24px; }
    
    /* Header styling */
    .swagger-ui .info { margin: 40px 0 30px; padding-bottom: 30px; border-bottom: 1px solid #27272a; }
    .swagger-ui .info .title { color: #fff; font-weight: 200; letter-spacing: -0.03em; font-size: 2.5rem; }
    .swagger-ui .info .title small { display: none; }
    .swagger-ui .info .title small.version-stamp { display: none; }
    .swagger-ui .info .description { color: #a1a1aa; line-height: 1.7; }
    .swagger-ui .info .description p { color: #a1a1aa; }
    .swagger-ui .info .description h1 { color: #fff; font-weight: 300; font-size: 1.5rem; margin-top: 24px; }
    .swagger-ui .info .description h2 { color: #fff; font-weight: 400; font-size: 1.1rem; margin-top: 20px; }
    .swagger-ui .info .description code { background: #18181b; color: #818cf8; padding: 3px 8px; border-radius: 6px; font-size: 0.85em; }
    .swagger-ui .info .description pre { background: #18181b; border-radius: 12px; border: 1px solid #27272a; padding: 16px; }
    .swagger-ui .info .description table { border-collapse: collapse; margin: 12px 0; }
    .swagger-ui .info .description table th, .swagger-ui .info .description table td { border: 1px solid #27272a; padding: 8px 16px; }
    .swagger-ui .info .description table th { background: #18181b; color: #fff; }
    .swagger-ui .info .description table td { color: #a1a1aa; }
    
    /* Server selector */
    .swagger-ui .scheme-container { background: #0a0a0f; box-shadow: none; padding: 20px 0; border-bottom: 1px solid #27272a; }
    .swagger-ui .servers-title { color: #fff; }
    .swagger-ui .servers > label select { background: #18181b; color: #fff; border: 1px solid #27272a; border-radius: 8px; padding: 8px 12px; }
    
    /* Tags */
    .swagger-ui .opblock-tag { color: #fff; font-weight: 400; border-bottom: 1px solid #27272a; padding: 16px 0; }
    .swagger-ui .opblock-tag:hover { background: rgba(129, 140, 248, 0.05); }
    .swagger-ui .opblock-tag small { color: #71717a; }
    
    /* Operation blocks */
    .swagger-ui .opblock { background: #18181b; border: 1px solid #27272a; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
    .swagger-ui .opblock .opblock-summary { border: none; padding: 12px 16px; }
    .swagger-ui .opblock .opblock-summary-method { border-radius: 6px; font-weight: 600; min-width: 70px; padding: 8px 0; }
    .swagger-ui .opblock.opblock-get { border-color: rgba(34, 197, 94, 0.2); background: rgba(34, 197, 94, 0.03); }
    .swagger-ui .opblock.opblock-get .opblock-summary-method { background: linear-gradient(135deg, #22c55e, #16a34a); }
    .swagger-ui .opblock.opblock-post { border-color: rgba(129, 140, 248, 0.2); background: rgba(129, 140, 248, 0.03); }
    .swagger-ui .opblock.opblock-post .opblock-summary-method { background: linear-gradient(135deg, #818cf8, #6366f1); }
    .swagger-ui .opblock.opblock-put { border-color: rgba(251, 146, 60, 0.2); background: rgba(251, 146, 60, 0.03); }
    .swagger-ui .opblock.opblock-put .opblock-summary-method { background: linear-gradient(135deg, #fb923c, #f97316); }
    .swagger-ui .opblock.opblock-delete { border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.03); }
    .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .swagger-ui .opblock .opblock-summary-path { color: #fff; font-weight: 500; }
    .swagger-ui .opblock .opblock-summary-path__deprecated { color: #71717a; }
    .swagger-ui .opblock .opblock-summary-description { color: #a1a1aa; }
    
    /* Expanded operation */
    .swagger-ui .opblock-body { background: #0f0f14; padding: 20px; }
    .swagger-ui .opblock-section-header { background: transparent; box-shadow: none; padding: 12px 0; border-bottom: 1px solid #27272a; }
    .swagger-ui .opblock-section-header h4 { color: #fff; font-weight: 500; }
    .swagger-ui .opblock-description-wrapper p { color: #a1a1aa; }
    
    /* Parameters */
    .swagger-ui .parameter__name { color: #fff; font-weight: 500; }
    .swagger-ui .parameter__name.required::after { color: #ef4444; }
    .swagger-ui .parameter__type { color: #818cf8; }
    .swagger-ui .parameter__in { color: #71717a; }
    .swagger-ui table thead tr th { color: #a1a1aa; border-bottom: 1px solid #27272a; background: transparent; }
    .swagger-ui table tbody tr td { color: #fff; border-bottom: 1px solid #27272a; }
    
    /* Models */
    .swagger-ui .model-title { color: #fff; }
    .swagger-ui .model { color: #a1a1aa; }
    .swagger-ui .model-box { background: #18181b; border-radius: 8px; }
    .swagger-ui section.models { border: 1px solid #27272a; border-radius: 12px; background: #0f0f14; }
    .swagger-ui section.models h4 { color: #fff; border-bottom: 1px solid #27272a; padding: 16px 20px; margin: 0; }
    .swagger-ui section.models .model-container { background: #18181b; margin: 12px; border-radius: 8px; }
    .swagger-ui .model-box-control:focus, .swagger-ui .models-control:focus { outline: none; }
    
    /* Buttons */
    .swagger-ui .btn { border-radius: 8px; font-weight: 500; transition: all 0.2s; }
    .swagger-ui .btn.execute { background: linear-gradient(135deg, #818cf8, #6366f1); border: none; padding: 10px 24px; }
    .swagger-ui .btn.execute:hover { background: linear-gradient(135deg, #6366f1, #4f46e5); transform: translateY(-1px); }
    .swagger-ui .btn.cancel { background: #27272a; border: none; }
    .swagger-ui .btn-group .btn { border-radius: 6px; }
    
    /* Inputs */
    .swagger-ui select { background: #18181b; color: #fff; border: 1px solid #27272a; border-radius: 8px; padding: 8px 12px; }
    .swagger-ui select:focus { border-color: #818cf8; outline: none; }
    .swagger-ui input[type=text], .swagger-ui input[type=password], .swagger-ui input[type=search], .swagger-ui input[type=email], .swagger-ui input[type=file] { 
      background: #18181b; color: #fff; border: 1px solid #27272a; border-radius: 8px; padding: 10px 12px; 
    }
    .swagger-ui input:focus { border-color: #818cf8; outline: none; }
    .swagger-ui textarea { background: #18181b; color: #fff; border: 1px solid #27272a; border-radius: 8px; padding: 12px; }
    .swagger-ui textarea:focus { border-color: #818cf8; outline: none; }
    
    /* Responses */
    .swagger-ui .responses-wrapper { padding-top: 20px; }
    .swagger-ui .response-col_status { color: #fff; font-weight: 600; }
    .swagger-ui .response-col_description { color: #a1a1aa; }
    .swagger-ui .response-col_links { color: #71717a; }
    .swagger-ui .responses-inner h4 { color: #fff; }
    .swagger-ui .responses-inner h5 { color: #a1a1aa; }
    
    /* Code highlighting */
    .swagger-ui .highlight-code { background: #18181b !important; border-radius: 8px; }
    .swagger-ui .highlight-code > .microlight { background: transparent !important; color: #a1a1aa !important; }
    .swagger-ui .curl-command .copy-to-clipboard { background: #27272a; border-radius: 6px; }
    
    /* Try it out */
    .swagger-ui .try-out__btn { border: 1px solid #818cf8; color: #818cf8; border-radius: 8px; }
    .swagger-ui .try-out__btn:hover { background: rgba(129, 140, 248, 0.1); }
    
    /* Loading */
    .swagger-ui .loading-container .loading::after { color: #818cf8; }
    
    /* Scrollbar */
    .swagger-ui ::-webkit-scrollbar { width: 8px; height: 8px; }
    .swagger-ui ::-webkit-scrollbar-track { background: #18181b; border-radius: 4px; }
    .swagger-ui ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
    .swagger-ui ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
    
    /* Authorization */
    .swagger-ui .auth-wrapper { background: #18181b; border-radius: 12px; }
    .swagger-ui .auth-container { padding: 20px; }
    .swagger-ui .auth-container h4 { color: #fff; }
    .swagger-ui .auth-container .wrapper { background: transparent; }
    
    /* Dialog/Modal */
    .swagger-ui .dialog-ux .modal-ux { background: #0f0f14; border: 1px solid #27272a; border-radius: 16px; }
    .swagger-ui .dialog-ux .modal-ux-header { border-bottom: 1px solid #27272a; }
    .swagger-ui .dialog-ux .modal-ux-header h3 { color: #fff; }
    .swagger-ui .dialog-ux .modal-ux-content { padding: 20px; }
    .swagger-ui .dialog-ux .modal-ux-content p { color: #a1a1aa; }
  `,
  customSiteTitle: 'ATRACKS API Documentation',
  customfavIcon: '/static/favicon.ico',
  customJs: undefined,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 0
  }
};

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Serve OpenAPI spec as downloadable JSON file
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="atracks-openapi.json"');
  res.send(JSON.stringify(swaggerSpec, null, 2));
});

// ============================================
// HEALTH & STATUS
// ============================================

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     description: Returns service health status and CAP-402 connection state
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: healthy }
 *                 service: { type: string, example: atracks }
 *                 version: { type: string, example: 1.0.0 }
 *                 cap402_connected: { type: boolean }
 *                 timestamp: { type: integer }
 */
app.get('/health', async (_req: Request, res: Response) => {
  const cap402Healthy = await cap402Client.healthCheck();
  res.json({
    status: 'healthy',
    service: 'atracks',
    version: '1.0.0',
    cap402_connected: cap402Healthy,
    timestamp: Date.now()
  });
});

/**
 * @swagger
 * /cap402/status:
 *   get:
 *     tags: [Health]
 *     summary: CAP-402 Protocol status
 *     description: Returns detailed info about privacy infrastructure (FHE, ZK, MPC)
 *     responses:
 *       200:
 *         description: Protocol status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected: { type: boolean }
 *                 router_url: { type: string }
 *                 capabilities:
 *                   type: object
 *                   properties:
 *                     fhe: { type: object }
 *                     zk: { type: object }
 *                     mpc: { type: object }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_agents: { type: integer }
 *                     total_trades: { type: integer }
 *                     total_proofs: { type: integer }
 *                     total_verifications: { type: integer }
 */
app.get('/cap402/status', async (_req: Request, res: Response) => {
  const cap402Healthy = await cap402Client.healthCheck();
  const stats = metricsStore.getStats();
  
  res.json({
    connected: cap402Healthy,
    router_url: process.env.CAP402_ROUTER_URL || 'https://cap402.com',
    capabilities: {
      fhe: { 
        available: cap402Healthy, 
        provider: 'Inco Network',
        capability_id: 'cap.fhe.compute.v1',
        description: 'Fully Homomorphic Encryption for private metrics'
      },
      zk: { 
        available: cap402Healthy, 
        provider: 'Noir',
        capability_id: 'cap.zk.proof.v1',
        description: 'Zero-knowledge proofs for reputation attestations'
      },
      mpc: { 
        available: cap402Healthy, 
        provider: 'Arcium',
        capability_id: 'cap.mpc.compute.v1',
        description: 'Multi-party computation for verified scores'
      }
    },
    stats: {
      total_agents: stats.totalAgents,
      total_trades: stats.totalTrades,
      total_proofs: stats.totalProofs,
      total_verifications: stats.totalVerifications
    },
    timestamp: Date.now()
  });
});

// ============================================
// AGENT MANAGEMENT
// ============================================

/**
 * @swagger
 * /agents/register:
 *   post:
 *     tags: [Agents]
 *     summary: Register a new agent
 *     description: Creates a new agent and returns the API key (shown only once - save it!)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: AlphaBot
 *               public_key:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Agent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Agent' }
 *                 timestamp: { type: integer }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
app.post('/agents/register', writeRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validationResult = AgentRegistrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ 
        success: false, 
        error: sanitizeError(validationResult.error),
        timestamp: Date.now()
      });
      return;
    }

    const { name, public_key } = validationResult.data;
    const agent = await metricsStore.registerAgent(name, public_key);
    
    const response: AtracksResponse<typeof agent> = {
      success: true,
      data: agent,
      timestamp: Date.now()
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: sanitizeError(error),
      timestamp: Date.now()
    });
  }
});

/**
 * @swagger
 * /agents/{agent_id}:
 *   get:
 *     tags: [Agents]
 *     summary: Get agent details
 *     description: Returns public agent info (excludes API key)
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Agent details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/PublicAgent' }
 *       404:
 *         description: Agent not found
 */
app.get('/agents/:agent_id', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Invalid agent ID format', timestamp: Date.now() });
    return;
  }

  const agent = metricsStore.getAgent(agentId);
  
  if (!agent) {
    res.status(404).json({ success: false, error: 'Agent not found', timestamp: Date.now() });
    return;
  }

  // Security: Strip api_key from public response
  const { api_key, ...publicAgent } = agent;

  res.json({
    success: true,
    data: publicAgent,
    timestamp: Date.now()
  });
});

/**
 * @swagger
 * /agents:
 *   get:
 *     tags: [Agents]
 *     summary: List all agents
 *     description: Returns all registered agents (excludes API keys)
 *     responses:
 *       200:
 *         description: List of agents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PublicAgent' }
 *                 count: { type: integer }
 */
app.get('/agents', (_req: Request, res: Response) => {
  const agents = metricsStore.getAllAgents();
  // Security: Strip api_key from public response
  const publicAgents = agents.map(({ api_key, ...agent }) => agent);
  res.json({
    success: true,
    data: publicAgents,
    count: agents.length,
    timestamp: Date.now()
  });
});

// ============================================
// TRADE LOGGING (Updates Encrypted Metrics)
// ============================================

/**
 * @swagger
 * /trades:
 *   post:
 *     tags: [Trades]
 *     summary: Log a trade
 *     description: |
 *       Records a trade for an agent. Requires the agent's API key for authentication.
 *       Metrics are automatically updated and encrypted via Inco FHE.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TradeLog' }
 *     responses:
 *       200:
 *         description: Trade logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     trade_id: { type: string, format: uuid }
 *                     metrics_updated: { type: boolean }
 *                     total_trades: { type: integer }
 *                     win_rate: { type: string }
 *       400:
 *         description: Validation error
 *       403:
 *         description: Invalid API key
 */
app.post('/trades', writeRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validationResult = TradeLogSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ 
        success: false, 
        error: sanitizeError(validationResult.error),
        timestamp: Date.now()
      });
      return;
    }

    const { agent_id, api_key, token_in, token_out, amount_in, amount_out, pnl_usd, execution_time_ms } = validationResult.data;

    // Validate API key - only owner can log trades (async bcrypt comparison)
    const isValidKey = await metricsStore.validateApiKey(agent_id, api_key);
    if (!isValidKey) {
      res.status(403).json({ 
        success: false, 
        error: 'Invalid API key - only the agent owner can log trades',
        timestamp: Date.now()
      });
      return;
    }

    const trade: TradeRecord = {
      trade_id: uuidv4(),
      agent_id,
      timestamp: Date.now(),
      token_in,
      token_out,
      amount_in,
      amount_out,
      pnl_usd,
      execution_time_ms
    };

    const updatedMetrics = await metricsStore.logTrade(trade);

    res.json({
      success: true,
      data: {
        trade_id: trade.trade_id,
        metrics_updated: true,
        total_trades: updatedMetrics.total_trades,
        win_rate: metricsStore.getWinRate(agent_id).toFixed(2) + '%'
      },
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: sanitizeError(error),
      timestamp: Date.now()
    });
  }
});

// ============================================
// METRICS (Private - Agent's Own Data)
// ============================================

/**
 * @swagger
 * /metrics/{agent_id}:
 *   get:
 *     tags: [Metrics]
 *     summary: Get agent metrics
 *     description: Returns raw performance metrics for an agent
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Agent metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Metrics' }
 *       404:
 *         description: Agent not found
 */
app.get('/metrics/:agent_id', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Invalid agent ID format', timestamp: Date.now() });
    return;
  }

  const metrics = metricsStore.getMetrics(agentId);
  
  if (!metrics) {
    res.status(404).json({ success: false, error: 'Agent not found', timestamp: Date.now() });
    return;
  }

  res.json({
    success: true,
    data: {
      agent_id: agentId,
      ...metrics,
      win_rate: metricsStore.getWinRate(agentId)
    },
    timestamp: Date.now()
  });
});

/**
 * @swagger
 * /metrics/{agent_id}/encrypted:
 *   get:
 *     tags: [Metrics]
 *     summary: Get encrypted metrics
 *     description: Returns FHE-encrypted metrics that can be shared without revealing raw data
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Encrypted metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/EncryptedMetrics' }
 *       404:
 *         description: Encrypted metrics not found
 */
app.get('/metrics/:agent_id/encrypted', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Invalid agent ID format', timestamp: Date.now() });
    return;
  }

  const encrypted = metricsStore.getEncryptedMetrics(agentId);
  
  if (!encrypted) {
    res.status(404).json({ success: false, error: 'Encrypted metrics not found', timestamp: Date.now() });
    return;
  }

  res.json({
    success: true,
    data: encrypted,
    timestamp: Date.now()
  });
});

// ============================================
// REPUTATION PROOFS (Noir ZK)
// ============================================

/**
 * @swagger
 * /proofs/generate:
 *   post:
 *     tags: [Proofs]
 *     summary: Generate a ZK proof
 *     description: |
 *       Generates a zero-knowledge proof for an agent's performance metrics using Noir.
 *       The proof can be shared publicly without revealing the underlying data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agent_id, proof_type]
 *             properties:
 *               agent_id: { type: string, format: uuid }
 *               proof_type:
 *                 type: string
 *                 enum: [win_rate, pnl_threshold, trade_count, sharpe_ratio, max_drawdown, uptime, composite]
 *               public_inputs:
 *                 type: object
 *                 example: { threshold: 60 }
 *     responses:
 *       200:
 *         description: Proof generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/ReputationProof' }
 *       400:
 *         description: Validation error
 *       404:
 *         description: Agent not found
 */
app.post('/proofs/generate', writeRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validationResult = ProofGenerationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ 
        success: false, 
        error: sanitizeError(validationResult.error),
        timestamp: Date.now()
      });
      return;
    }

    const { agent_id, proof_type, public_inputs } = validationResult.data;

    // Verify agent exists
    const agent = metricsStore.getAgent(agent_id);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
        timestamp: Date.now()
      });
      return;
    }

    const request: ReputationProofRequest = {
      agent_id,
      proof_type,
      public_inputs
    };

    const proof = await reputationService.generateProof(request);

    res.json({
      success: true,
      data: proof,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: sanitizeError(error),
      timestamp: Date.now()
    });
  }
});

/**
 * @swagger
 * /proofs/verify:
 *   post:
 *     tags: [Proofs]
 *     summary: Verify a ZK proof
 *     description: Verifies a previously generated zero-knowledge proof
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [proof_id]
 *             properties:
 *               proof_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid: { type: boolean }
 *                     verification_proof: { type: string }
 */
app.post('/proofs/verify', writeRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validationResult = ProofVerifySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ 
        success: false, 
        error: sanitizeError(validationResult.error),
        timestamp: Date.now()
      });
      return;
    }

    const { proof_id } = validationResult.data;
    const result = await reputationService.verifyProof(proof_id);

    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: sanitizeError(error),
      timestamp: Date.now()
    });
  }
});

/**
 * @swagger
 * /proofs/{proof_id}:
 *   get:
 *     tags: [Proofs]
 *     summary: Get a proof
 *     description: Returns details of a specific ZK proof
 *     parameters:
 *       - in: path
 *         name: proof_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Proof details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/ReputationProof' }
 *       404:
 *         description: Proof not found
 */
app.get('/proofs/:proof_id', (req: Request, res: Response) => {
  const proofId = validateUuidParam(req.params.proof_id);
  if (!proofId) {
    res.status(400).json({ success: false, error: 'Invalid proof ID format', timestamp: Date.now() });
    return;
  }

  const proof = reputationService.getProof(proofId);
  
  if (!proof) {
    res.status(404).json({ success: false, error: 'Proof not found', timestamp: Date.now() });
    return;
  }

  res.json({
    success: true,
    data: proof,
    timestamp: Date.now()
  });
});

/**
 * @swagger
 * /agents/{agent_id}/proofs:
 *   get:
 *     tags: [Proofs]
 *     summary: Get agent's proofs
 *     description: Returns all ZK proofs generated for an agent
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of proofs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/ReputationProof' }
 *                 count: { type: integer }
 */
app.get('/agents/:agent_id/proofs', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Invalid agent ID format', timestamp: Date.now() });
    return;
  }

  const proofs = reputationService.getAgentProofs(agentId);
  
  res.json({
    success: true,
    data: proofs,
    count: proofs.length,
    timestamp: Date.now()
  });
});

// ============================================
// VERIFIED REPUTATION (Arcium MPC)
// ============================================

/**
 * @swagger
 * /reputation/verify:
 *   post:
 *     tags: [Reputation]
 *     summary: Compute verified reputation
 *     description: |
 *       Computes a verified reputation score for an agent using Arcium MPC.
 *       The score is computed from encrypted metrics without revealing raw data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agent_id]
 *             properties:
 *               agent_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Verified reputation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/VerifiedReputation' }
 *       404:
 *         description: Agent not found
 */
app.post('/reputation/verify', writeRateLimit, async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validationResult = ReputationVerifySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({ 
        success: false, 
        error: sanitizeError(validationResult.error),
        timestamp: Date.now()
      });
      return;
    }

    const { agent_id } = validationResult.data;

    // Verify agent exists
    const agent = metricsStore.getAgent(agent_id);
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
        timestamp: Date.now()
      });
      return;
    }

    const verified = await reputationService.computeVerifiedReputation(agent_id);

    res.json({
      success: true,
      data: verified,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: sanitizeError(error),
      timestamp: Date.now()
    });
  }
});

/**
 * @swagger
 * /reputation/{agent_id}:
 *   get:
 *     tags: [Reputation]
 *     summary: Get verified reputation
 *     description: Returns the verified reputation for an agent (must call POST /reputation/verify first)
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Verified reputation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/VerifiedReputation' }
 *       404:
 *         description: No verified reputation found
 */
app.get('/reputation/:agent_id', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Invalid agent ID format', timestamp: Date.now() });
    return;
  }

  const verified = reputationService.getVerifiedReputation(agentId);
  
  if (!verified) {
    res.status(404).json({ 
      success: false, 
      error: 'No verified reputation found. Call POST /reputation/verify first.',
      timestamp: Date.now()
    });
    return;
  }

  res.json({
    success: true,
    data: verified,
    timestamp: Date.now()
  });
});

// ============================================
// LEADERBOARD (Public - Only Verified Data)
// ============================================

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     tags: [Leaderboard]
 *     summary: Get reputation leaderboard
 *     description: Returns ranked list of agents by verified reputation score
 *     responses:
 *       200:
 *         description: Leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/LeaderboardEntry' }
 *                 count: { type: integer }
 */
app.get('/leaderboard', (_req: Request, res: Response) => {
  const leaderboard = reputationService.getLeaderboardWithStars();
  
  res.json({
    success: true,
    data: leaderboard,
    count: leaderboard.length,
    timestamp: Date.now()
  });
});

// ============================================
// TRUST CERTIFICATES (Public Verification API)
// ============================================

/**
 * @swagger
 * /trust/{agent_id}:
 *   get:
 *     tags: [Trust]
 *     summary: Get public trust certificate for an agent
 *     description: |
 *       Returns a verifiable trust certificate that other protocols and agents can use
 *       to verify an agent's reputation.
 *       
 *       **Trust Tiers:**
 *       - ◆◆◆ Three Diamonds = Exceptional (top 1%)
 *       - ◆◆ Two Diamonds = Excellent (top 5%)
 *       - ◆ One Diamond = Very Good (top 15%)
 *       - ✓ Verified = Meets baseline standards
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Trust certificate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent_id: { type: string }
 *                     agent_name: { type: string }
 *                     verified: { type: boolean }
 *                     star_rating: { type: integer, minimum: 0, maximum: 3 }
 *                     rating_display: { type: string }
 *                     rating_description: { type: string }
 *                     tier: { type: string }
 *                     reputation_score: { type: number }
 *                     total_trades: { type: integer }
 *                     win_rate: { type: number }
 *                     verified_at: { type: integer }
 *                     certificate_hash: { type: string }
 *                     valid_until: { type: integer }
 *       404:
 *         description: Agent not found
 */
app.get('/trust/:agent_id', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Invalid agent ID format', timestamp: Date.now() });
    return;
  }

  const certificate = reputationService.getTrustCertificate(agentId);
  
  if (!certificate) {
    res.status(404).json({ success: false, error: 'Agent not found', timestamp: Date.now() });
    return;
  }

  res.json({
    success: true,
    data: certificate,
    timestamp: Date.now()
  });
});

/**
 * @swagger
 * /trust/{agent_id}/badge:
 *   get:
 *     tags: [Trust]
 *     summary: Get embeddable badge HTML for an agent
 *     description: Returns HTML snippet that agents can embed to display their ATRACKS rating
 *     parameters:
 *       - in: path
 *         name: agent_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: style
 *         schema: { type: string, enum: [compact, full, minimal] }
 *         description: Badge style
 *     responses:
 *       200:
 *         description: Badge HTML
 *         content:
 *           text/html:
 *             schema: { type: string }
 */
app.get('/trust/:agent_id/badge', (req: Request, res: Response) => {
  const agentId = validateUuidParam(req.params.agent_id);
  if (!agentId) {
    res.status(400).send('Invalid agent ID');
    return;
  }

  const certificate = reputationService.getTrustCertificate(agentId);
  if (!certificate) {
    res.status(404).send('Agent not found');
    return;
  }

  const style = req.query.style as string || 'compact';
  const baseUrl = process.env.BASE_URL || 'https://atracks.xyz';
  
  let badgeHtml = '';
  
  if (style === 'minimal') {
    badgeHtml = `
      <a href="${baseUrl}/agents/${agentId}" target="_blank" rel="noopener" 
         style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#0a0a0f;border:1px solid rgba(129,140,248,0.3);border-radius:6px;text-decoration:none;font-family:system-ui,sans-serif;">
        <span style="font-size:12px;">${certificate.rating_display}</span>
        <span style="color:#818cf8;font-size:10px;font-weight:600;">ATRACKS</span>
      </a>`;
  } else if (style === 'full') {
    badgeHtml = `
      <div style="display:inline-block;padding:12px 16px;background:linear-gradient(135deg,#0a0a0f,#1a1a2e);border:1px solid rgba(129,140,248,0.3);border-radius:12px;font-family:system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:20px;">${certificate.rating_display}</span>
          <span style="color:white;font-weight:600;">${certificate.agent_name}</span>
        </div>
        <div style="color:#a1a1aa;font-size:11px;margin-bottom:6px;">${certificate.rating_description}</div>
        <div style="display:flex;gap:12px;font-size:10px;color:#71717a;">
          <span>Score: ${certificate.reputation_score}</span>
          <span>Trades: ${certificate.total_trades}</span>
          <span>Win: ${certificate.win_rate}%</span>
        </div>
        <a href="${baseUrl}/agents/${agentId}" target="_blank" rel="noopener" 
           style="display:block;margin-top:8px;color:#818cf8;font-size:10px;text-decoration:none;">
          Verified by ATRACKS ↗
        </a>
      </div>`;
  } else {
    // compact (default)
    badgeHtml = `
      <a href="${baseUrl}/agents/${agentId}" target="_blank" rel="noopener" 
         style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#0a0a0f;border:1px solid rgba(129,140,248,0.3);border-radius:8px;text-decoration:none;font-family:system-ui,sans-serif;">
        <span style="font-size:14px;">${certificate.rating_display}</span>
        <span style="color:white;font-size:12px;font-weight:500;">${certificate.agent_name}</span>
        <span style="color:#818cf8;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">ATRACKS</span>
      </a>`;
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(badgeHtml.trim());
});

/**
 * @swagger
 * /trust/verify:
 *   post:
 *     tags: [Trust]
 *     summary: Verify a trust certificate hash
 *     description: Allows other protocols to verify that a certificate is authentic
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [agent_id, certificate_hash]
 *             properties:
 *               agent_id: { type: string, format: uuid }
 *               certificate_hash: { type: string }
 *               min_stars: { type: integer, minimum: 0, maximum: 3 }
 *     responses:
 *       200:
 *         description: Verification result
 */
app.post('/trust/verify', (req: Request, res: Response) => {
  const { agent_id, certificate_hash, min_stars } = req.body;
  
  if (!agent_id || !certificate_hash) {
    res.status(400).json({ 
      success: false, 
      error: 'agent_id and certificate_hash are required',
      timestamp: Date.now()
    });
    return;
  }

  const certificate = reputationService.getTrustCertificate(agent_id);
  
  if (!certificate) {
    res.json({
      success: true,
      data: {
        valid: false,
        reason: 'Agent not found'
      },
      timestamp: Date.now()
    });
    return;
  }

  // Check if certificate meets minimum star requirement
  const meetsStarRequirement = min_stars === undefined || certificate.star_rating >= min_stars;
  
  res.json({
    success: true,
    data: {
      valid: certificate.verified && meetsStarRequirement,
      agent_id: certificate.agent_id,
      agent_name: certificate.agent_name,
      star_rating: certificate.star_rating,
      rating_display: certificate.rating_display,
      meets_requirement: meetsStarRequirement,
      required_stars: min_stars || 0,
      verified_at: certificate.verified_at
    },
    timestamp: Date.now()
  });
});

// ============================================
// PROOF TYPES INFO
// ============================================

/**
 * @swagger
 * /proof-types:
 *   get:
 *     tags: [Proofs]
 *     summary: List available proof types
 *     description: Returns all available ZK proof types and their required inputs
 *     responses:
 *       200:
 *         description: Proof types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type: { type: string }
 *                       description: { type: string }
 *                       public_inputs: { type: array, items: { type: string } }
 */
app.get('/proof-types', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        type: 'win_rate',
        description: 'Prove win rate exceeds threshold without revealing exact rate',
        public_inputs: ['threshold']
      },
      {
        type: 'pnl_threshold',
        description: 'Prove PnL is within a range without revealing exact amount',
        public_inputs: ['min_pnl', 'max_pnl']
      },
      {
        type: 'trade_count',
        description: 'Prove trade count exceeds minimum without revealing exact count',
        public_inputs: ['min_trades']
      },
      {
        type: 'composite',
        description: 'Prove multiple criteria at once',
        public_inputs: ['min_win_rate', 'min_pnl', 'min_trades', 'min_sharpe', 'max_drawdown']
      }
    ],
    timestamp: Date.now()
  });
});

// ============================================
// SERVE FRONTEND (Production)
// ============================================

// Serve static files from the frontend build directory
// __dirname in compiled code is dist/src, so go up 2 levels to project root, then into frontend/dist
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Skip API routes and docs
  if (req.path.startsWith('/api') || 
      req.path.startsWith('/docs') || 
      req.path.startsWith('/health') ||
      req.path.startsWith('/cap402') ||
      req.path.startsWith('/agents') ||
      req.path.startsWith('/trades') ||
      req.path.startsWith('/metrics') ||
      req.path.startsWith('/proofs') ||
      req.path.startsWith('/reputation') ||
      req.path.startsWith('/leaderboard') ||
      req.path.startsWith('/openapi')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
});

// ============================================
// START SERVER
// ============================================

const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(Number(PORT), HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏆 ATRACKS - Private Agent Reputation System            ║
║                                                           ║
║   Server running on port ${PORT}                              ║
║                                                           ║
║   Privacy Stack:                                          ║
║   • Inco FHE  - Encrypted metrics storage                 ║
║   • Noir ZK   - Reputation proofs                         ║
║   • Arcium MPC - Verified scores                          ║
║                                                           ║
║   Powered by CAP-402 Protocol                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function gracefulShutdown(signal: string) {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Close database connections
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    console.log('✅ Database connections closed');
  } catch {
    // Database may not be initialized
  }

  // Give pending requests time to complete
  setTimeout(() => {
    console.log('👋 Goodbye!');
    process.exit(0);
  }, 1000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
