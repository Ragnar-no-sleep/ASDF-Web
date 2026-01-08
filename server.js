const express = require('express');
const helmet = require('helmet');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

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

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
    skip: (req) => req.path === '/health', // Exclude health check from rate limiting
});
app.use(limiter);

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Scripts: self + CDNs for Solana and DOMPurify (with SRI validation)
            scriptSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            // API connections
            connectSrc: [
                "'self'",
                "https://*.solana.com",
                "https://asdforecast.onrender.com",
                "https://burns.onrender.com",
                "https://api.asdf-games.com",
                "https://asdf-web.onrender.com"
            ],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            // Block all plugins
            pluginTypes: [],
            // Allow embedding in Squarespace (alonisthe.dev)
            frameAncestors: ["'self'", "https://alonisthe.dev", "https://*.squarespace.com", "https://*.squarespace-cdn.com"],
            // Upgrade HTTP requests to HTTPS in production
            upgradeInsecureRequests: isProduction ? [] : null,
            // Block mixed content
            blockAllMixedContent: isProduction ? [] : null,
        },
    },
    // HSTS - Strict Transport Security (1 year, include subdomains, preload eligible)
    hsts: isProduction ? {
        maxAge: 31536000,           // 1 year in seconds
        includeSubDomains: true,
        preload: true
    } : false,
    crossOriginEmbedderPolicy: false,  // Required for Squarespace embedding
    // Disable X-Frame-Options to allow iframe embedding (CSP frame-ancestors handles this)
    frameguard: false,
    // Additional security headers
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    noSniff: true,
    xssFilter: true,
}));

// Compression
app.use(compression());

// Serve static files from public/ directory (icons, manifest)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true,
}));

// Serve .well-known for Android Asset Links (TWA)
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        }
    }
}));

// Serve specific static directories with restricted file types
// Block sensitive files (configs, env, etc.)
const blockedExtensions = ['.json', '.env', '.md', '.txt', '.yml', '.yaml', '.lock'];
const blockedFiles = ['package.json', 'package-lock.json', '.gitignore', '.env'];

app.use(express.static(__dirname, {
    maxAge: '1d',
    etag: true,
    index: false,  // Don't serve directory listings
    dotfiles: 'deny',  // Block dotfiles
    setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();

        // Block sensitive files
        if (blockedFiles.includes(fileName) ||
            (blockedExtensions.includes(ext) && !filePath.includes('.well-known'))) {
            res.status(403);
        }
    }
}));

// Explicit block for sensitive paths
app.use(['/api', '/node_modules', '/.git', '/.env'], (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Health check endpoint for UptimeRobot / monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
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

// Route /ignition to games.html
app.get('/ignition', (req, res) => {
    res.sendFile(path.join(__dirname, 'games.html'));
});

// Route /privacy to privacy.html (for Play Store requirement)
app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});

// Route /burns to burns.html (Hall of Flames)
app.get('/burns', (req, res) => {
    res.sendFile(path.join(__dirname, 'burns.html'));
});

// Route /asdforecast to forecast.html (Prediction Market)
app.get('/asdforecast', (req, res) => {
    res.sendFile(path.join(__dirname, 'forecast.html'));
});

// Route /holdex to holdex.html (Token Tracker)
app.get('/holdex', (req, res) => {
    res.sendFile(path.join(__dirname, 'holdex.html'));
});

// Route /v2 to index-new.html (New Landing Page Preview)
app.get('/v2', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-new.html'));
});

// Route /power to index-power.html (Power-focused Landing)
app.get('/power', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-power.html'));
});

// Route /m to index-marketing.html (Marketing-first Landing)
app.get('/m', (req, res) => {
    res.sendFile(path.join(__dirname, 'index-marketing.html'));
});

// Route /learn-v3 to learn-v3.html (New Learn Page)
app.get('/learn-v3', (req, res) => {
    res.sendFile(path.join(__dirname, 'learn-v3.html'));
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

app.listen(PORT, () => {
    console.log(`🔥 ASDF Web running on port ${PORT}`);
    console.log(`   http://localhost:${PORT}`);
});
