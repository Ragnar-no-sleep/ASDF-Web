/**
 * Build V2 - Data Adapter
 * DEPRECATED: Now re-exports from shared/data/adapter.js
 *
 * This file exists for backwards compatibility.
 * New code should import directly from:
 *   import { DataAdapter } from '../../shared/data/adapter.js';
 *
 * @version 2.1.0 -> 3.0.0 (redirect to shared)
 */

'use strict';

// Re-export everything from shared
export { DataAdapter, DATA_SOURCES, default } from '../../shared/data/adapter.js';

// Also re-export for backwards compat with old imports
export { ProgressClient, STORAGE_MODE } from '../../shared/data/progress-client.js';

// Legacy inline data that was previously here
// Now these should be loaded via DataAdapter.getSkills() etc.
export const buildersData = [
  {
    id: 'sollama58',
    name: 'sollama58',
    role: 'Core Developer',
    avatar: '/images/builders/sollama58.png',
    skills: ['solana', 'rust', 'typescript'],
    projects: ['burn-engine', 'burn-tracker', 'forecast'],
    github: 'https://github.com/sollama58',
    twitter: null,
  },
  {
    id: 'zeyxx',
    name: 'zeyxx',
    role: 'Protocol Developer',
    avatar: '/images/builders/zeyxx.png',
    skills: ['solana', 'rust', 'anchor'],
    projects: ['ignition', 'token-launcher'],
    github: 'https://github.com/zeyxx',
    twitter: null,
  },
  {
    id: 'asdf-team',
    name: 'ASDF Team',
    role: 'Core Team',
    avatar: '/images/builders/asdf-team.png',
    skills: ['solana', 'typescript', 'react'],
    projects: ['learn-platform', 'games-platform', 'holdex'],
    github: 'https://github.com/asdf-ecosystem',
    twitter: null,
  },
];

export const skillsData = [
  { id: 'solana', name: 'Solana', icon: '\u25CE', color: '#9945FF' },
  { id: 'rust', name: 'Rust', icon: '\uD83E\uDD80', color: '#DEA584' },
  { id: 'typescript', name: 'TypeScript', icon: '\uD83D\uDCD8', color: '#3178C6' },
  { id: 'react', name: 'React', icon: '\u269B\uFE0F', color: '#61DAFB' },
  { id: 'anchor', name: 'Anchor', icon: '\u2693', color: '#F7931A' },
  { id: 'python', name: 'Python', icon: '\uD83D\uDC0D', color: '#3776AB' },
  { id: 'nodejs', name: 'Node.js', icon: '\uD83D\uDF62', color: '#339933' },
];

// Browser global for legacy compatibility
if (typeof window !== 'undefined') {
  window.BuildData = { buildersData, skillsData };
}
