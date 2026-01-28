/**
 * ASDF Shared - Unified Data Adapter
 * Single adapter for all data access with async API
 *
 * @version 2.0.0
 * @location js/shared/data/adapter.js
 *
 * Features:
 * - Async API (ready for backend)
 * - Local cache with TTL
 * - Multiple data sources (JSON, API, On-chain)
 * - Progress via ProgressClient
 */

'use strict';

import {
  FORMATION_TRACKS,
  FORMATION_MODULES,
  getTrackModules,
  getFormationTrack,
  getFormationModule,
  calculateTrackProgress,
  getNextModule,
  getTrackTotalXP,
} from './formations.js';

import { ProgressClient } from './progress-client.js';

// ============================================
// CONFIGURATION
// ============================================

const DATA_SOURCES = {
  LOCAL: 'local', // Static imports (formations.js)
  JSON: 'json', // JSON files
  API: 'api', // Backend API
  ONCHAIN: 'onchain', // Solana PDAs (future)
};

let currentSource = DATA_SOURCES.LOCAL;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache = {
  projects: { data: null, timestamp: null },
  skills: { data: null, timestamp: null },
};

// Base paths
const JSON_BASE_PATH = '/js/build/data';
const API_BASE_URL = '/api';

// ============================================
// CACHE HELPERS
// ============================================

function isCacheValid(key) {
  const entry = cache[key];
  if (!entry || !entry.timestamp) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

function getCache(key) {
  return isCacheValid(key) ? cache[key].data : null;
}

// ============================================
// FETCH HELPERS
// ============================================

async function fetchJSON(filename) {
  const response = await fetch(`${JSON_BASE_PATH}/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${filename}: ${response.status}`);
  }
  return response.json();
}

async function fetchAPI(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error ${endpoint}: ${response.status}`);
  }
  return response.json();
}

// ============================================
// INPUT SANITIZATION
// ============================================

function sanitizeId(id) {
  if (typeof id !== 'string') return null;
  return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
}

// ============================================
// DATA ADAPTER
// ============================================

export const DataAdapter = {
  /**
   * Set data source
   * @param {'local'|'json'|'api'|'onchain'} source
   */
  setSource(source) {
    if (Object.values(DATA_SOURCES).includes(source)) {
      currentSource = source;
      console.log('[DataAdapter] Source:', source);
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
   * Clear all caches
   */
  clearCache() {
    for (const key in cache) {
      cache[key] = { data: null, timestamp: null };
    }
    ProgressClient.clearCache();
  },

  // ============================================
  // FORMATIONS (from formations.js - always local)
  // ============================================

  /**
   * Get all formation tracks
   * @returns {Promise<Object>}
   */
  async getTracks() {
    return FORMATION_TRACKS;
  },

  /**
   * Get track by ID
   * @param {string} trackId
   * @returns {Promise<Object|null>}
   */
  async getTrack(trackId) {
    const id = sanitizeId(trackId);
    return id ? getFormationTrack(id) : null;
  },

  /**
   * Get all modules
   * @returns {Promise<Object>}
   */
  async getModules() {
    return FORMATION_MODULES;
  },

  /**
   * Get module by ID
   * @param {string} moduleId
   * @returns {Promise<Object|null>}
   */
  async getModule(moduleId) {
    const id = sanitizeId(moduleId);
    return id ? getFormationModule(id) : null;
  },

  /**
   * Get modules for a track
   * @param {string} trackId
   * @returns {Promise<Object[]>}
   */
  async getTrackModules(trackId) {
    const id = sanitizeId(trackId);
    return id ? getTrackModules(id) : [];
  },

  /**
   * Get module resources
   * @param {string} moduleId
   * @returns {Promise<Object[]>}
   */
  async getModuleResources(moduleId) {
    const module = await this.getModule(moduleId);
    return module?.resources || [];
  },

  /**
   * Get total XP for a track
   * @param {string} trackId
   * @returns {Promise<number>}
   */
  async getTrackTotalXP(trackId) {
    const id = sanitizeId(trackId);
    return id ? getTrackTotalXP(id) : 0;
  },

  // ============================================
  // PROJECTS (from JSON or API)
  // ============================================

  /**
   * Get all projects
   * @returns {Promise<Object>}
   */
  async getProjects() {
    const cached = getCache('projects');
    if (cached) return cached;

    let data;
    if (currentSource === DATA_SOURCES.API) {
      data = await fetchAPI('/projects');
    } else {
      data = await fetchJSON('projects.json');
    }

    setCache('projects', data);
    return data;
  },

  /**
   * Get project by ID
   * @param {string} projectId
   * @returns {Promise<Object|null>}
   */
  async getProject(projectId) {
    const id = sanitizeId(projectId);
    if (!id) return null;
    const projects = await this.getProjects();
    return projects[id] || null;
  },

  /**
   * Get projects by status
   * @param {string} status
   * @returns {Promise<Object[]>}
   */
  async getProjectsByStatus(status) {
    const projects = await this.getProjects();
    return Object.values(projects).filter(p => p.status === status);
  },

  // ============================================
  // SKILLS
  // ============================================

  /**
   * Get all skills
   * @returns {Promise<Object[]>}
   */
  async getSkills() {
    const cached = getCache('skills');
    if (cached) return cached;

    // Skills are small, keep inline
    const skills = [
      { id: 'solana', name: 'Solana', icon: '\u25CE', color: '#9945FF' },
      { id: 'rust', name: 'Rust', icon: '\uD83E\uDD80', color: '#DEA584' },
      { id: 'typescript', name: 'TypeScript', icon: '\uD83D\uDCD8', color: '#3178C6' },
      { id: 'react', name: 'React', icon: '\u269B\uFE0F', color: '#61DAFB' },
      { id: 'anchor', name: 'Anchor', icon: '\u2693', color: '#F7931A' },
      { id: 'python', name: 'Python', icon: '\uD83D\uDC0D', color: '#3776AB' },
      { id: 'nodejs', name: 'Node.js', icon: '\uD83D\uDF62', color: '#339933' },
    ];

    setCache('skills', skills);
    return skills;
  },

  /**
   * Get skill by ID
   * @param {string} skillId
   * @returns {Promise<Object|null>}
   */
  async getSkill(skillId) {
    const skills = await this.getSkills();
    return skills.find(s => s.id === skillId) || null;
  },

  // ============================================
  // PROGRESS (via ProgressClient)
  // ============================================

  /**
   * Load user progress
   * @param {string} [wallet] - Optional wallet for authenticated users
   * @returns {Promise<Object>}
   */
  async loadProgress(wallet = null) {
    return ProgressClient.loadProgress(wallet);
  },

  /**
   * Save user progress
   * @param {Object} progress
   * @param {string} [wallet]
   * @returns {Promise<boolean>}
   */
  async saveProgress(progress, wallet = null) {
    return ProgressClient.saveProgress(progress, wallet);
  },

  /**
   * Get completed modules for a track
   * @param {string} trackId
   * @param {string} [wallet]
   * @returns {Promise<string[]>}
   */
  async getCompletedModules(trackId, wallet = null) {
    const progress = await this.loadProgress(wallet);
    return progress[trackId]?.completed || [];
  },

  /**
   * Mark module as completed
   * @param {string} trackId
   * @param {string} moduleId
   * @param {string} [wallet]
   * @returns {Promise<{success: boolean, xpAwarded?: number}>}
   */
  async completeModule(trackId, moduleId, wallet = null) {
    return ProgressClient.completeModule(trackId, moduleId, wallet);
  },

  /**
   * Get track progress percentage
   * @param {string} trackId
   * @param {string} [wallet]
   * @returns {Promise<number>}
   */
  async getTrackProgress(trackId, wallet = null) {
    const completed = await this.getCompletedModules(trackId, wallet);
    return calculateTrackProgress(trackId, completed);
  },

  /**
   * Get next available module
   * @param {string} trackId
   * @param {string} [wallet]
   * @returns {Promise<Object|null>}
   */
  async getNextModule(trackId, wallet = null) {
    const completed = await this.getCompletedModules(trackId, wallet);
    return getNextModule(trackId, completed);
  },

  /**
   * Get user XP
   * @param {string} [wallet]
   * @returns {Promise<number>}
   */
  async getUserXP(wallet = null) {
    return ProgressClient.getUserXP(wallet);
  },

  /**
   * Get user level
   * @param {string} [wallet]
   * @returns {Promise<Object>}
   */
  async getUserLevel(wallet = null) {
    return ProgressClient.getUserLevel(wallet);
  },
};

// ============================================
// EXPORTS
// ============================================

export { DATA_SOURCES };
export default DataAdapter;

// Browser global (for non-module usage)
if (typeof window !== 'undefined') {
  window.DataAdapter = DataAdapter;
}
