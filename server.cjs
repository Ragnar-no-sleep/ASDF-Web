const express = require('express');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');
const promClient = require('prom-client');

// Structured logger — JSON in prod, pretty in dev
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino/file', options: { destination: 1 } },
  }),
});

// Prometheus metrics — default Node.js + custom HTTP histograms
promClient.collectDefaultMetrics({ prefix: 'asdf_' });
const httpRequestDuration = new promClient.Histogram({
  name: 'asdf_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});
const httpRequestsTotal = new promClient.Counter({
  name: 'asdf_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// SSR for /games archived 2026-05-12 (zero real SEO value — see _archive/ssr-dev-2026-04/README.md)
// Bot detection helper removed alongside; static games.html has full meta/og tags + canonical.

const app = express();

// JSON body parser for API routes
app.use(express.json({ limit: '10kb' }));
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Validate environment at startup
if (isProduction && !process.env.NODE_ENV) {
  logger.fatal('NODE_ENV not set in production');
  process.exit(1);
}
if (process.env.REDIS_URL && !/^rediss?:\/\//.test(process.env.REDIS_URL)) {
  logger.fatal('REDIS_URL format invalid');
  process.exit(1);
}

// HTTPS redirect middleware for production
if (isProduction) {
  app.use((req, res, next) => {
    // Check X-Forwarded-Proto header (set by reverse proxy)
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
  // Trust first proxy (Render, Heroku, etc.)
  app.set('trust proxy', 1);
}

// Prometheus HTTP metrics middleware
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status: res.statusCode };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
});

// Rate limiting - 400 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
  skip: req => req.path === '/health', // Exclude health check from rate limiting
});
app.use(limiter);

// Request logging — structured JSON with request ID
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: req => req.url === '/health' },
    genReqId: req => req.headers['x-request-id'] || crypto.randomUUID(),
  })
);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Scripts: self + CDNs for Solana Kit (esm.sh), DOMPurify, D3.js (all with SRI)
        scriptSrc: [
          "'self'",
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
          'https://esm.sh',
          'https://esm.run', // Added for esm.run scripts
        ],        // Inline event handlers (onclick etc) removed from all production pages
        // Remaining onclick in demo/lab are gated behind !isProduction check
        scriptSrcAttr: ["'none'"],
        // Disable bare style-src default — split into elem + attr below
        styleSrc: null,
        // Style tags: self + Google Fonts + FOUC anti-flash hashes (no unsafe-inline)
        // Phase 2 will harden styleSrcAttr (inline style="" attributes)
        styleSrcElem: [
          "'self'",
          'https://fonts.googleapis.com',
          // FOUC anti-flash hashes — one per unique background color
          "'sha256-g3zsE0Awsc4wfprhpe8YVZsqibeu2d4QukNDGbZkTHU='", // burns/forecast/ignition: html,body{background:#000!important}
          "'sha256-UHB+MUGZC1RRhZqst+ys56opHmhRowJfMs9fGojrpJc='", // holdex: html,body{background:#0a0a0f!important}
          "'sha256-VbU/423YJlS9/qfLYSz/0kkQJXKiizihJm3+NnDKEb4='", // staking: html,body{background:#06080f!important}
          "'sha256-0lYMvYgiXsuAzDHBwjoj5n8jQ+Cv8pZbw11OmC2nhqc='", // build/games: html{background:#020812!important}body{background:transparent!important}
          "'sha256-Eq449Zo+s3RjCHExwk5rAbkCNOYez04lqw5SYD5QKh4='", // index: html,body{background:#0d0906!important}
        ],
        styleSrcAttr: ["'none'"], // Phase 2: all inline style="" migrated to CSS classes + CSSOM
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        // API connections + CDN for source maps + Solana RPC + esm.sh + localhost dev
        // connectSrc aligned with js/config/endpoints.js (single source of truth)
        connectSrc: [
          "'self'",
          ...(isProduction ? [] : ['http://localhost:3000', 'http://localhost:3001']),
          'https://*.solana.com',
          'https://*.helius-rpc.com',
          'https://alonisthe.dev', // All sollama58 tools (burns, forecast, holdex, staking, ignition)
          'https://cdnjs.cloudflare.com',
          'https://api.github.com',
          'https://esm.sh',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        // pluginTypes removed - deprecated in CSP spec
        // Allow embedding in Squarespace (alonisthe.dev)
        frameAncestors: [
          "'self'",
          'https://alonisthe.dev',
          'https://*.squarespace.com',
          'https://*.squarespace-cdn.com',
        ],
        // Upgrade HTTP requests to HTTPS in production
        upgradeInsecureRequests: isProduction ? true : null,
      },
    },
    // HSTS - Strict Transport Security (1 year, include subdomains, preload eligible)
    hsts: isProduction
      ? {
          maxAge: 31536000, // 1 year in seconds
          includeSubDomains: true,
          preload: true,
        }
      : false,
    crossOriginEmbedderPolicy: false, // Required for Squarespace embedding
    // Disable X-Frame-Options to allow iframe embedding (CSP frame-ancestors handles this)
    frameguard: false,
    // Additional security headers
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
    // Note: Helmet 8.x does NOT support permissionsPolicy — set manually below
  })
);

// Permissions-Policy header (Helmet 8.x dropped built-in support)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(), usb=(), payment=(self)'
  );
  next();
});

// Compression
app.use(compression());

// Serve static files from public/ directory (icons, manifest)
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
  })
);

// Serve .well-known for Android Asset Links (TWA)
app.use(
  '/.well-known',
  express.static(path.join(__dirname, '.well-known'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      }
    },
  })
);

// Serve specific static directories with restricted file types
// Block sensitive files (configs, env, etc.)
const blockedExtensions = ['.json', '.env', '.md', '.txt', '.yml', '.yaml', '.lock'];
const blockedFiles = ['package.json', 'package-lock.json', '.gitignore', '.env'];

app.use(
  express.static(__dirname, {
    maxAge: '1d',
    etag: true,
    index: false, // Don't serve directory listings
    redirect: false, // Don't redirect /dir → /dir/ (lets route handlers win)
    dotfiles: 'deny', // Block dotfiles
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Block sensitive files
      if (
        blockedFiles.includes(fileName) ||
        (blockedExtensions.includes(ext) && !filePath.includes('.well-known'))
      ) {
        res.status(404);
      }
    },
  })
);

// Block sensitive paths
app.use(['/node_modules', '/.git', '/.env'], (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Block demo/lab directories in production
if (isProduction) {
  app.use(['/demo', '/lab'], (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Health check endpoint for UptimeRobot / monitoring
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Prometheus metrics endpoint — internal monitoring
app.get('/metrics', async (req, res) => {
  // In production, require API key to prevent scraping
  if (isProduction && req.headers['x-metrics-key'] !== process.env.METRICS_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// ============================================
// REDIS PROXY API
// ============================================

// Redis client (lazy initialization)
let redisClient = null;

function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', err => {
      logger.error({ err: err.message }, 'Redis connection error');
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return redisClient;
}

// Allowed Redis methods (whitelist for security)
const REDIS_ALLOWED_METHODS = [
  'GET',
  'SET',
  'DEL',
  'INCR',
  'INCRBY',
  'DECR',
  'DECRBY',
  'MGET',
  'MSET',
  'SETNX',
  'SETEX',
  'TTL',
  'EXPIRE',
  'EXISTS',
  'HGET',
  'HSET',
  'HDEL',
  'HGETALL',
  'HMGET',
  'HMSET',
  'HINCRBY',
  'HEXISTS',
  'HKEYS',
  'HVALS',
  'HLEN',
  'SADD',
  'SREM',
  'SMEMBERS',
  'SISMEMBER',
  'SCARD',
  'SUNION',
  'SINTER',
  'LPUSH',
  'RPUSH',
  'LPOP',
  'RPOP',
  'LRANGE',
  'LLEN',
  'LINDEX',
  'ZADD',
  'ZREM',
  'ZSCORE',
  'ZRANK',
  'ZREVRANK',
  'ZRANGE',
  'ZREVRANGE',
  'ZRANGEBYSCORE',
  'ZCOUNT',
  'ZCARD',
  'TYPE',
  'SCAN', // KEYS removed: O(N) blocking operation, use SCAN instead
];

// Redis proxy endpoint - INTERNAL USE ONLY
// Requires REDIS_API_KEY header for authentication
app.post('/api/redis', async (req, res) => {
  // Security: Require API key for Redis access
  const apiKey = req.headers['x-redis-api-key'];
  const expectedKey = process.env.REDIS_API_KEY;

  if (!expectedKey) {
    return res.status(403).json({ error: 'Redis API disabled without REDIS_API_KEY' });
  } else {
    // Timing-safe comparison — hash both to fixed 32-byte length, prevents length leaks
    const a = crypto
      .createHash('sha256')
      .update(String(apiKey || ''))
      .digest();
    const b = crypto.createHash('sha256').update(String(expectedKey)).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Invalid or missing X-Redis-API-Key header' });
    }
  }

  const client = getRedisClient();

  if (!client) {
    return res.status(503).json({
      error: 'Redis not configured',
      message: 'Set REDIS_URL environment variable',
    });
  }

  try {
    const { method, params = [] } = req.body;

    if (!method) {
      return res.status(400).json({ error: 'Method required' });
    }

    const upperMethod = method.toUpperCase();

    // Validate method against whitelist
    if (!REDIS_ALLOWED_METHODS.includes(upperMethod)) {
      return res.status(400).json({ error: `Method not allowed: ${method}` });
    }

    // Execute Redis command
    const result = await client[upperMethod.toLowerCase()](...params);
    res.json(result);
  } catch (error) {
    logger.error({ err: error.message }, 'Redis API error');
    res.status(500).json({
      error: 'Redis operation failed',
      ...(isProduction ? {} : { message: error.message }),
    });
  }
});

// Catch-all for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Route /story to learn.html (old homepage)
app.get('/story', (req, res) => {
  res.sendFile(path.join(__dirname, 'learn.html'));
});

// Route /widget - Dedicated embeddable endpoint (like sollama58 pattern)
// Used by Squarespace and other sites embedding ASDF content
app.get('/widget', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route /games — mini-games hub (static; SSR archived 2026-05-12, see _archive/ssr-dev-2026-04/)
app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, 'games.html'));
});

// Route /personality
app.get('/personality', (req, res) => {
  res.sendFile(path.join(__dirname, 'personality.html'));
});

// Route /ignition — airdrop platform (separate from games)
app.get('/ignition', (req, res) => {
  res.sendFile(path.join(__dirname, 'ignition.html'));
});

// Route /privacy to privacy.html (for Play Store requirement)
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

// Route /burns to burns.html (Hall of Flames)
app.get('/burns', (req, res) => {
  res.sendFile(path.join(__dirname, 'burns.html'));
});

// Route /forecast to forecast.html (Prediction Market)
app.get('/forecast', (req, res) => {
  res.sendFile(path.join(__dirname, 'forecast.html'));
});

// Backward compat redirect
app.get('/asdforecast', (req, res) => {
  res.redirect(301, '/forecast');
});

// Route /holdex to holdex.html (Token Tracker)
app.get('/holdex', (req, res) => {
  res.sendFile(path.join(__dirname, 'holdex.html'));
});

// Route /staking to staking.html (Token Lock Dashboard)
app.get('/staking', (req, res) => {
  res.sendFile(path.join(__dirname, 'staking.html'));
});

// Route /tools — redirect to hub (tools are integrated into landing page)
app.get('/tools', (req, res) => {
  res.redirect(301, '/');
});

// Route /build to build.html (Builder Hub)
app.get('/build', (req, res) => {
  res.sendFile(path.join(__dirname, 'build.html'));
});

// Route /quick-start to learn.html (5-step Quick Start Guide)
app.get('/quick-start', (req, res) => {
  res.sendFile(path.join(__dirname, 'learn.html'));
});

// Route /deep-learn to deep-learn.html (Complete Guide)
app.get('/deep-learn', (req, res) => {
  res.sendFile(path.join(__dirname, 'deep-learn.html'));
});

// Route /ecosystem-map — Dev dashboard (not in navbar, accessible by URL)
app.get('/ecosystem-map', (req, res) => {
  res.sendFile(path.join(__dirname, 'ecosystem-map.html'));
});

// Route /me to me.html (User profile & settings)
app.get('/me', (req, res) => {
  res.sendFile(path.join(__dirname, 'me.html'));
});

// Route /terrier to terrier.html (CYNIC companion chatbot)
app.get('/terrier', (req, res) => {
  res.sendFile(path.join(__dirname, 'terrier.html'));
});

// SPA fallback - serve index.html for unknown routes
app.get('*', (req, res) => {
  // If it's a file request that doesn't exist, 404
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  // Otherwise serve index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler — prevent stack trace leakage
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.error({ err: err.message, status }, 'Unhandled server error');
  res.status(status).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
});

// Start server unless imported for testing
const server =
  require.main === module
    ? app.listen(PORT, () => {
        logger.info({ port: PORT }, 'ASDF Web running');
      })
    : null;

// Export for supertest + shared logging
module.exports = { app, logger };

// Graceful shutdown — clean up Redis + close server
function gracefulShutdown(signal) {
  logger.info({ signal }, 'Graceful shutdown initiated');
  if (redisClient) {
    redisClient.quit().catch(() => {});
  }
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
  // Force exit after 10s if connections hang
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

