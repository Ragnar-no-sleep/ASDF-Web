/**
 * Build V2 - Data Adapter
 * Adapter Pattern for data access - JSON files now, API/On-chain later
 *
 * @version 2.1.0
 * @updated 2026-01-21
 */

'use strict';

import { isValidProjectId, isValidTrackId } from '../utils/security.js';

// ============================================
// DATA SOURCES
// ============================================

/**
 * Available data sources
 */
const DATA_SOURCES = {
  JSON: 'json',
  API: 'api',
  ONCHAIN: 'onchain'
};

/**
 * Current data source
 */
let currentSource = DATA_SOURCES.JSON;

/**
 * Cached data
 */
const cache = {
  projects: null,
  formations: null,
  builders: null,
  skills: null,
  lastFetch: {
    projects: null,
    formations: null,
    builders: null,
    skills: null
  }
};

/**
 * Cache duration in ms (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Base path for JSON files
 */
const JSON_BASE_PATH = '/js/build/data';

// ============================================
// STATIC DATA (Small datasets kept inline)
// ============================================

/**
 * Builders data (3 entries - kept inline for simplicity)
 */
const buildersData = [
  {
    id: 'sollama58',
    name: 'sollama58',
    role: 'Core Developer',
    avatar: '/images/builders/sollama58.png',
    skills: ['solana', 'rust', 'typescript'],
    projects: ['burn-engine', 'burn-tracker', 'forecast'],
    github: 'https://github.com/sollama58',
    twitter: null
  },
  {
    id: 'zeyxx',
    name: 'zeyxx',
    role: 'Protocol Developer',
    avatar: '/images/builders/zeyxx.png',
    skills: ['solana', 'rust', 'anchor'],
    projects: ['ignition', 'token-launcher'],
    github: 'https://github.com/zeyxx',
    twitter: null
  },
  {
    id: 'asdf-team',
    name: 'ASDF Team',
    role: 'Core Team',
    avatar: '/images/builders/asdf-team.png',
    skills: ['solana', 'typescript', 'react'],
    projects: ['learn-platform', 'games-platform', 'holdex'],
    github: 'https://github.com/asdf-ecosystem',
    twitter: null
  }
];

/**
 * Skills data (7 entries - kept inline for simplicity)
 */
const skillsData = [
  { id: 'solana', name: 'Solana', icon: '\u25CE', color: '#9945FF' },
  { id: 'rust', name: 'Rust', icon: '\uD83E\uDD80', color: '#DEA584' },
  { id: 'typescript', name: 'TypeScript', icon: '\uD83D\uDCD8', color: '#3178C6' },
  { id: 'react', name: 'React', icon: '\u269B\uFE0F', color: '#61DAFB' },
  { id: 'anchor', name: 'Anchor', icon: '\u2693', color: '#F7931A' },
  { id: 'python', name: 'Python', icon: '\uD83D\uDC0D', color: '#3776AB' },
  { id: 'nodejs', name: 'Node.js', icon: '\uD83D\uDF62', color: '#339933' }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if specific cache is valid
 * @param {string} cacheKey
 * @returns {boolean}
 */
function isCacheValid(cacheKey) {
  if (!cache.lastFetch[cacheKey]) return false;
  return Date.now() - cache.lastFetch[cacheKey] < CACHE_DURATION;
}

/**
 * Fetch JSON file with error handling
 * @param {string} filename
 * @returns {Promise<any>}
 */
async function fetchJSON(filename) {
  try {
    const response = await fetch(`${JSON_BASE_PATH}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[DataAdapter] Error loading ${filename}:`, error);
    throw error;
  }
}

// ============================================
// DATA ADAPTER
// ============================================

const DataAdapter = {
  /**
   * Set data source
   * @param {string} source - 'json', 'api', or 'onchain'
   */
  setSource(source) {
    if (Object.values(DATA_SOURCES).includes(source)) {
      currentSource = source;
      console.log('[DataAdapter] Source set to:', source);
    }
  },

  /**
   * Get current source
   * @returns {string}
   */
  getSource() {
    return currentSource;
  },

  /**
   * Check if cache is valid (legacy - checks projects)
   * @returns {boolean}
   */
  isCacheValid() {
    return isCacheValid('projects');
  },

  /**
   * Clear all caches
   */
  clearCache() {
    cache.projects = null;
    cache.formations = null;
    cache.builders = null;
    cache.skills = null;
    cache.lastFetch = {
      projects: null,
      formations: null,
      builders: null,
      skills: null
    };
  },

  // ============================================
  // PROJECTS
  // ============================================

  /**
   * Get all projects
   * @returns {Promise<Object>}
   */
  async getProjects() {
    if (cache.projects && isCacheValid('projects')) {
      return cache.projects;
    }

    if (currentSource === DATA_SOURCES.API) {
      // Future: Fetch from API
      throw new Error('API source not implemented yet');
    }

    if (currentSource === DATA_SOURCES.ONCHAIN) {
      // Future: Fetch from Solana
      throw new Error('On-chain source not implemented yet');
    }

    // JSON source - load from file
    cache.projects = await fetchJSON('projects.json');
    cache.lastFetch.projects = Date.now();
    return cache.projects;
  },

  /**
   * Get project by ID
   * @param {string} projectId
   * @returns {Promise<Object|null>}
   */
  async getProject(projectId) {
    if (!isValidProjectId(projectId)) {
      console.warn('[DataAdapter] Invalid project ID:', projectId);
      return null;
    }

    const projects = await this.getProjects();
    return projects[projectId] || null;
  },

  /**
   * Get projects by status
   * @param {string} status - 'live', 'building', 'planned'
   * @returns {Promise<Object[]>}
   */
  async getProjectsByStatus(status) {
    const projects = await this.getProjects();
    return Object.values(projects).filter(p => p.status === status);
  },

  /**
   * Get projects by category
   * @param {string} category
   * @returns {Promise<Object[]>}
   */
  async getProjectsByCategory(category) {
    const projects = await this.getProjects();
    return Object.values(projects).filter(p => p.category === category);
  },

  /**
   * Get project IDs
   * @returns {Promise<string[]>}
   */
  async getProjectIds() {
    const projects = await this.getProjects();
    return Object.keys(projects);
  },

  // ============================================
  // FORMATIONS (NEW)
  // ============================================

  /**
   * Get all formations data
   * @returns {Promise<Object>}
   */
  async getFormations() {
    if (cache.formations && isCacheValid('formations')) {
      return cache.formations;
    }

    cache.formations = await fetchJSON('formations.json');
    cache.lastFetch.formations = Date.now();
    return cache.formations;
  },

  /**
   * Get all tracks
   * @returns {Promise<Object>}
   */
  async getTracks() {
    const formations = await this.getFormations();
    return formations.tracks;
  },

  /**
   * Get track by ID
   * @param {string} trackId - 'dev', 'games', or 'content'
   * @returns {Promise<Object|null>}
   */
  async getTrack(trackId) {
    if (!isValidTrackId(trackId)) {
      console.warn('[DataAdapter] Invalid track ID:', trackId);
      return null;
    }

    const tracks = await this.getTracks();
    return tracks[trackId] || null;
  },

  /**
   * Get modules for a track
   * @param {string} trackId
   * @returns {Promise<Object[]>}
   */
  async getModules(trackId) {
    const track = await this.getTrack(trackId);
    if (!track) return [];
    return track.modules || [];
  },

  /**
   * Get specific module
   * @param {string} trackId
   * @param {string} moduleId
   * @returns {Promise<Object|null>}
   */
  async getModule(trackId, moduleId) {
    const modules = await this.getModules(trackId);
    return modules.find(m => m.id === moduleId) || null;
  },

  /**
   * Get lessons for a module
   * @param {string} trackId
   * @param {string} moduleId
   * @returns {Promise<Object[]>}
   */
  async getLessons(trackId, moduleId) {
    const module = await this.getModule(trackId, moduleId);
    if (!module) return [];
    return module.lessons || [];
  },

  /**
   * Get specific lesson
   * @param {string} trackId
   * @param {string} moduleId
   * @param {string} lessonId
   * @returns {Promise<Object|null>}
   */
  async getLesson(trackId, moduleId, lessonId) {
    const lessons = await this.getLessons(trackId, moduleId);
    return lessons.find(l => l.id === lessonId) || null;
  },

  /**
   * Get XP configuration
   * @returns {Promise<Object>}
   */
  async getXPConfig() {
    const formations = await this.getFormations();
    return formations.xpConfig;
  },

  /**
   * Get quiz configuration
   * @returns {Promise<Object>}
   */
  async getQuizConfig() {
    const formations = await this.getFormations();
    return formations.quizConfig;
  },

  // ============================================
  // BUILDERS
  // ============================================

  /**
   * Get all builders
   * @returns {Promise<Object[]>}
   */
  async getBuilders() {
    if (cache.builders && isCacheValid('builders')) {
      return cache.builders;
    }

    // Builders kept inline (small dataset)
    cache.builders = buildersData;
    cache.lastFetch.builders = Date.now();
    return cache.builders;
  },

  /**
   * Get builder by ID
   * @param {string} builderId
   * @returns {Promise<Object|null>}
   */
  async getBuilder(builderId) {
    const builders = await this.getBuilders();
    return builders.find(b => b.id === builderId) || null;
  },

  /**
   * Get builders by skill
   * @param {string} skillId
   * @returns {Promise<Object[]>}
   */
  async getBuildersBySkill(skillId) {
    const builders = await this.getBuilders();
    return builders.filter(b => b.skills.includes(skillId));
  },

  // ============================================
  // SKILLS
  // ============================================

  /**
   * Get all skills
   * @returns {Promise<Object[]>}
   */
  async getSkills() {
    if (cache.skills && isCacheValid('skills')) {
      return cache.skills;
    }

    // Skills kept inline (small dataset)
    cache.skills = skillsData;
    cache.lastFetch.skills = Date.now();
    return cache.skills;
  },

  /**
   * Get skill by ID
   * @param {string} skillId
   * @returns {Promise<Object|null>}
   */
  async getSkill(skillId) {
    const skills = await this.getSkills();
    return skills.find(s => s.id === skillId) || null;
  }
};

// Export for ES modules
export { DataAdapter, buildersData, skillsData };
export default DataAdapter;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.DataAdapter = DataAdapter;
  window.BuildData = { buildersData, skillsData };
}
