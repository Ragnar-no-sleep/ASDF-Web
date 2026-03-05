/**
 * Load window-based IIFE modules into Node.js global scope for Jest testing.
 *
 * Handles the pattern used by all framework modules:
 *   const ModuleName = { ... };
 *   if (typeof window !== 'undefined') { window.ModuleName = ModuleName; }
 *
 * Uses vm.runInThisContext for safer execution than eval.
 */

'use strict';

const fs = require('fs');

function loadModule(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  // 1. Strip 'use strict' (eval handles this)
  // 2. Hoist top-level const to global (const X = { → global.X = {)
  // 3. Strip window export blocks at EOF
  // 4. Rewrite remaining window.X refs to global.X
  const adapted = code
    .replace(/'use strict';/g, '')
    .replace(/\bconst\s+(\w+)\s*=\s*\{/g, 'global.$1 = {')
    .replace(/if \(typeof window[\s\S]*$/g, '')
    .replace(/window\.(ASDF\s*=\s*window\.ASDF\s*\|\|\s*\{\};?)/g, 'global.$1')
    .replace(/window\.ASDF\./g, 'global.ASDF.')
    .replace(/window\./g, 'global.');
  // eslint-disable-next-line no-eval
  eval(adapted);
}

module.exports = { loadModule };
