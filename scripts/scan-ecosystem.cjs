#!/usr/bin/env node
'use strict';

/**
 * ASDF-Web Ecosystem Scanner — SOLID Architecture
 *
 * Architecture : 3 passes
 *   Pass 1 — Route extraction : endpoint → fichier (api/routes/*.js)
 *   Pass 2 — File scan : chaque detector produit des Edge[]
 *   Pass 3 — Event cross-reference : emitters ↔ listeners par nom d'événement
 *
 * Liaison types (EdgeType) :
 *   import         — require() / import from (JS)
 *   script_include — <script src> (HTML)
 *   css_include    — <link href> (HTML)
 *   api_call       — fetch('/api/...') (frontend → backend)
 *   event_emit     — dispatchEvent(new CustomEvent('ns:name'))
 *   event_listen   — addEventListener('ns:name', ...)
 *
 * Usage: node scripts/scan-ecosystem.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'js', 'ecosystem-data.js');

// ============================================================
// CONSTANTS
// ============================================================
const EdgeType = Object.freeze({
  IMPORT: 'import',
  SCRIPT_INCLUDE: 'script_include',
  CSS_INCLUDE: 'css_include',
  API_CALL: 'api_call',
  EVENT_EMIT: 'event_emit',
  EVENT_LISTEN: 'event_listen',
});

const SKIP_DIRS = new Set([
  'node_modules',
  '_archive',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  'public',
  'ssr',
  'tests',
  'asdf-game-store',
  'scripts',
  'demos',
  'ASDF-Web',
]);

const SKIP_FILE_PATTERNS = [
  /\.test\.(js|ts)$/,
  /\.spec\.(js|ts)$/,
  /CLAUDE\.md$/,
  /package(-lock)?\.json$/,
  /yarn\.lock$/,
  /\.config\.(js|ts|cjs)$/,
  /ecosystem-data\.js$/,
  /ConfigService\.php$/,
  /GameService\.php$/,
  /LeaderboardService\.php$/,
];

// ============================================================
// UTILITY
// ============================================================

/** Strips JS line and block comments to reduce false positives. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
}

/** Normalises a windows/unix path to forward-slash relative. */
function toRel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

// ============================================================
// INTERFACE: IDetector
// Every detector MUST implement:
//   detect(content: string, rel: string) → RawEdge[]
//
// RawEdge: { type: EdgeType, rawTarget?: string, [extra]: any }
// PathResolver.resolve() turns rawTarget → canonical rel path.
// ============================================================

// ============================================================
// DETECTOR: ImportDetector  (S — single responsibility)
// Handles: require('./foo'), import from './foo', import('./dynamic')
// ============================================================
class ImportDetector {
  detect(content, _rel) {
    const edges = [];
    const src = stripComments(content);
    const patterns = [
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /from\s+['"]([^'"]+)['"]/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(src)) !== null) {
        if (m[1].startsWith('.')) {
          edges.push({ type: EdgeType.IMPORT, rawTarget: m[1], confidence: 0.95 });
        }
      }
    }
    return edges;
  }
}

// ============================================================
// DETECTOR: ScriptIncludeDetector  (S)
// Handles: <script src="...">, <link href="...css">
// ============================================================
class ScriptIncludeDetector {
  detect(content, _rel) {
    const edges = [];
    const scriptRe = /script[^>]+src=['"]([^'"#?]+)['"]/g;
    const cssRe = /link[^>]+href=['"]([^'"#?]+\.css)['"]/g;
    let m;
    while ((m = scriptRe.exec(content)) !== null) {
      const t = m[1];
      if (!t.startsWith('http') && !t.startsWith('//') && !t.includes('cdn')) {
        edges.push({ type: EdgeType.SCRIPT_INCLUDE, rawTarget: t, confidence: 1.0 });
      }
    }
    while ((m = cssRe.exec(content)) !== null) {
      const t = m[1];
      if (!t.startsWith('http') && !t.startsWith('//')) {
        edges.push({ type: EdgeType.CSS_INCLUDE, rawTarget: t, confidence: 1.0 });
      }
    }
    return edges;
  }
}

// ============================================================
// DETECTOR: ApiCallDetector  (S, D — depends on endpointMap abstraction)
// Handles: fetch('/api/...'), axios.METHOD('/api/...')
// Skips api/ files (they ARE the routes, they don't call themselves).
// ============================================================
class ApiCallDetector {
  /**
   * @param {Map<string, string>} endpointMap  '/api/path' → 'api/routes/foo.js'
   */
  constructor(endpointMap) {
    this.endpointMap = endpointMap;
  }

  detect(content, rel) {
    if (rel.startsWith('api/')) return [];

    const edges = [];
    const src = stripComments(content);
    const patterns = [
      /fetch\s*\(\s*['"`](\/api\/[^'"`\s?#]+)/g,
      /axios\s*\.\s*(?:get|post|put|delete|patch)\s*\(\s*['"`](\/api\/[^'"`\s?#]+)/g,
    ];

    for (const re of patterns) {
      let m;
      while ((m = re.exec(src)) !== null) {
        const endpoint = m[1];
        const target = this.endpointMap.get(endpoint) ?? null;
        edges.push({
          type: EdgeType.API_CALL,
          rawTarget: target,
          endpoint,
          confidence: target ? 0.88 : 0.7,
          unresolved: !target,
        });
      }
    }
    return edges;
  }
}

// ============================================================
// DETECTOR: EventDetector  (S)
// Handles: dispatchEvent(new CustomEvent('ns:name', ...))
//          addEventListener('ns:name', ...)
//          window.dispatchEvent / document.dispatchEvent
// ============================================================
class EventDetector {
  detect(content, _rel) {
    const edges = [];
    const src = stripComments(content);

    // Emit: dispatchEvent(new CustomEvent('ns:name', ...))
    // Matches window.dispatchEvent, document.dispatchEvent, bare dispatchEvent, el.dispatchEvent
    const emitRe = /\bdispatchEvent\s*\(\s*new\s+CustomEvent\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let m;
    while ((m = emitRe.exec(src)) !== null) {
      edges.push({ type: EdgeType.EVENT_EMIT, eventName: m[1], rawTarget: null, confidence: 0.88 });
    }

    // Listen: addEventListener('ns:name', ...) — any receiver
    // Filter to namespaced events only (ns:name pattern) to avoid 'click', 'load', etc.
    const listenRe = /\baddEventListener\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((m = listenRe.exec(src)) !== null) {
      const name = m[1];
      if (name.includes(':')) {
        edges.push({
          type: EdgeType.EVENT_LISTEN,
          eventName: name,
          rawTarget: null,
          confidence: 0.88,
        });
      }
    }

    return edges;
  }
}

// ============================================================
// RESOLVER: PathResolver  (S, D)
// Resolves rawTarget strings → canonical relative paths.
// ============================================================
class PathResolver {
  /** @param {string[]} knownRels — all scanned rel paths */
  constructor(knownRels) {
    this._byRel = new Map(knownRels.map(r => [r, r]));
    this._byBasename = new Map();
    for (const rel of knownRels) {
      const bn = path.basename(rel);
      if (!this._byBasename.has(bn)) this._byBasename.set(bn, rel);
    }
  }

  /**
   * @param {string|null} rawTarget
   * @param {string}      fromRel   — source file rel path (for relative resolution)
   * @returns {string|null}
   */
  resolve(rawTarget, fromRel) {
    if (!rawTarget) return null;

    // Already a known rel path (from api call detector)
    if (this._byRel.has(rawTarget)) return rawTarget;

    // URL-like: /js/foo.js
    if (rawTarget.startsWith('/')) {
      const stripped = rawTarget.replace(/^\//, '');
      return (
        this._byRel.get(stripped) ??
        this._byRel.get(stripped + '.js') ??
        this._byRel.get(stripped + '.css') ??
        null
      );
    }

    // Relative: ./foo or ../bar/baz
    if (rawTarget.startsWith('.')) {
      const fromDir = path.dirname(fromRel).replace(/\\/g, '/');
      const resolved = path.posix.normalize(fromDir + '/' + rawTarget);
      return (
        this._byRel.get(resolved) ??
        this._byRel.get(resolved + '.js') ??
        this._byRel.get(resolved + '.css') ??
        this._byRel.get(resolved + '/index.js') ??
        null
      );
    }

    // Basename fallback
    const bn = path.basename(rawTarget);
    return this._byBasename.get(bn) ?? this._byBasename.get(bn + '.js') ?? null;
  }
}

// ============================================================
// SCANNER: EcosystemScanner  (O — open for extension, closed for modification)
// Orchestrates passes; new detectors injected via constructor.
// ============================================================
class EcosystemScanner {
  /**
   * @param {object[]} detectors  Array of IDetector instances
   */
  constructor(detectors) {
    this.detectors = detectors;
  }

  /**
   * Scan a single file through all registered detectors.
   * @returns {RawEdge[]}
   */
  scanFile(content, rel) {
    const edges = [];
    for (const detector of this.detectors) {
      edges.push(...detector.detect(content, rel));
    }
    return edges;
  }
}

// ============================================================
// PASS 1 — ROUTE EXTRACTOR
// Reads api/routes/*.js to build: endpointMap Map<path, relFile>
// Also reads api/index.js to detect mount prefixes.
// ============================================================
function extractRoutes() {
  const endpointMap = new Map();

  // Detect mount prefixes from api/index.js
  const mountPrefixes = new Map(); // 'routes/ecosystem' → '/api'
  const indexPath = path.join(ROOT, 'api', 'index.js');
  if (fs.existsSync(indexPath)) {
    const src = stripComments(fs.readFileSync(indexPath, 'utf8'));
    const mountRe = /app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = mountRe.exec(src)) !== null) {
      const prefix = m[1];
      const modPath = m[2].replace(/^\.\//, '');
      mountPrefixes.set(modPath, prefix);
    }
  }

  // Scan all api/routes/*.js
  const routesDir = path.join(ROOT, 'api', 'routes');
  if (!fs.existsSync(routesDir)) return endpointMap;

  const routeFiles = fs
    .readdirSync(routesDir)
    .filter(f => f.endsWith('.js') && !f.includes('helpers'))
    .map(f => ({ file: f, rel: `api/routes/${f}` }));

  for (const { file, rel } of routeFiles) {
    const fullPath = path.join(routesDir, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }
    const src = stripComments(content);

    // Determine mount prefix for this file
    const modKey = `routes/${path.basename(file, '.js')}`;
    const prefix =
      mountPrefixes.get(modKey) ??
      mountPrefixes.get(`./routes/${path.basename(file, '.js')}`) ??
      '/api';

    const routeRe = /router\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = routeRe.exec(src)) !== null) {
      const fullEndpoint = prefix + m[2];
      if (!endpointMap.has(fullEndpoint)) {
        endpointMap.set(fullEndpoint, rel);
      }
    }
  }

  return endpointMap;
}

// ============================================================
// PASS 3 — EVENT CROSS-REFERENCE
// Matches EVENT_EMIT edges to files that listen to the same event name.
// Produces additional resolved edges in the output.
// ============================================================
function crossReferenceEvents(items) {
  // Build: eventName → files that listen
  const listeners = new Map(); // eventName → Set<relPath>
  for (const item of items) {
    for (const edge of item.edges) {
      if (edge.type === EdgeType.EVENT_LISTEN) {
        if (!listeners.has(edge.eventName)) listeners.set(edge.eventName, new Set());
        listeners.get(edge.eventName).add(item.name);
      }
    }
  }

  // For each emitter, add target info
  for (const item of items) {
    for (const edge of item.edges) {
      if (edge.type === EdgeType.EVENT_EMIT && edge.eventName) {
        const targets = listeners.get(edge.eventName);
        if (targets) {
          edge.targets = Array.from(targets).filter(t => t !== item.name);
        }
      }
    }
  }
}

// ============================================================
// EXISTING HELPERS (unchanged from previous version)
// ============================================================

function loadGitMetadata() {
  const map = new Map();
  try {
    const raw = execSync(
      'git log --pretty=format:"COMMIT|%H|%ai|%an" --name-only --diff-filter=ACMRT',
      { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 }
    ).toString();
    let current = null;
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('COMMIT|')) {
        const [, hash, date, author] = trimmed.split('|');
        const daysOld = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
        current = {
          hash: hash.slice(0, 7),
          date: date.slice(0, 10),
          author: author.trim(),
          daysOld,
        };
      } else if (current && !trimmed.startsWith('COMMIT')) {
        const rel = trimmed.replace(/\\/g, '/');
        if (!map.has(rel)) map.set(rel, current);
      }
    }
  } catch (e) {
    console.warn('  ⚠ git metadata unavailable:', e.message.slice(0, 60));
  }
  return map;
}

function loadCoverage() {
  const map = new Map();
  const coveragePath = path.join(ROOT, 'coverage', 'coverage-summary.json');
  try {
    const data = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    for (const [file, stats] of Object.entries(data)) {
      if (file === 'total') continue;
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      map.set(rel, {
        lines: Math.round(stats.lines?.pct ?? 0),
        branches: Math.round(stats.branches?.pct ?? 0),
        functions: Math.round(stats.functions?.pct ?? 0),
        statements: Math.round(stats.statements?.pct ?? 0),
      });
    }
    console.log(`  ✓ Coverage data loaded (${map.size} files)`);
  } catch {
    console.log('  · No coverage data (run: npm test -- --coverage)');
  }
  return map;
}

function detectCategory(rel) {
  const ext = path.extname(rel);
  if (ext === '.html') return 'pages';
  if (ext === '.css') return 'css';
  if (ext !== '.js') return null;
  if (/^js\/games\//.test(rel)) return 'games';
  if (/^api\//.test(rel)) return 'api';
  if (/^js\//.test(rel)) return 'js';
  return null;
}

function cyclomaticComplexity(content) {
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?\s*[^:?]/g,
  ];
  let complexity = 1;
  for (const p of patterns) {
    const m = content.match(p);
    if (m) complexity += m.length;
  }
  return complexity;
}

function godScore(loc, complexity, depCount, bytes) {
  let score = 0;
  if (loc > 5000) score += 4;
  else if (loc > 2000) score += 2;
  else if (loc > 1000) score += 1;
  if (complexity !== null) {
    if (complexity > 300) score += 3;
    else if (complexity > 150) score += 2;
    else if (complexity > 80) score += 1;
  }
  if (depCount > 20) score += 2;
  else if (depCount > 10) score += 1;
  if (bytes > 200_000) score += 2;
  else if (bytes > 80_000) score += 1;
  return score;
}

function detectStatus(rel, loc, complexity, depCount, bytes) {
  const score = godScore(loc, complexity, depCount, bytes);
  if (score >= 4) return 'god';
  if (/ignition|squarespace|legacy/i.test(rel)) return 'dev';
  if (/-demo\.html$/.test(rel)) return 'demo';
  return 'prod';
}

const KNOWN_DESC = {
  'index.html': 'Hub Majestic — landing page avec fire particles',
  'learn.html': 'Quick Start — intro interactive en 5 étapes',
  'deep-learn.html': 'Complete Guide — K-Score, philosophie, mécanique',
  'build.html': 'Builder Hub — Yggdrasil paths, formations, ecosystem',
  'games.html': 'Arcade Hub — collection de 9 mini-jeux',
  'burns.html': 'Hall of Flames — tracker de burns $asdfasdfa',
  'forecast.html': 'Predictions — interface de paris',
  'holdex.html': 'Token Tracker — intégration HolDex',
  'staking.html': 'Interface de staking $asdfasdfa',
  'me.html': 'Profil utilisateur',
  'analytics.html': 'Dashboard analytique',
  'ecosystem-map.html': "Command Center — carte interactive de l'écosystème",
  'js/ecosystem.js': 'ASDF Ecosystem Shell — nav drawer, themes, density',
  'js/hub-majestic.js': 'Landing page — particle effects et interactions',
  'api/services/helius.js': 'Helius RPC client (audit score: A-)',
  'api/index.js': 'Main Express server — GOD FILE',
  'js/games/engine.js': 'Main game engine — GOD FILE',
};

function autoDesc(rel) {
  if (KNOWN_DESC[rel]) return KNOWN_DESC[rel];
  const base = path.basename(rel, path.extname(rel));
  const words = base
    .split(/[-_.]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  if (rel.startsWith('api/routes/')) return `Route ${words}`;
  if (rel.startsWith('api/services/')) return `Service ${words}`;
  if (rel.endsWith('.html')) return `Page ${words}`;
  if (rel.endsWith('.css')) return `Styles ${words}`;
  if (rel.startsWith('js/games/')) return `Module jeu ${words}`;
  return `Module ${words}`;
}

function walk(dir, items = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return items;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const rel = toRel(fullPath);

    if (entry.isDirectory()) {
      walk(fullPath, items);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILE_PATTERNS.some(p => p.test(entry.name))) continue;

    const ext = path.extname(entry.name);
    if (!['.html', '.css', '.js'].includes(ext)) continue;

    const category = detectCategory(rel);
    if (!category) continue;

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    items.push({ rel, ext, content });
  }
  return items;
}

// ============================================================
// MAIN
// ============================================================
console.log('\n🔍 ASDF-Web Ecosystem Scanner — SOLID v3\n');

// --- Pass 1: Route extraction ---
console.log('  [Pass 1] Extracting API routes...');
const endpointMap = extractRoutes();
console.log(`  ✓ ${endpointMap.size} endpoints mapped`);

// --- Metadata ---
console.log('  Loading git metadata...');
const gitMeta = loadGitMetadata();
console.log(`  ✓ ${gitMeta.size} file histories loaded`);

console.log('  Loading test coverage...');
const coverage = loadCoverage();

// --- Pass 2: File scan ---
console.log('  [Pass 2] Walking filesystem...');
const rawFiles = walk(ROOT);

// Build resolver from known files
const resolver = new PathResolver(rawFiles.map(f => f.rel));

// Compose scanner with all detectors (O principle: add new detector here, nothing else changes)
const scanner = new EcosystemScanner([
  new ImportDetector(),
  new ScriptIncludeDetector(),
  new ApiCallDetector(endpointMap),
  new EventDetector(),
]);

const ORDER = { pages: 0, css: 1, js: 2, games: 3, api: 4 };

const items = rawFiles
  .sort((a, b) => (ORDER[detectCategory(a.rel)] ?? 5) - (ORDER[detectCategory(b.rel)] ?? 5))
  .map(({ rel, ext, content }) => {
    const category = detectCategory(rel);
    const bytes = Buffer.byteLength(content, 'utf8');
    const loc = content.split('\n').filter(l => l.trim()).length;
    const complexity = ext === '.js' ? cyclomaticComplexity(content) : null;

    // Scan through all detectors
    const rawEdges = scanner.scanFile(content, rel);

    // Resolve rawTarget → canonical rel path
    const edges = rawEdges.map(edge => ({
      ...edge,
      target: resolver.resolve(edge.rawTarget, rel),
    }));

    // Backward-compat: dependencies[] (resolved basenames, no dupes)
    const dependencies = [
      ...new Set(
        edges
          .filter(e => e.target && e.type !== EdgeType.API_CALL)
          .map(e => path.basename(e.target))
      ),
    ];

    // Unresolved: import/script edges that couldn't be resolved
    const knownRels = new Set(rawFiles.map(f => f.rel));
    const unresolvedDeps = edges
      .filter(
        e =>
          (e.type === EdgeType.IMPORT || e.type === EdgeType.SCRIPT_INCLUDE) &&
          !e.target &&
          e.rawTarget
      )
      .map(e => path.basename(e.rawTarget));

    // Unresolved API calls
    const unresolvedApiCalls = edges
      .filter(e => e.type === EdgeType.API_CALL && e.unresolved)
      .map(e => e.endpoint);

    const score = godScore(loc, complexity, dependencies.length, bytes);
    const status = detectStatus(rel, loc, complexity, dependencies.length, bytes);
    const git = gitMeta.get(rel) ?? null;
    const cov = coverage.get(rel) ?? null;

    return {
      name: rel,
      category,
      status,
      loc,
      bytes,
      complexity,
      godScore: score,
      description: autoDesc(rel),
      // Typed edges (rich)
      edges: edges.map(e => {
        // Strip internal rawTarget from output (already resolved to .target)
        const { rawTarget, ...rest } = e;
        return rest;
      }),
      // Backward compat
      dependencies,
      unresolvedDeps,
      unresolvedApiCalls,
      path: rel,
      git,
      coverage: cov,
    };
  });

// --- Pass 3: Event cross-reference ---
console.log('  [Pass 3] Cross-referencing events...');
crossReferenceEvents(items);

// Build flat ECOSYSTEM_LINKS for D3 graph
const links = [];
for (const item of items) {
  for (const edge of item.edges) {
    if (edge.target && edge.target !== item.name) {
      links.push({
        source: item.name,
        target: edge.target,
        type: edge.type,
        endpoint: edge.endpoint ?? null,
        eventName: edge.eventName ?? null,
        confidence: edge.confidence ?? 1.0,
      });
    }
    // EVENT_EMIT can have multiple targets (from cross-ref)
    if (edge.type === EdgeType.EVENT_EMIT && edge.targets) {
      for (const t of edge.targets) {
        links.push({
          source: item.name,
          target: t,
          type: EdgeType.EVENT_EMIT,
          eventName: edge.eventName,
          confidence: edge.confidence,
        });
      }
    }
  }
}

// ============================================================
// STATS
// ============================================================
const godFiles = items.filter(i => i.status === 'god');
const complexFiles = items.filter(i => i.godScore >= 2 && i.godScore < 4);
const staleFiles = items.filter(i => i.git && i.git.daysOld > 90);
const uncovered = items.filter(i => i.coverage && i.coverage.lines < 50);
const isolated = items.filter(i => i.edges.filter(e => e.target || e.targets?.length).length === 0);

// Count ALL detected edges (incl. unresolved), not just resolved links
const edgesByType = {};
for (const item of items) {
  for (const e of item.edges) {
    edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
  }
}
const resolvedEdgesByType = {};
for (const l of links) {
  resolvedEdgesByType[l.type] = (resolvedEdgesByType[l.type] ?? 0) + 1;
}

const unresolvedApiTotal = items.reduce((s, i) => s + (i.unresolvedApiCalls?.length ?? 0), 0);

const stats = {
  generated: new Date().toISOString(),
  total: items.length,
  pages: items.filter(i => i.category === 'pages').length,
  css: items.filter(i => i.category === 'css').length,
  js: items.filter(i => i.category === 'js').length,
  games: items.filter(i => i.category === 'games').length,
  api: items.filter(i => i.category === 'api').length,
  godFiles: godFiles.length,
  complexFiles: complexFiles.length,
  staleFiles: staleFiles.length,
  coveredFiles: coverage.size,
  uncoveredFiles: uncovered.length,
  isolatedFiles: isolated.length,
  totalLOC: items.reduce((s, i) => s + i.loc, 0),
  totalBytes: items.reduce((s, i) => s + i.bytes, 0),
  avgComplexity: Math.round(
    items.filter(i => i.complexity !== null).reduce((s, i) => s + i.complexity, 0) /
      Math.max(1, items.filter(i => i.complexity !== null).length)
  ),
  totalEdges: items.reduce((s, i) => s + i.edges.length, 0),
  resolvedLinks: links.length,
  edgesByType, // all detected (incl. unresolved)
  resolvedEdgesByType, // only edges with a resolved target
  endpointsMapped: endpointMap.size,
  unresolvedApiCalls: unresolvedApiTotal,
};

// ============================================================
// OUTPUT
// ============================================================
const output = `// AUTO-GENERATED — ne pas éditer manuellement
// Source: scripts/scan-ecosystem.cjs  (SOLID v3)
// Run: npm run scan
// Generated: ${stats.generated}
/* eslint-disable */
window.ECOSYSTEM_DATA  = ${JSON.stringify(items, null, 2)};
window.ECOSYSTEM_LINKS = ${JSON.stringify(links, null, 2)};
window.ECOSYSTEM_STATS = ${JSON.stringify(stats, null, 2)};
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, output, 'utf8');

const mb = (stats.totalBytes / 1024 / 1024).toFixed(2);
console.log(`\n✅ Scan complete — ${items.length} items`);
console.log(
  `   📄 ${stats.pages} pages · 🎨 ${stats.css} CSS · 📦 ${stats.js} JS · 🎮 ${stats.games} games · 🔌 ${stats.api} API`
);
console.log(`   📊 ${stats.totalLOC.toLocaleString()} LOC · ${mb} MB`);
console.log(`   🧠 complexité moy: ${stats.avgComplexity}`);
console.log(
  `   🔴 ${stats.godFiles} god files · 🟡 ${stats.complexFiles} complex · 🏝 ${stats.isolatedFiles} isolated`
);
console.log(`   🔗 ${stats.totalEdges} edges detected: ${JSON.stringify(edgesByType)}`);
console.log(`   ✓  ${stats.resolvedLinks} resolved links: ${JSON.stringify(resolvedEdgesByType)}`);
console.log(
  `   🔌 ${stats.endpointsMapped} API endpoints · ⚠ ${stats.unresolvedApiCalls} unresolved API calls`
);
console.log(`\n   → ${OUTPUT}\n`);
