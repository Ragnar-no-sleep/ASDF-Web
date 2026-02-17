#!/usr/bin/env node
'use strict';

/**
 * ASDF-Web Ecosystem Scanner
 * Génère js/ecosystem-data.js à partir du vrai contenu du repo.
 * Usage: node scripts/scan-ecosystem.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'js', 'ecosystem-data.js');

// ============================================================
// SKIP LISTS
// ============================================================
const SKIP_DIRS = new Set([
  'node_modules', '_archive', '.git', 'dist', 'coverage',
  'playwright-report', 'test-results', 'public', 'ssr',
  'tests', 'asdf-game-store', 'scripts', 'demos',
  'next-env.d.ts', 'ASDF-Web',
]);

const SKIP_FILE_PATTERNS = [
  /\.test\.(js|ts)$/,
  /\.spec\.(js|ts)$/,
  /CLAUDE\.md$/,
  /package(-lock)?\.json$/,
  /yarn\.lock$/,
  /\.config\.(js|ts|cjs)$/,
  /ecosystem-data\.js$/,   // avoid scanning self
  /ConfigService\.php$/,
  /GameService\.php$/,
  /LeaderboardService\.php$/,
];

// ============================================================
// CATEGORY DETECTION
// ============================================================
function detectCategory(rel) {
  const ext = path.extname(rel);

  if (ext === '.html') return 'pages';
  if (ext === '.css') return 'css';

  if (!ext || ext !== '.js') return null;

  if (/^js\/games\//.test(rel)) return 'games';
  if (/^api\//.test(rel)) return 'api';
  if (/^js\//.test(rel)) return 'js';

  return null; // root-level JS, server files → skip
}

// ============================================================
// STATUS DETECTION
// ============================================================
function detectStatus(rel, loc) {
  if (loc > 5000) return 'god';
  if (/ignition|squarespace|legacy/i.test(rel)) return 'dev';
  if (/-demo\.html$/.test(rel)) return 'demo';
  return 'prod';
}

// ============================================================
// DESCRIPTION GENERATOR
// ============================================================
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
  'ecosystem-map.html': 'Command Center — carte interactive de l\'écosystème',
  'engine.js': 'Main game engine — GOD FILE (refactoring needed)',
  'api/index.js': 'Main Express server — GOD FILE (refactoring needed)',
  'js/ecosystem.js': 'ASDF Ecosystem Shell — nav drawer, themes, density',
  'js/hub-majestic.js': 'Landing page — particle effects et interactions',
  'api/services/helius.js': 'Helius RPC client (audit score: A-)',
};

function autoDesc(rel) {
  if (KNOWN_DESC[rel]) return KNOWN_DESC[rel];
  const base = path.basename(rel, path.extname(rel));
  const words = base
    .split(/[-_.]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  if (rel.startsWith('api/routes/')) return `Route ${words} — endpoint handler`;
  if (rel.startsWith('api/services/')) return `Service ${words}`;
  if (rel.endsWith('.html')) return `Page ${words}`;
  if (rel.endsWith('.css')) return `Styles ${words}`;
  if (rel.startsWith('js/games/')) return `Module jeu ${words}`;
  return `Module ${words}`;
}

// ============================================================
// DEPENDENCY PARSER
// ============================================================
function parseDeps(content, ext) {
  const deps = new Set();

  if (ext === '.js') {
    // require('./foo') or require('../services/bar')
    const re = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (m[1].startsWith('.')) deps.add(path.basename(m[1]));
    }
    // import ... from './foo'
    const re2 = /from\s+['"]([^'"]+)['"]/g;
    while ((m = re2.exec(content)) !== null) {
      if (m[1].startsWith('.')) deps.add(path.basename(m[1]));
    }
  }

  if (ext === '.html') {
    // <script src="...">
    const re = /script[^>]+src=['"]([^'"#?]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const d = m[1];
      if (!d.startsWith('http') && !d.startsWith('//') && !d.includes('cdn')) {
        deps.add(path.basename(d));
      }
    }
    // <link href="...css">
    const re2 = /link[^>]+href=['"]([^'"#?]+\.css)['"]/g;
    while ((m = re2.exec(content)) !== null) {
      const d = m[1];
      if (!d.startsWith('http') && !d.startsWith('//')) {
        deps.add(path.basename(d));
      }
    }
  }

  return Array.from(deps);
}

// ============================================================
// DIRECTORY WALKER
// ============================================================
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
    const rel = path.relative(ROOT, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      walk(fullPath, items);
      continue;
    }

    if (!entry.isFile()) continue;

    // Skip by pattern
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

    const loc = content.split('\n').filter(l => l.trim()).length;
    const status = detectStatus(rel, loc);
    const deps = parseDeps(content, ext);

    items.push({
      name: rel,
      category,
      status,
      loc,
      description: autoDesc(rel),
      dependencies: deps,
      path: rel,
    });
  }

  return items;
}

// ============================================================
// MAIN
// ============================================================
const items = walk(ROOT);

const ORDER = { pages: 0, css: 1, js: 2, games: 3, api: 4 };
items.sort((a, b) => (ORDER[a.category] ?? 5) - (ORDER[b.category] ?? 5));

const stats = {
  generated: new Date().toISOString(),
  total: items.length,
  pages: items.filter(i => i.category === 'pages').length,
  css: items.filter(i => i.category === 'css').length,
  js: items.filter(i => i.category === 'js').length,
  games: items.filter(i => i.category === 'games').length,
  api: items.filter(i => i.category === 'api').length,
  godFiles: items.filter(i => i.status === 'god').length,
  totalLOC: items.reduce((sum, i) => sum + i.loc, 0),
};

const output = `// AUTO-GENERATED — ne pas éditer manuellement
// Source: scripts/scan-ecosystem.cjs
// Run: node scripts/scan-ecosystem.cjs
// Generated: ${stats.generated}
/* eslint-disable */
window.ECOSYSTEM_DATA = ${JSON.stringify(items, null, 2)};
window.ECOSYSTEM_STATS = ${JSON.stringify(stats, null, 2)};
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, output, 'utf8');

console.log(`\n✅ ASDF-Web Ecosystem Scan complete`);
console.log(`   📄 ${stats.pages} pages`);
console.log(`   🎨 ${stats.css} CSS files`);
console.log(`   📦 ${stats.js} JS modules`);
console.log(`   🎮 ${stats.games} game modules`);
console.log(`   🔌 ${stats.api} API files`);
console.log(`   🔴 ${stats.godFiles} god files`);
console.log(`   📊 ${stats.totalLOC.toLocaleString()} total LOC`);
console.log(`\n   → ${OUTPUT}\n`);
