/**
 * Build V2 - Skill Tree View Component
 * Interactive phi-spiral skill tree visualization
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { SKILLS, SKILL_CATEGORIES, getProjectSkills, getSkillPrerequisites } from '../data/skills-data.js';
import { PHI, GOLDEN_ANGLE, calculateFermatSpiral, phiDelays } from '../utils/phi.js';
import { $, $$, addClass, removeClass, on, setStyles } from '../utils/dom.js';

// ============================================
// SKILL TREE CONFIGURATION
// ============================================

const SKILL_TREE_CONFIG = {
  // Layout
  layout: {
    centerX: 200,
    centerY: 200,
    baseRadius: 30,
    scale: 12,
    nodeSize: 24
  },
  // Animation
  animation: {
    enterDuration: 800,
    stagger: 50,
    hoverScale: 1.2
  },
  // Visual
  visual: {
    lineWidth: 2,
    lineOpacity: 0.3,
    glowIntensity: 0.6
  }
};

// ============================================
// SKILL TREE VIEW COMPONENT
// ============================================

const SkillTreeView = {
  /**
   * Container element
   */
  container: null,

  /**
   * SVG element
   */
  svg: null,

  /**
   * Current project ID
   */
  currentProject: null,

  /**
   * Rendered nodes
   */
  nodes: new Map(),

  /**
   * Initialize skill tree view
   * @param {string|Element} containerSelector
   */
  init(containerSelector) {
    this.container = typeof containerSelector === 'string'
      ? $(containerSelector)
      : containerSelector;

    if (!this.container) {
      console.warn('[SkillTreeView] Container not found');
      return;
    }

    // Create SVG
    this.createSVG();

    // Bind events
    this.bindEvents();

    console.log('[SkillTreeView] Initialized');
  },

  /**
   * Create SVG element
   */
  createSVG() {
    const { centerX, centerY } = SKILL_TREE_CONFIG.layout;

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${centerX * 2} ${centerY * 2}`);
    this.svg.setAttribute('class', 'skill-tree-svg');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    // Add defs for gradients and filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="skill-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="skill-shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
      </filter>
    `;
    this.svg.appendChild(defs);

    // Create layer groups
    this.linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.linesGroup.setAttribute('class', 'skill-lines');
    this.svg.appendChild(this.linesGroup);

    this.nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.nodesGroup.setAttribute('class', 'skill-nodes');
    this.svg.appendChild(this.nodesGroup);

    this.container.appendChild(this.svg);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Listen for project selection
    BuildState.subscribe('project:select', (data) => {
      if (data.projectId) {
        this.showForProject(data.projectId);
      }
    });

    // Listen for skill tree open
    BuildState.subscribe('skillTree:open', (data) => {
      if (data.projectId) {
        this.showForProject(data.projectId);
      }
    });
  },

  /**
   * Show skill tree for a project
   * @param {string} projectId
   */
  showForProject(projectId) {
    this.currentProject = projectId;
    this.clear();

    const projectSkills = getProjectSkills(projectId);
    if (!projectSkills.primary.length && !projectSkills.secondary.length) {
      this.showEmptyState();
      return;
    }

    // Combine all skills
    const allSkills = [
      ...projectSkills.primary,
      ...projectSkills.secondary,
      ...projectSkills.teaches
    ];

    // Remove duplicates
    const uniqueSkills = [...new Map(allSkills.map(s => [s.id, s])).values()];

    // Calculate positions
    this.renderTree(uniqueSkills, projectSkills);
  },

  /**
   * Render the skill tree
   * @param {Array} skills
   * @param {Object} projectSkills
   */
  renderTree(skills, projectSkills) {
    const { layout } = SKILL_TREE_CONFIG;

    // Calculate positions using Fermat spiral
    const positions = calculateFermatSpiral(
      skills,
      layout.centerX,
      layout.centerY,
      layout.scale
    );

    // Draw connections first (prerequisites)
    this.drawConnections(positions, skills);

    // Render nodes with stagger animation
    const delays = phiDelays(skills.length, SKILL_TREE_CONFIG.animation.stagger);

    positions.forEach((pos, index) => {
      const skill = pos.item;
      const isPrimary = projectSkills.primary.some(s => s.id === skill.id);
      const isTeaches = projectSkills.teaches.some(s => s.id === skill.id);

      setTimeout(() => {
        this.createSkillNode(skill, pos.x, pos.y, {
          isPrimary,
          isTeaches,
          index
        });
      }, delays[index]);
    });
  },

  /**
   * Draw prerequisite connections
   * @param {Array} positions
   * @param {Array} skills
   */
  drawConnections(positions, skills) {
    const { visual } = SKILL_TREE_CONFIG;

    // Create position map
    const posMap = new Map();
    positions.forEach(pos => {
      posMap.set(pos.item.id, { x: pos.x, y: pos.y });
    });

    // Draw lines for prerequisites
    skills.forEach(skill => {
      if (!skill.prerequisites) return;

      const targetPos = posMap.get(skill.id);
      if (!targetPos) return;

      skill.prerequisites.forEach(prereqId => {
        const sourcePos = posMap.get(prereqId);
        if (!sourcePos) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const category = SKILL_CATEGORIES[skill.category];
        const color = category?.color || '#666';

        // Curved path
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2 - 20;

        const d = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetPos.x} ${targetPos.y}`;

        line.setAttribute('d', d);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', visual.lineWidth);
        line.setAttribute('stroke-opacity', visual.lineOpacity);
        line.setAttribute('fill', 'none');
        line.setAttribute('class', 'skill-line');

        // Animate
        const length = line.getTotalLength?.() || 100;
        line.style.strokeDasharray = length;
        line.style.strokeDashoffset = length;
        line.style.animation = `skill-line-draw 0.5s ease forwards`;

        this.linesGroup.appendChild(line);
      });
    });
  },

  /**
   * Create a skill node
   * @param {Object} skill
   * @param {number} x
   * @param {number} y
   * @param {Object} options
   */
  createSkillNode(skill, x, y, options = {}) {
    const { layout } = SKILL_TREE_CONFIG;
    const category = SKILL_CATEGORIES[skill.category];
    const color = category?.color || '#666';

    // Create group
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `skill-node ${options.isPrimary ? 'primary' : ''} ${options.isTeaches ? 'teaches' : ''}`);
    group.setAttribute('data-skill-id', skill.id);
    group.setAttribute('transform', `translate(${x}, ${y})`);
    group.style.opacity = '0';
    group.style.transform = `translate(${x}px, ${y}px) scale(0)`;

    // Background circle
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.setAttribute('r', layout.nodeSize / 2 + 4);
    bgCircle.setAttribute('fill', color);
    bgCircle.setAttribute('fill-opacity', '0.2');
    if (options.isPrimary) {
      bgCircle.setAttribute('filter', 'url(#skill-glow)');
    }
    group.appendChild(bgCircle);

    // Main circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', layout.nodeSize / 2);
    circle.setAttribute('fill', '#1a1a2e');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', options.isPrimary ? 3 : 2);
    group.appendChild(circle);

    // Level indicator
    const levelBadge = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    levelBadge.setAttribute('cx', layout.nodeSize / 2 - 2);
    levelBadge.setAttribute('cy', -layout.nodeSize / 2 + 2);
    levelBadge.setAttribute('r', 6);
    levelBadge.setAttribute('fill', color);
    group.appendChild(levelBadge);

    const levelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    levelText.setAttribute('x', layout.nodeSize / 2 - 2);
    levelText.setAttribute('y', -layout.nodeSize / 2 + 5);
    levelText.setAttribute('text-anchor', 'middle');
    levelText.setAttribute('font-size', '8');
    levelText.setAttribute('fill', '#fff');
    levelText.textContent = skill.level;
    group.appendChild(levelText);

    // Icon (category icon)
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.setAttribute('font-size', '14');
    icon.setAttribute('fill', color);
    icon.textContent = category?.icon || '\u2726';
    group.appendChild(icon);

    // Label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('y', layout.nodeSize / 2 + 14);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '9');
    label.setAttribute('fill', '#888');
    label.setAttribute('class', 'skill-label');
    label.textContent = skill.name.length > 12 ? skill.name.substring(0, 10) + '...' : skill.name;
    group.appendChild(label);

    // Teaches indicator
    if (options.isTeaches) {
      const star = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      star.setAttribute('x', -layout.nodeSize / 2);
      star.setAttribute('y', -layout.nodeSize / 2);
      star.setAttribute('font-size', '10');
      star.setAttribute('fill', '#fbbf24');
      star.textContent = '\u2605'; // Star
      group.appendChild(star);
    }

    // Add hover events
    group.addEventListener('mouseenter', () => this.onNodeHover(skill, group));
    group.addEventListener('mouseleave', () => this.onNodeUnhover(skill, group));
    group.addEventListener('click', () => this.onNodeClick(skill));

    this.nodesGroup.appendChild(group);
    this.nodes.set(skill.id, group);

    // Animate in
    requestAnimationFrame(() => {
      group.style.transition = `opacity 0.3s, transform 0.3s`;
      group.style.opacity = '1';
      group.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    });
  },

  /**
   * Handle node hover
   * @param {Object} skill
   * @param {SVGElement} group
   */
  onNodeHover(skill, group) {
    const { hoverScale } = SKILL_TREE_CONFIG.animation;

    // Scale up
    const transform = group.getAttribute('transform');
    group.setAttribute('transform', transform.replace('scale(1)', `scale(${hoverScale})`));

    // Show tooltip
    BuildState.emit('skillTree:nodeHover', {
      skill,
      element: group
    });
  },

  /**
   * Handle node unhover
   * @param {Object} skill
   * @param {SVGElement} group
   */
  onNodeUnhover(skill, group) {
    // Scale back
    const transform = group.getAttribute('transform');
    group.setAttribute('transform', transform.replace(/scale\([^)]+\)/, 'scale(1)'));

    BuildState.emit('skillTree:nodeUnhover', {});
  },

  /**
   * Handle node click
   * @param {Object} skill
   */
  onNodeClick(skill) {
    BuildState.emit('skillTree:nodeClick', {
      skill,
      prerequisites: getSkillPrerequisites(skill.id)
    });
  },

  /**
   * Show empty state
   */
  showEmptyState() {
    const { centerX, centerY } = SKILL_TREE_CONFIG.layout;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', centerX);
    text.setAttribute('y', centerY);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#666');
    text.setAttribute('font-size', '14');
    text.textContent = 'No skills data available';

    this.nodesGroup.appendChild(text);
  },

  /**
   * Clear the tree
   */
  clear() {
    this.linesGroup.innerHTML = '';
    this.nodesGroup.innerHTML = '';
    this.nodes.clear();
  },

  /**
   * Get container
   * @returns {Element}
   */
  getContainer() {
    return this.container;
  },

  /**
   * Dispose
   */
  dispose() {
    this.clear();
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.svg = null;
    this.container = null;
  }
};

// ============================================
// EXPORTS
// ============================================

export { SkillTreeView };
export default SkillTreeView;

// Global export
if (typeof window !== 'undefined') {
  window.SkillTreeView = SkillTreeView;
}
