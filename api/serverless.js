/**
 * Vercel Serverless Function Wrapper for ASDF-Web Express Server
 *
 * This wraps the Express app for Vercel's serverless environment.
 * All requests are routed through this handler via vercel.json rewrites.
 */

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const compression = require('compression');

const app = express();

// =============================================================================
// BOT DETECTION
// =============================================================================

const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  'applebot',
  'petalbot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'developers.google.com',
  'redditbot',
  'snapchat',
];

function isBot(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (BOT_USER_AGENTS.some(bot => ua.includes(bot))) return true;
  if (ua.includes('headless') || ua.includes('phantom') || ua.includes('prerender')) return true;
  if (req.query._escaped_fragment_ !== undefined) return true;
  if (req.query.ssr === '1') return true;
  return false;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(express.json({ limit: '10kb' }));

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// Trust Vercel proxy
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://unpkg.com',
          'https://cdnjs.cloudflare.com',
          'https://esm.sh',
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://*.solana.com',
          'https://*.helius-rpc.com',
          'https://asdforecast.onrender.com',
          'https://burns.onrender.com',
          'https://api.asdf-games.com',
          'https://asdf-web.onrender.com',
          'https://asdf-api.onrender.com',
          'https://*.vercel.app',
          'https://cdnjs.cloudflare.com',
          'https://api.github.com',
          'https://esm.sh',
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: [
          "'self'",
          'https://alonisthe.dev',
          'https://*.squarespace.com',
          'https://*.squarespace-cdn.com',
        ],
        upgradeInsecureRequests: isProduction ? [] : null,
        blockAllMixedContent: isProduction ? [] : null,
      },
    },
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    crossOriginEmbedderPolicy: false,
    frameguard: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
  })
);

// Compression
app.use(compression());

// =============================================================================
// STATIC FILES
// =============================================================================

const rootDir = path.join(__dirname, '..');

// Serve public directory
app.use(
  express.static(path.join(rootDir, 'public'), {
    maxAge: '1d',
    etag: true,
  })
);

// Serve .well-known
app.use(
  '/.well-known',
  express.static(path.join(rootDir, '.well-known'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      }
    },
  })
);

// Block sensitive files
const blockedExtensions = ['.json', '.env', '.md', '.txt', '.yml', '.yaml', '.lock'];
const blockedFiles = ['package.json', 'package-lock.json', '.gitignore', '.env'];

app.use(
  express.static(rootDir, {
    maxAge: '1d',
    etag: true,
    index: false,
    dotfiles: 'deny',
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (
        blockedFiles.includes(fileName) ||
        (blockedExtensions.includes(ext) && !filePath.includes('.well-known'))
      ) {
        res.status(403);
      }
    },
  })
);

// Block sensitive paths
app.use(['/node_modules', '/.git', '/.env'], (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
  });
});

// API routes (Redis proxy disabled on Vercel - use Edge Config or external Redis)
app.post('/api/redis', (req, res) => {
  res.status(503).json({
    error: 'Redis API not available on Vercel serverless',
    message: 'Use Vercel Edge Config or external Redis service',
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Page routes
app.get('/story', (req, res) => res.sendFile(path.join(rootDir, 'learn.html')));
app.get('/widget', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(rootDir, 'privacy.html')));
app.get('/burns', (req, res) => res.sendFile(path.join(rootDir, 'burns.html')));
app.get('/forecast', (req, res) => res.sendFile(path.join(rootDir, 'forecast.html')));
app.get('/asdforecast', (req, res) => res.redirect(301, '/forecast'));
app.get('/holdex', (req, res) => res.sendFile(path.join(rootDir, 'holdex.html')));
app.get('/quick-start', (req, res) => res.sendFile(path.join(rootDir, 'learn.html')));
app.get('/deep-learn', (req, res) => res.sendFile(path.join(rootDir, 'deep-learn.html')));

// Games page (with SSR for bots)
async function serveGamesPage(req, res) {
  if (isBot(req)) {
    try {
      const { renderGamesPage } = require('../ssr/games.cjs');
      const html = await renderGamesPage();
      res.set('Content-Type', 'text/html');
      res.set('X-SSR', 'true');
      return res.send(html);
    } catch (err) {
      console.error('[SSR] Games page error:', err.message);
    }
  }
  res.sendFile(path.join(rootDir, 'games.html'));
}

app.get('/games', serveGamesPage);
app.get('/ignition', (req, res) => res.sendFile(path.join(rootDir, 'ignition.html')));

// SPA fallback
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Export for Vercel Serverless
module.exports = app;

// Alternative export for Edge (if needed)
module.exports.config = {
  api: {
    bodyParser: false, // We handle this with Express
  },
};
