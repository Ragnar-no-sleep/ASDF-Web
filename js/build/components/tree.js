/**
 * Build V2 - Yggdrasil Tree Component
 * Handles tree visualization and interactions
 *
 * @version 2.0.0
 */

'use strict';

import { STATUS, EVENTS, SELECTORS } from '../config.js';
import { BuildState } from '../state.js';
import { DataAdapter } from '../data/adapter.js';
import { ModalFactory } from './modal.js';
import { BurnApiService } from '../services/burn-api.js';
import { calculatePhiPositions, phiDelays, PHI } from '../utils/phi.js';
import { isValidProjectId } from '../utils/security.js';
import {
  $,
  $$,
  addClass,
  removeClass,
  hasClass,
  on,
  delegate,
  getData,
  setStyles,
  createElement
} from '../utils/dom.js';

// ============================================
// TREE CONFIGURATION
// ============================================

/**
 * Tree node positions (mapped from SVG)
 */
const NODE_POSITIONS = {
  'burn-engine': { x: 400, y: 300 },  // Heart/center
  'burn-tracker': { x: 80, y: 150 },
  'token-launcher': { x: 720, y: 150 },
  'learn-platform': { x: 150, y: 110 },
  'games-platform': { x: 650, y: 110 },
  'holdex': { x: 120, y: 200 },
  'forecast': { x: 680, y: 200 },
  'ignition': { x: 365, y: 140 },
  'oracle': { x: 700, y: 270 },
  'rpc-monitor': { x: 90, y: 350 },
  'community-hub': { x: 710, y: 350 },
  'deploy-pipeline': { x: 400, y: 520 },
  'ambassador-program': { x: 680, y: 490 },
  'security-audit': { x: 120, y: 490 },
  'content-factory': { x: 550, y: 450 }
};

/**
 * Branch categories
 */
const BRANCH_CATEGORIES = {
  canopy: ['burn-tracker', 'token-launcher', 'learn-platform', 'games-platform', 'holdex', 'forecast', 'ignition'],
  trunk: ['oracle', 'rpc-monitor', 'community-hub'],
  roots: ['deploy-pipeline', 'ambassador-program', 'security-audit', 'content-factory']
};

// ============================================
// BURN PULSE CONFIGURATION
// ============================================

const BURN_PULSE_CONFIG = {
  updateInterval: 30000,  // Update burn data every 30s
  pulseMinDuration: 2000, // Minimum pulse animation duration (ms)
  pulseMaxDuration: 800,  // Maximum pulse animation duration (ms) - faster = more intense
  glowMinOpacity: 0.4,
  glowMaxOpacity: 1.0
};

// ============================================
// TREE STATE
// ============================================

let treeContainer = null;
let treeSvg = null;
let currentFilter = 'all';
let hoveredNode = null;
let selectedNode = null;

// Burn pulse state
let burnPulseInterval = null;
let currentBurnIntensity = 0.5;
let burnStats = null;

// ============================================
// TREE COMPONENT
// ============================================

const TreeComponent = {
  /**
   * Initialize tree component
   * @param {string|Element} container - Container selector or element
   */
  init(container = '.tree-container') {
    treeContainer = typeof container === 'string' ? $(container) : container;
    if (!treeContainer) {
      console.warn('[TreeComponent] Container not found');
      return;
    }

    treeSvg = $(SELECTORS.TREE_SVG, treeContainer);

    // Set up event listeners
    this.bindEvents();

    // Subscribe to state changes
    BuildState.subscribe(EVENTS.PROJECT_SELECT, (data) => {
      this.highlightNode(data.projectId);
    });

    BuildState.subscribe(EVENTS.PROJECT_DESELECT, () => {
      this.clearHighlight();
    });

    // Initialize burn pulse system
    this.initBurnPulse();

    console.log('[TreeComponent] Initialized');
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Tree node clicks (using event delegation)
    delegate(treeContainer, 'click', '.tree-node', (e, node) => {
      const projectId = getData(node, 'project');
      if (projectId && isValidProjectId(projectId)) {
        this.onNodeClick(projectId);
      }
    });

    // Tree heart (Burn Engine center) click
    const treeHeart = $(SELECTORS.TREE_HEART, treeContainer);
    if (treeHeart) {
      on(treeHeart, 'click', () => {
        this.onNodeClick('burn-engine');
      });
    }

    // Legacy realm clicks
    delegate(treeContainer, 'click', '.realm', (e, realm) => {
      const projectId = getData(realm, 'project');
      if (projectId && isValidProjectId(projectId)) {
        this.onNodeClick(projectId);
      }
    });

    // Core realm click
    const coreRealm = $('.core-realm', treeContainer);
    if (coreRealm) {
      on(coreRealm, 'click', () => {
        this.onNodeClick('burn-engine');
      });
    }

    // Hover effects
    delegate(treeContainer, 'mouseenter', '.tree-node, .realm', (e, node) => {
      hoveredNode = getData(node, 'project');
      addClass(node, 'hovered');
      this.showTooltip(node);
    });

    delegate(treeContainer, 'mouseleave', '.tree-node, .realm', (e, node) => {
      hoveredNode = null;
      removeClass(node, 'hovered');
      this.hideTooltip();
    });
  },

  /**
   * Handle node click
   * @param {string} projectId
   */
  async onNodeClick(projectId) {
    if (!isValidProjectId(projectId)) return;

    // Emit tree event
    BuildState.emit(EVENTS.TREE_NODE_CLICK, { projectId });

    // Open project modal (immersive for main projects, doc for others)
    const project = await DataAdapter.getProject(projectId);
    if (project) {
      // Use immersive modal for main projects
      if (project.status === 'live' || project.status === 'building') {
        ModalFactory.openProjectImmersive(projectId);
      } else {
        ModalFactory.openDoc(projectId);
      }
    }
  },

  /**
   * Filter tree by status
   * @param {string} status - 'all', 'live', 'building', 'planned'
   */
  filter(status) {
    currentFilter = status;

    // Get all nodes
    const nodes = $$('.tree-node, .realm', treeContainer);

    nodes.forEach(node => {
      const nodeStatus = getData(node, 'status');
      if (status === 'all' || nodeStatus === status) {
        removeClass(node, 'hidden');
      } else {
        addClass(node, 'hidden');
      }
    });

    // Emit filter event
    BuildState.emit(EVENTS.TREE_FILTER, { status });
  },

  /**
   * Highlight a node
   * @param {string} projectId
   */
  highlightNode(projectId) {
    // Clear previous highlight
    this.clearHighlight();

    // Find and highlight node
    const node = $(`.tree-node[data-project="${projectId}"], .realm[data-project="${projectId}"]`, treeContainer);
    if (node) {
      selectedNode = projectId;
      addClass(node, 'highlighted', 'selected');

      // Highlight connected branches
      this.highlightBranch(projectId);
    }
  },

  /**
   * Clear node highlight
   */
  clearHighlight() {
    if (selectedNode) {
      const node = $(`.tree-node[data-project="${selectedNode}"], .realm[data-project="${selectedNode}"]`, treeContainer);
      if (node) {
        removeClass(node, 'highlighted', 'selected');
      }
      this.clearBranchHighlight();
      selectedNode = null;
    }
  },

  /**
   * Highlight branch connected to a project
   * @param {string} projectId
   */
  highlightBranch(projectId) {
    if (!treeSvg) return;

    // Determine which branch category
    let branchClass = 'branches-canopy';
    if (BRANCH_CATEGORIES.trunk.includes(projectId)) {
      branchClass = 'branches-trunk';
    } else if (BRANCH_CATEGORIES.roots.includes(projectId)) {
      branchClass = 'branches-roots';
    }

    // Highlight the branch path
    const branchGroup = $(`.${branchClass}`, treeSvg);
    if (branchGroup) {
      addClass(branchGroup, 'highlighted');
    }
  },

  /**
   * Clear branch highlight
   */
  clearBranchHighlight() {
    if (!treeSvg) return;
    const highlighted = $$('.highlighted', treeSvg);
    highlighted.forEach(el => removeClass(el, 'highlighted'));
  },

  /**
   * Show tooltip for a node
   * @param {Element} node
   */
  async showTooltip(node) {
    const projectId = getData(node, 'project');
    if (!projectId) return;

    const project = await DataAdapter.getProject(projectId);
    if (!project) return;

    // Check if tooltip exists, create if not
    let tooltip = $('#tree-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'tree-tooltip';
      tooltip.className = 'tree-tooltip';
      document.body.appendChild(tooltip);
    }

    // Update tooltip content
    const statusClass = STATUS[project.status]?.cssClass || '';
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span class="tooltip-icon">${project.icon}</span>
        <span class="tooltip-title">${project.title}</span>
      </div>
      <span class="tooltip-status ${statusClass}">${project.status.toUpperCase()}</span>
      <p class="tooltip-overview">${project.overview.substring(0, 100)}...</p>
    `;

    // Position tooltip
    const rect = node.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.top - tooltipRect.height - 10;

    // Keep within viewport
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top < 10) {
      top = rect.bottom + 10; // Show below if not enough space above
    }

    setStyles(tooltip, {
      left: `${left}px`,
      top: `${top}px`,
      opacity: '1',
      visibility: 'visible'
    });
  },

  /**
   * Hide tooltip
   */
  hideTooltip() {
    const tooltip = $('#tree-tooltip');
    if (tooltip) {
      setStyles(tooltip, {
        opacity: '0',
        visibility: 'hidden'
      });
    }
  },

  /**
   * Get node position
   * @param {string} projectId
   * @returns {Object|null} Position {x, y}
   */
  getNodePosition(projectId) {
    return NODE_POSITIONS[projectId] || null;
  },

  /**
   * Animate to a node (scroll into view)
   * @param {string} projectId
   */
  animateToNode(projectId) {
    const node = $(`.tree-node[data-project="${projectId}"], .realm[data-project="${projectId}"]`, treeContainer);
    if (node) {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  },

  /**
   * Get projects by branch category
   * @param {string} category - 'canopy', 'trunk', 'roots'
   * @returns {string[]} Project IDs
   */
  getProjectsByBranch(category) {
    return BRANCH_CATEGORIES[category] || [];
  },

  /**
   * Get all project nodes
   * @returns {Element[]}
   */
  getAllNodes() {
    return $$('.tree-node, .realm', treeContainer);
  },

  /**
   * Get current filter
   * @returns {string}
   */
  getCurrentFilter() {
    return currentFilter;
  },

  /**
   * Refresh tree display
   */
  async refresh() {
    // Re-fetch projects
    const projects = await DataAdapter.getProjects();

    // Update node statuses if needed
    Object.entries(projects).forEach(([id, project]) => {
      const node = $(`.tree-node[data-project="${id}"], .realm[data-project="${id}"]`, treeContainer);
      if (node) {
        node.dataset.status = project.status;
      }
    });

    // Re-apply current filter
    this.filter(currentFilter);
  },

  // ============================================
  // BURN PULSE SYSTEM
  // ============================================

  /**
   * Initialize burn pulse animation system
   * Fetches burn data and animates the center based on activity
   */
  async initBurnPulse() {
    // Initial fetch
    await this.updateBurnData();

    // Apply initial pulse
    this.applyBurnPulse();

    // Set up periodic updates
    burnPulseInterval = setInterval(() => {
      this.updateBurnData();
    }, BURN_PULSE_CONFIG.updateInterval);

    // Clean up on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseBurnPulse();
      } else {
        this.resumeBurnPulse();
      }
    });

    console.log('[TreeComponent] Burn pulse initialized');
  },

  /**
   * Fetch latest burn data and update intensity
   */
  async updateBurnData() {
    try {
      burnStats = await BurnApiService.getStats();
      currentBurnIntensity = await BurnApiService.getBurnIntensity();

      // Emit event for other components
      BuildState.emit('burn:update', {
        stats: burnStats,
        intensity: currentBurnIntensity
      });

      // Update visual
      this.applyBurnPulse();
    } catch (error) {
      console.warn('[TreeComponent] Burn data fetch failed:', error);
    }
  },

  /**
   * Apply burn pulse animation to the center (nordic-sun)
   */
  applyBurnPulse() {
    const nordicSun = $('.nordic-sun, .heart-layer', treeContainer);
    const sunAura = $('.sun-aura', treeContainer);
    const treeHeart = $('.tree-heart', treeContainer);

    if (!nordicSun && !treeHeart) return;

    // Calculate pulse duration based on intensity (higher = faster pulse)
    const { pulseMinDuration, pulseMaxDuration, glowMinOpacity, glowMaxOpacity } = BURN_PULSE_CONFIG;
    const pulseDuration = pulseMinDuration - ((pulseMinDuration - pulseMaxDuration) * currentBurnIntensity);
    const glowOpacity = glowMinOpacity + ((glowMaxOpacity - glowMinOpacity) * currentBurnIntensity);

    // Apply CSS custom properties for animation
    const pulseTarget = nordicSun || treeHeart;
    pulseTarget.style.setProperty('--burn-pulse-duration', `${pulseDuration}ms`);
    pulseTarget.style.setProperty('--burn-glow-opacity', glowOpacity);
    pulseTarget.style.setProperty('--burn-intensity', currentBurnIntensity);

    // Add pulsing class if not already present
    addClass(pulseTarget, 'burn-pulsing');

    // Update aura if present
    if (sunAura) {
      sunAura.style.setProperty('--burn-glow-opacity', glowOpacity);
    }

    // Update heart glow
    if (treeHeart) {
      const glowSize = 20 + (currentBurnIntensity * 30); // 20-50px glow
      treeHeart.style.setProperty('--heart-glow-size', `${glowSize}px`);
    }
  },

  /**
   * Pause burn pulse (when tab hidden)
   */
  pauseBurnPulse() {
    if (burnPulseInterval) {
      clearInterval(burnPulseInterval);
      burnPulseInterval = null;
    }

    const pulseTarget = $('.nordic-sun, .heart-layer, .tree-heart', treeContainer);
    if (pulseTarget) {
      removeClass(pulseTarget, 'burn-pulsing');
    }
  },

  /**
   * Resume burn pulse (when tab visible)
   */
  resumeBurnPulse() {
    if (!burnPulseInterval) {
      this.updateBurnData();
      burnPulseInterval = setInterval(() => {
        this.updateBurnData();
      }, BURN_PULSE_CONFIG.updateInterval);
    }

    this.applyBurnPulse();
  },

  /**
   * Get current burn stats
   * @returns {Object|null}
   */
  getBurnStats() {
    return burnStats;
  },

  /**
   * Get current burn intensity
   * @returns {number} 0-1
   */
  getBurnIntensity() {
    return currentBurnIntensity;
  }
};

// Export for ES modules
export { TreeComponent };
export default TreeComponent;

// Global export for browser (non-module)
if (typeof window !== 'undefined') {
  window.TreeComponent = TreeComponent;
}
