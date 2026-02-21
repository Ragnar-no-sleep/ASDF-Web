/**
 * Critical CSS Builder
 * Extracts above-fold CSS for inline <style> tag in <head>
 *
 * Usage in build process:
 * node build/critical-css.js
 *
 * Output: Creates critical CSS content for insertion into HTML <head>
 *
 * @author CYNIC
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Critical CSS for above-fold content
 * This gets inlined in <head> to eliminate render-blocking CSS load
 */
const CRITICAL_CSS = `/* Critical CSS - Inline in <head> */
:root {
  --asdf-orange: #ea4e33;
  --asdf-gold: #f59e0b;
  --asdf-green: #4ade80;
  --asdf-dark: #0a0a0a;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  color: var(--asdf-dark);
  background-color: #fff;
  line-height: 1.6;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 1rem;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.5rem; }

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

nav a {
  color: var(--asdf-orange);
  padding: 0.5rem 1rem;
  transition: opacity 200ms;
}

main { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }

.btn {
  display: inline-block;
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 200ms;
}

.btn-primary { background-color: var(--asdf-orange); color: white; }

.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

@media (max-width: 768px) {
  h1 { font-size: 2rem; }
  nav { flex-direction: column; gap: 1rem; }
  main { padding: 1rem; }
}`;

/**
 * Generate <style> tag with critical CSS
 */
export function generateCriticalStyleTag() {
  return `<style>${CRITICAL_CSS}</style>`;
}

/**
 * Write critical CSS to output file
 */
export async function writeCriticalCSS() {
  const distDir = path.join(__dirname, '../dist');
  const outputPath = path.join(distDir, 'critical-css.html');

  try {
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    const styleTag = generateCriticalStyleTag();
    fs.writeFileSync(outputPath, styleTag, 'utf8');

    console.log(`✓ Critical CSS written to dist/critical-css.html`);
    console.log(`  Size: ${styleTag.length} bytes`);
    return true;
  } catch (err) {
    console.error('Failed to write critical CSS:', err.message);
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  writeCriticalCSS();
}

export default { CRITICAL_CSS, generateCriticalStyleTag, writeCriticalCSS };
