#!/usr/bin/env node
'use strict';

/**
 * ASDF-Web Ecosystem Scanner — Enhanced
 * Génère js/ecosystem-data.js avec topologie complète du projet.
 *
 * Données collectées :
 *   - LOC réelles (lignes non-vides)
 *   - Taille fichier (bytes)
 *   - Dépendances parsées (require/import/script src)
 *   - Dépendances non-résolues (broken imports)
 *   - Complexité cyclomatique (JS uniquement)
 *   - Métadonnées git (dernière modif, auteur, hash)
 *   - Couverture tests (depuis coverage/coverage-summary.json)
 *   - Score god-file multi-critères
 *   - Fraîcheur (jours depuis dernière modif git)
 *
 * Usage: node scripts/scan-ecosystem.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'js', 'ecosystem-data.js');

// ============================================================
// SKIP LISTS
// ============================================================
const SKIP_DIRS = new Set([
  'node_modules', '_archive', '.git', 'dist', 'coverage',
  'playwright-report', 'test-results', 'public', 'ssr',
  'tests', 'asdf-game-store', 'scripts', 'demos',
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
// GIT METADATA — one pass for all files
// ============================================================
function loadGitMetadata() {
  const map = new Map(); // rel path → { date, author, hash, daysOld }
  try {
    // Single git log call: hash|date|author then file names
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
        current = { hash: hash.slice(0, 7), date: date.slice(0, 10), author: author.trim(), daysOld };
      } else if (current && !trimmed.startsWith('COMMIT')) {
        const rel = trimmed.replace(/\\/g, '/');
        if (!map.has(rel)) map.set(rel, current); // first = most recent
      }
    }
  } catch (e) {
    console.warn('  ⚠ git metadata unavailable:', e.message.slice(0, 60));
  }
  return map;
}

// ============================================================
// TEST COVERAGE — from jest coverage-summary.json
// ============================================================
function loadCoverage() {
  const map = new Map(); // rel path → { lines, branches, functions, statements }
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

// ============================================================
// CATEGORY DETECTION
// ============================================================
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

// ============================================================
// CYCLOMATIC COMPLEXITY (JS only, heuristic)
// Decision points: if/else if/for/while/switch case/catch/&&/||/?
// ============================================================
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
    /\?\s*[^:?]/g,  // ternary (approx)
  ];
  let complexity = 1;
  for (const p of patterns) {
    const m = content.match(p);
    if (m) complexity += m.length;
  }
  return complexity;
}

// ============================================================
// GOD FILE DETECTION — multi-criteria score
// Score >= 4 → god, 2-3 → complex, <2 → normal
// ============================================================
function godScore(loc, complexity, depCount, bytes) {
  let score = 0;
  if (loc > 5000)        score += 4;
  else if (loc > 2000)   score += 2;
  else if (loc > 1000)   score += 1;

  if (complexity !== null) {
    if (complexity > 300) score += 3;
    else if (complexity > 150) score += 2;
    else if (complexity > 80)  score += 1;
  }

  if (depCount > 20)     score += 2;
  else if (depCount > 10) score += 1;

  if (bytes > 200_000)   score += 2;
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
  'js/ecosystem.js': 'ASDF Ecosystem Shell — nav drawer, themes, density',
  'js/hub-majestic.js': 'Landing page — particle effects et interactions',
  'api/services/helius.js': 'Helius RPC client (audit score: A-)',
  'api/index.js': 'Main Express server — GOD FILE',
  'js/games/engine.js': 'Main game engine — GOD FILE',
};

function autoDesc(rel) {
  if (KNOWN_DESC[rel]) return KNOWN_DESC[rel];
  const base = path.basename(rel, path.extname(rel));
  const words = base.split(/[-_.]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (rel.startsWith('api/routes/')) return `Route ${words}`;
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
    const re1 = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const re2 = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re1.exec(content)) !== null) if (m[1].startsWith('.')) deps.add(path.basename(m[1]));
    while ((m = re2.exec(content)) !== null) if (m[1].startsWith('.')) deps.add(path.basename(m[1]));
  }
  if (ext === '.html') {
    const re1 = /script[^>]+src=['"]([^'"#?]+)['"]/g;
    const re2 = /link[^>]+href=['"]([^'"#?]+\.css)['"]/g;
    let m;
    while ((m = re1.exec(content)) !== null) {
      const d = m[1];
      if (!d.startsWith('http') && !d.startsWith('//') && !d.includes('cdn')) deps.add(path.basename(d));
    }
    while ((m = re2.exec(content)) !== null) {
      const d = m[1];
      if (!d.startsWith('http') && !d.startsWith('//')) deps.add(path.basename(d));
    }
  }
  return Array.from(deps);
}

// ============================================================
// DIRECTORY WALKER
// ============================================================
function walk(dir, items = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return items; }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(ROOT, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) { walk(fullPath, items); continue; }
    if (!entry.isFile()) continue;

    if (SKIP_FILE_PATTERNS.some(p => p.test(entry.name))) continue;

    const ext = path.extname(entry.name);
    if (!['.html', '.css', '.js'].includes(ext)) continue;

    const category = detectCategory(rel);
    if (!category) continue;

    let content = '';
    try { content = fs.readFileSync(fullPath, 'utf8'); } catch { continue; }

    const bytes = fs.statSync(fullPath).size;
    const loc = content.split('\n').filter(l => l.trim()).length;
    const deps = parseDeps(content, ext);
    const complexity = ext === '.js' ? cyclomaticComplexity(content) : null;
    const status = detectStatus(rel, loc, complexity, deps.length, bytes);

    items.push({ rel, ext, loc, bytes, deps, complexity, status });
  }
  return items;
}

// ============================================================
// MAIN
// ============================================================
console.log('\n🔍 ASDF-Web Ecosystem Scanner — Enhanced\n');

console.log('  Loading git metadata...');
const gitMeta = loadGitMetadata();
console.log(`  ✓ ${gitMeta.size} file histories loaded`);

console.log('  Loading test coverage...');
const coverage = loadCoverage();

console.log('  Walking filesystem...');
const rawItems = walk(ROOT);

// Build known file index for unresolved dep detection
const knownBasenames = new Set(rawItems.map(i => path.basename(i.rel)));

const ORDER = { pages: 0, css: 1, js: 2, games: 3, api: 4 };

const items = rawItems
  .sort((a, b) => (ORDER[detectCategory(a.rel)] ?? 5) - (ORDER[detectCategory(b.rel)] ?? 5))
  .map(({ rel, ext, loc, bytes, deps, complexity, status }) => {
    const category = detectCategory(rel);
    const git = gitMeta.get(rel) ?? null;
    const cov = coverage.get(rel) ?? null;
    const unresolvedDeps = deps.filter(d => !knownBasenames.has(d) && !knownBasenames.has(d + '.js') && !knownBasenames.has(d + '.css'));
    const score = godScore(loc, complexity, deps.length, bytes);

    return {
      name: rel,
      category,
      status,
      loc,
      bytes,
      complexity,
      godScore: score,
      description: autoDesc(rel),
      dependencies: deps,
      unresolvedDeps,
      path: rel,
      git,
      coverage: cov,
    };
  });

const godFiles = items.filter(i => i.status === 'god');
const complexFiles = items.filter(i => i.godScore >= 2 && i.godScore < 4);
const staleFiles = items.filter(i => i.git && i.git.daysOld > 90);
const uncovered = items.filter(i => i.coverage && i.coverage.lines < 50);

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
  totalLOC: items.reduce((s, i) => s + i.loc, 0),
  totalBytes: items.reduce((s, i) => s + i.bytes, 0),
  avgComplexity: Math.round(
    items.filter(i => i.complexity !== null).reduce((s, i) => s + i.complexity, 0) /
    Math.max(1, items.filter(i => i.complexity !== null).length)
  ),
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

const mb = (stats.totalBytes / 1024 / 1024).toFixed(2);
console.log(`\n✅ Scan complete — ${items.length} items`);
console.log(`   📄 ${stats.pages} pages`);
console.log(`   🎨 ${stats.css} CSS`);
console.log(`   📦 ${stats.js} JS`);
console.log(`   🎮 ${stats.games} games`);
console.log(`   🔌 ${stats.api} API`);
console.log(`   📊 ${stats.totalLOC.toLocaleString()} LOC · ${mb} MB`);
console.log(`   🧠 complexité moy: ${stats.avgComplexity}`);
console.log(`   🔴 ${stats.godFiles} god files (score ≥ 4)`);
console.log(`   🟡 ${stats.complexFiles} fichiers complexes (score 2-3)`);
console.log(`   ⏳ ${stats.staleFiles} fichiers non modifiés depuis >90j`);
console.log(`   🧪 ${stats.coveredFiles} fichiers avec coverage`);
console.log(`\n   → ${OUTPUT}\n`);
