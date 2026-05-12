#!/usr/bin/env node
/**
 * Ralph Analyzer — Pattern-based CI auto-fixer
 *
 * Zero-cost (no AI API calls). Reads CI artifacts and applies deterministic fixes.
 *
 * Exit codes:
 *   0 = fix applied, ready to commit
 *   1 = no matching pattern, create issue
 *
 * Usage:
 *   node scripts/ralph-analyze.cjs [--report-dir <path>] [--failed-jobs <json>]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const REPORT_DIR = getArg('report-dir', 'playwright-report');
const FAILED_JOBS = getArg('failed-jobs', '');
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Context object passed to every pattern
// ---------------------------------------------------------------------------
function buildContext() {
  const ctx = {
    root: ROOT,
    reportDir: path.resolve(ROOT, REPORT_DIR),
    failedJobs: FAILED_JOBS,
    reportJson: null,
    ciYmlPath: path.join(ROOT, '.github', 'workflows', 'ci.yml'),
    playwrightConfigPath: path.join(ROOT, 'playwright.config.cjs'),
    fixes: [],
    summary: [],
  };

  // Try to load Playwright JSON report
  const jsonReport = path.join(ctx.reportDir, 'report.json');
  if (fs.existsSync(jsonReport)) {
    try {
      ctx.reportJson = JSON.parse(fs.readFileSync(jsonReport, 'utf8'));
    } catch {
      // Report might be HTML-only; that's fine
    }
  }

  // Also try results.json (Playwright list reporter output)
  const resultsJson = path.join(ROOT, 'test-results', '.last-run.json');
  if (fs.existsSync(resultsJson)) {
    try {
      ctx.lastRun = JSON.parse(fs.readFileSync(resultsJson, 'utf8'));
    } catch {
      // ignore
    }
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------
const patterns = [];

// --- 1. Playwright missing browser ---
patterns.push({
  id: 'playwright-missing-browser',
  detect(ctx) {
    // Read playwright config to find required browsers
    if (!fs.existsSync(ctx.playwrightConfigPath)) return false;
    const config = fs.readFileSync(ctx.playwrightConfigPath, 'utf8');

    // Extract device names from config
    const deviceMatches = config.match(/devices\['([^']+)'\]/g) || [];
    const requiredBrowsers = new Set();

    for (const m of deviceMatches) {
      const device = m.match(/devices\['([^']+)'\]/)[1];
      // iPhone/iPad → webkit, Pixel → chromium, Desktop Chrome → chromium
      if (/iphone|ipad|safari/i.test(device)) requiredBrowsers.add('webkit');
      if (/chrome|pixel|galaxy/i.test(device)) requiredBrowsers.add('chromium');
      if (/firefox/i.test(device)) requiredBrowsers.add('firefox');
    }

    // Also check explicit browser names in projects
    const projectBrowsers = config.match(/name:\s*'(chromium|firefox|webkit)'/g) || [];
    for (const m of projectBrowsers) {
      requiredBrowsers.add(m.match(/'(chromium|firefox|webkit)'/)[1]);
    }

    // Read CI config to find installed browsers
    if (!fs.existsSync(ctx.ciYmlPath)) return false;
    const ciYml = fs.readFileSync(ctx.ciYmlPath, 'utf8');

    const installMatch = ciYml.match(/playwright install[^\n]*?(chromium|firefox|webkit)[\s\w]*/g);
    const installedBrowsers = new Set();
    if (installMatch) {
      for (const line of installMatch) {
        if (line.includes('chromium')) installedBrowsers.add('chromium');
        if (line.includes('firefox')) installedBrowsers.add('firefox');
        if (line.includes('webkit')) installedBrowsers.add('webkit');
      }
    }

    const missing = [...requiredBrowsers].filter(b => !installedBrowsers.has(b));
    if (missing.length === 0) return false;

    ctx._missingBrowsers = missing;
    ctx._allRequired = [...requiredBrowsers];
    return true;
  },
  fix(ctx) {
    const ciYml = fs.readFileSync(ctx.ciYmlPath, 'utf8');
    const allBrowsers = ctx._allRequired.sort().join(' ');
    const updated = ciYml.replace(
      /npx playwright install --with-deps[^\n]*/,
      `npx playwright install --with-deps ${allBrowsers}`
    );
    fs.writeFileSync(ctx.ciYmlPath, updated);
    ctx.fixes.push(ctx.ciYmlPath);
    ctx.summary.push(`Install missing Playwright browsers: ${ctx._missingBrowsers.join(', ')}`);
    return `playwright-missing-browser`;
  },
});

// --- 2. Prettier format failures ---
patterns.push({
  id: 'prettier-format',
  detect(ctx) {
    // Check if failed jobs mention format/prettier
    if (ctx.failedJobs && /format|prettier/i.test(ctx.failedJobs)) return true;
    return false;
  },
  fix(ctx) {
    try {
      execSync('npx prettier --write .', { cwd: ctx.root, stdio: 'pipe' });
      // Stage all formatted files
      const diff = execSync('git diff --name-only', {
        cwd: ctx.root,
        encoding: 'utf8',
      }).trim();
      if (!diff) return null; // prettier made no changes
      ctx.fixes.push(...diff.split('\n'));
      ctx.summary.push('Auto-format with Prettier');
      return 'prettier-format';
    } catch {
      return null;
    }
  },
});

// --- 3. npm audit vulnerabilities ---
patterns.push({
  id: 'npm-audit-vuln',
  detect(ctx) {
    if (ctx.failedJobs && /security|audit/i.test(ctx.failedJobs)) return true;
    return false;
  },
  fix(ctx) {
    try {
      execSync('npm audit fix', { cwd: ctx.root, stdio: 'pipe' });
      // Check if package-lock changed
      const diff = execSync('git diff --name-only package-lock.json', {
        cwd: ctx.root,
        encoding: 'utf8',
      }).trim();
      if (!diff) return null;
      ctx.fixes.push('package-lock.json');
      // Check if package.json changed too
      const pkgDiff = execSync('git diff --name-only package.json', {
        cwd: ctx.root,
        encoding: 'utf8',
      }).trim();
      if (pkgDiff) ctx.fixes.push('package.json');
      ctx.summary.push('Run npm audit fix (semver-safe)');
      return 'npm-audit-vuln';
    } catch {
      return null;
    }
  },
});

// --- 4. E2E timeout ---
patterns.push({
  id: 'e2e-timeout',
  detect(ctx) {
    if (!ctx.reportJson) return false;
    // Look for timedOut in report suites
    const json = JSON.stringify(ctx.reportJson);
    return json.includes('"status":"timedOut"') || json.includes('"timedout"');
  },
  fix(ctx) {
    // Increase global timeout in playwright config
    const config = fs.readFileSync(ctx.playwrightConfigPath, 'utf8');

    // If timeout is already set, increase it
    if (config.includes('timeout:')) {
      const updated = config.replace(
        /timeout:\s*(\d+)/,
        (_, val) => `timeout: ${Math.min(parseInt(val) * 2, 120000)}`
      );
      fs.writeFileSync(ctx.playwrightConfigPath, updated);
    } else {
      // Add timeout after testDir
      const updated = config.replace(/(testDir:\s*'[^']+',)/, `$1\n  timeout: 60000,`);
      fs.writeFileSync(ctx.playwrightConfigPath, updated);
    }
    ctx.fixes.push(ctx.playwrightConfigPath);
    ctx.summary.push('Increase Playwright test timeout');
    return 'e2e-timeout';
  },
});

// --- 5. E2E rate limit (429) ---
patterns.push({
  id: 'e2e-rate-limit',
  detect(ctx) {
    if (!ctx.reportJson) return false;
    const json = JSON.stringify(ctx.reportJson);
    return json.includes('429') || json.includes('rate limit');
  },
  fix(ctx) {
    // Add dependencies to serialize browser projects
    const config = fs.readFileSync(ctx.playwrightConfigPath, 'utf8');

    // Check if mobile project already has dependencies
    if (config.includes("dependencies: ['chromium']")) return null;

    // Find mobile project and add dependencies
    const updated = config.replace(
      /(name:\s*'mobile',\s*\n\s*use:\s*\{[^}]+\},)/,
      `$1\n      dependencies: ['chromium'],`
    );

    if (updated === config) return null; // no match found

    fs.writeFileSync(ctx.playwrightConfigPath, updated);
    ctx.fixes.push(ctx.playwrightConfigPath);
    ctx.summary.push('Serialize browser projects to prevent 429 rate limiting');
    return 'e2e-rate-limit';
  },
});

// --- 6. Webserver start failure ---
patterns.push({
  id: 'e2e-webserver-start',
  detect(ctx) {
    if (ctx.failedJobs && /webserver|server.*start|timed?\s*out.*server/i.test(ctx.failedJobs))
      return true;
    // Also check report for server connection errors
    if (!ctx.reportJson) return false;
    const json = JSON.stringify(ctx.reportJson);
    return json.includes('ERR_CONNECTION_REFUSED') || json.includes('webServer');
  },
  fix(ctx) {
    const config = fs.readFileSync(ctx.playwrightConfigPath, 'utf8');
    const match = config.match(/webServer:\s*\{[\s\S]*?timeout:\s*(\d+)/);
    if (!match) return null;

    const currentTimeout = parseInt(match[1]);
    const newTimeout = Math.min(currentTimeout * 2, 120000);
    if (newTimeout === currentTimeout) return null;

    const updated = config.replace(/(webServer:\s*\{[\s\S]*?timeout:\s*)\d+/, `$1${newTimeout}`);
    fs.writeFileSync(ctx.playwrightConfigPath, updated);
    ctx.fixes.push(ctx.playwrightConfigPath);
    ctx.summary.push(`Increase webServer timeout to ${newTimeout}ms`);
    return 'e2e-webserver-start';
  },
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const ctx = buildContext();
  let appliedPattern = null;

  console.log('Ralph analyzing CI failure...');
  console.log(`  Report dir: ${ctx.reportDir}`);
  console.log(`  Failed jobs: ${ctx.failedJobs || '(not specified)'}`);

  for (const pattern of patterns) {
    console.log(`  Checking pattern: ${pattern.id}...`);
    if (pattern.detect(ctx)) {
      console.log(`  MATCH: ${pattern.id}`);
      appliedPattern = pattern.fix(ctx);
      if (appliedPattern) break;
      console.log(`  Fix returned null for ${pattern.id}, continuing...`);
    }
  }

  if (!appliedPattern) {
    console.log('No matching pattern found. Manual intervention required.');

    // Write diagnosis for issue creation
    const diagnosis = [
      '## Ralph Analysis - No Auto-Fix Available',
      '',
      `**Failed jobs:** ${ctx.failedJobs || 'unknown'}`,
      `**Report available:** ${ctx.reportJson ? 'yes' : 'no'}`,
      '',
      '### Patterns checked:',
      ...patterns.map(p => `- \`${p.id}\`: no match`),
      '',
      'Manual investigation required.',
    ].join('\n');

    fs.writeFileSync(path.join(ctx.root, 'ralph-fix-summary.txt'), diagnosis);
    fs.writeFileSync(path.join(ctx.root, 'ralph-fix-pattern.txt'), 'none');
    process.exit(1);
  }

  // Write results
  const summary = ctx.summary.join('\n');
  console.log(`\nFix applied: ${appliedPattern}`);
  console.log(`Summary: ${summary}`);
  console.log(`Files changed: ${ctx.fixes.join(', ')}`);

  fs.writeFileSync(path.join(ctx.root, 'ralph-fix-summary.txt'), summary);
  fs.writeFileSync(path.join(ctx.root, 'ralph-fix-pattern.txt'), appliedPattern);

  process.exit(0);
}

main();
